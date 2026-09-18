import { db } from "@/lib/db";
import { getVisitPrescriptions } from "@/lib/prescriptions/registry";
import { recordAuditEvent } from "@/lib/audit";

jest.mock("@/lib/db", () => ({
  db: { prescription: { findMany: jest.fn() } },
}));
jest.mock("@/lib/audit", () => ({
  recordAuditEvent: jest.fn(async () => undefined),
}));

const mockDb = db as typeof db & { prescription: { findMany: jest.Mock } };
const mockRecordAuditEvent = recordAuditEvent as jest.Mock;

const CONTEXT = { clinicId: "clinic-1", userId: "user-1" } as never;

const PRESCRIPTION = {
  id: "prescription-1",
  status: "CREATED",
  notes: null,
  createdAt: new Date("2026-09-17T08:00:00Z"),
  items: [],
};

describe("getVisitPrescriptions read-access audit logging", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("records a PRESCRIPTIONS_VIEWED audit event with the visit id and result count", async () => {
    mockDb.prescription.findMany.mockResolvedValue([PRESCRIPTION]);

    const result = await getVisitPrescriptions(CONTEXT, "visit-1");

    expect(result).toHaveLength(1);
    expect(mockRecordAuditEvent).toHaveBeenCalledWith(
      CONTEXT,
      expect.objectContaining({
        action: "PRESCRIPTIONS_VIEWED",
        entityType: "Prescription",
        metadata: { visitId: "visit-1", resultCount: 1 },
      }),
    );
  });

  it("still records the audit event when there are no prescriptions for the visit", async () => {
    mockDb.prescription.findMany.mockResolvedValue([]);

    await getVisitPrescriptions(CONTEXT, "visit-2");

    expect(mockRecordAuditEvent).toHaveBeenCalledWith(
      CONTEXT,
      expect.objectContaining({ metadata: { visitId: "visit-2", resultCount: 0 } }),
    );
  });
});
