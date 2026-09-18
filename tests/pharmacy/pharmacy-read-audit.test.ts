import { db } from "@/lib/db";
import { listPharmacyPrescriptions } from "@/lib/pharmacy/registry";
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

const PHARMACY_PRESCRIPTION = {
  id: "prescription-1",
  patientId: "patient-1",
  visitId: "visit-1",
  status: "SENT_TO_PHARMACY",
  createdAt: new Date("2026-09-17T08:00:00Z"),
  notes: null,
  patient: { patientNo: "P-20260917-000001", firstName: "Jane", lastName: "Doe" },
  items: [],
};

describe("listPharmacyPrescriptions read-access audit logging", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("records a PHARMACY_QUEUE_VIEWED audit event with the result count", async () => {
    mockDb.prescription.findMany.mockResolvedValue([PHARMACY_PRESCRIPTION, PHARMACY_PRESCRIPTION]);

    const result = await listPharmacyPrescriptions(CONTEXT);

    expect(result).toHaveLength(2);
    expect(mockRecordAuditEvent).toHaveBeenCalledWith(
      CONTEXT,
      expect.objectContaining({ action: "PHARMACY_QUEUE_VIEWED", entityType: "Prescription", metadata: { resultCount: 2 } }),
    );
  });

  it("still records the audit event when the queue is empty", async () => {
    mockDb.prescription.findMany.mockResolvedValue([]);

    await listPharmacyPrescriptions(CONTEXT);

    expect(mockRecordAuditEvent).toHaveBeenCalledWith(
      CONTEXT,
      expect.objectContaining({ metadata: { resultCount: 0 } }),
    );
  });
});
