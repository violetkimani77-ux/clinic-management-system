import type { AuthContext } from "@/lib/auth/authorization";
import { recordAuditEvent } from "@/lib/audit";

type AuditCreateData = {
  clinicId: string;
  userId: string | null;
  sequence: number;
  previousHash: string | null;
  entryHash: string;
  metadata?: unknown;
};

const auditRows: Array<{ sequence: number; entryHash: string }> = [];

const tx = {
  auditSequence: {
    upsert: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    findUnique: jest.fn(async ({ where }: { where: { clinicId_sequence: { sequence: number } } }) =>
      auditRows.find((row) => row.sequence === where.clinicId_sequence.sequence) ?? null,
    ),
    create: jest.fn(async ({ data }: { data: AuditCreateData }) => {
      auditRows.push({ sequence: data.sequence, entryHash: data.entryHash });
      return data;
    }),
  },
  $queryRaw: jest.fn(async () => [{ currentSequence: auditRows.length }]),
};

jest.mock("@/lib/db", () => ({
  db: {
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  },
}));

const context: AuthContext = {
  userId: "user-1",
  userName: "Test User",
  clinicId: "clinic-1",
  roleCode: "ADMIN",
  permissions: new Set(),
};

describe("audit events", () => {
  beforeEach(() => {
    auditRows.length = 0;
    jest.clearAllMocks();
  });

  it("records an authenticated event with a sequence and SHA-256 entry hash", async () => {
    await recordAuditEvent(context, {
      action: "PATIENT_VIEWED",
      entityType: "Patient",
      entityId: "patient-1",
    });

    const call = jest.mocked(tx.auditLog.create).mock.calls[0][0];
    expect(call.data.clinicId).toBe("clinic-1");
    expect(call.data.userId).toBe("user-1");
    expect(call.data.sequence).toBe(1);
    expect(call.data.previousHash).toBeNull();
    expect(call.data.entryHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("chains a second event to the first event hash", async () => {
    await recordAuditEvent(context, {
      action: "PATIENT_VIEWED",
      entityType: "Patient",
      entityId: "patient-1",
    });
    await recordAuditEvent(context, {
      action: "PATIENT_SEARCHED",
      entityType: "Patient",
      metadata: { resultCount: 4 },
    });

    const calls = jest.mocked(tx.auditLog.create).mock.calls;
    expect(calls[0][0].data.sequence).toBe(1);
    expect(calls[1][0].data.sequence).toBe(2);
    expect(calls[1][0].data.previousHash).toBe(calls[0][0].data.entryHash);
    expect(JSON.stringify(calls[1][0].data.metadata)).not.toContain("patient name");
  });
});
