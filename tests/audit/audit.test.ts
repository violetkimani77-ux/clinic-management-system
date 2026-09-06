import type { AuthContext } from "@/lib/auth/authorization";
import { recordAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";

jest.mock("@/lib/db", () => ({
  db: {
    auditLog: {
      create: jest.fn(),
    },
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
    jest.clearAllMocks();
  });

  it("records the authenticated clinic and user for a health-data access event", async () => {
    await recordAuditEvent(context, {
      action: "PATIENT_VIEWED",
      entityType: "Patient",
      entityId: "patient-1",
    });

    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: {
        clinicId: "clinic-1",
        userId: "user-1",
        action: "PATIENT_VIEWED",
        entityType: "Patient",
        entityId: "patient-1",
        metadata: undefined,
      },
    });
  });

  it("does not require patient-identifying search text in the audit metadata", async () => {
    await recordAuditEvent(context, {
      action: "PATIENT_SEARCHED",
      entityType: "Patient",
      metadata: { resultCount: 4 },
    });

    const call = jest.mocked(db.auditLog.create).mock.calls[0][0];
    expect(call.data.metadata).toEqual({ resultCount: 4 });
    expect(JSON.stringify(call.data.metadata)).not.toContain("patient name");
  });
});
