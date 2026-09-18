import { db } from "@/lib/db";
import { getVisit, listVisits } from "@/lib/visits/registry";
import { recordAuditEvent } from "@/lib/audit";

jest.mock("@/lib/db", () => ({
  db: { visit: { findFirst: jest.fn(), findMany: jest.fn() } },
}));
jest.mock("@/lib/audit", () => ({
  recordAuditEvent: jest.fn(async () => undefined),
}));

const mockDb = db as typeof db & {
  visit: { findFirst: jest.Mock; findMany: jest.Mock };
};
const mockRecordAuditEvent = recordAuditEvent as jest.Mock;

const CONTEXT = { clinicId: "clinic-1", userId: "user-1" } as never;

const VISIT = {
  id: "visit-1",
  patientId: "patient-1",
  status: "OPEN",
  openedAt: new Date("2026-09-17T08:00:00Z"),
  closedAt: null,
  notes: "clinical notes",
  createdAt: new Date("2026-09-17T08:00:00Z"),
  updatedAt: new Date("2026-09-17T08:00:00Z"),
  patient: { patientNo: "P-20260917-000001", firstName: "Jane", lastName: "Doe" },
};

describe("getVisit read-access audit logging", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("records a VISIT_VIEWED audit event when the visit is found", async () => {
    mockDb.visit.findFirst.mockResolvedValue(VISIT);

    const result = await getVisit(CONTEXT, "visit-1");

    expect(result?.id).toBe("visit-1");
    expect(mockRecordAuditEvent).toHaveBeenCalledWith(
      CONTEXT,
      expect.objectContaining({ action: "VISIT_VIEWED", entityType: "Visit", entityId: "visit-1" }),
    );
  });

  it("does not record an audit event when the visit is not found", async () => {
    mockDb.visit.findFirst.mockResolvedValue(null);

    const result = await getVisit(CONTEXT, "missing-visit");

    expect(result).toBeNull();
    expect(mockRecordAuditEvent).not.toHaveBeenCalled();
  });
});

describe("listVisits read-access audit logging", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("records a VISITS_LISTED audit event with the result count", async () => {
    mockDb.visit.findMany.mockResolvedValue([VISIT, VISIT]);

    const result = await listVisits(CONTEXT);

    expect(result).toHaveLength(2);
    expect(mockRecordAuditEvent).toHaveBeenCalledWith(
      CONTEXT,
      expect.objectContaining({ action: "VISITS_LISTED", entityType: "Visit", metadata: { resultCount: 2, patientId: null } }),
    );
  });

  it("includes the filtering patientId in metadata when one was requested", async () => {
    mockDb.visit.findMany.mockResolvedValue([VISIT]);

    await listVisits(CONTEXT, { patientId: "patient-1" });

    expect(mockRecordAuditEvent).toHaveBeenCalledWith(
      CONTEXT,
      expect.objectContaining({ metadata: { resultCount: 1, patientId: "patient-1" } }),
    );
  });
});
