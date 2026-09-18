import { db } from "@/lib/db";
import { listInvoices, listBillableVisits } from "@/lib/accounts/registry";
import { recordAuditEvent } from "@/lib/audit";

jest.mock("@/lib/db", () => ({
  db: { invoice: { findMany: jest.fn() }, visit: { findMany: jest.fn() } },
}));
jest.mock("@/lib/audit", () => ({
  recordAuditEvent: jest.fn(async () => undefined),
}));

const mockDb = db as typeof db & {
  invoice: { findMany: jest.Mock };
  visit: { findMany: jest.Mock };
};
const mockRecordAuditEvent = recordAuditEvent as jest.Mock;

const CONTEXT = { clinicId: "clinic-1", userId: "user-1" } as never;

const INVOICE = {
  id: "invoice-1",
  invoiceNo: "INV-1",
  patientId: "patient-1",
  visitId: "visit-1",
  status: "ISSUED",
  total: 1000,
  amountPaid: 0,
  issuedAt: new Date("2026-09-17T08:00:00Z"),
  patient: { patientNo: "P-20260917-000001", firstName: "Jane", lastName: "Doe" },
  items: [],
};

const BILLABLE_VISIT = {
  id: "visit-1",
  patientId: "patient-1",
  openedAt: new Date("2026-09-17T08:00:00Z"),
  status: "COMPLETED",
  patient: { patientNo: "P-20260917-000001", firstName: "Jane", lastName: "Doe" },
};

describe("listInvoices read-access audit logging", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("records an INVOICES_VIEWED audit event with the result count", async () => {
    mockDb.invoice.findMany.mockResolvedValue([INVOICE]);

    const result = await listInvoices(CONTEXT);

    expect(result).toHaveLength(1);
    expect(mockRecordAuditEvent).toHaveBeenCalledWith(
      CONTEXT,
      expect.objectContaining({ action: "INVOICES_VIEWED", entityType: "Invoice", metadata: { resultCount: 1 } }),
    );
  });
});

describe("listBillableVisits read-access audit logging", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("records a BILLABLE_VISITS_VIEWED audit event with the result count", async () => {
    mockDb.visit.findMany.mockResolvedValue([BILLABLE_VISIT]);

    const result = await listBillableVisits(CONTEXT);

    expect(result).toHaveLength(1);
    expect(mockRecordAuditEvent).toHaveBeenCalledWith(
      CONTEXT,
      expect.objectContaining({ action: "BILLABLE_VISITS_VIEWED", entityType: "Visit", metadata: { resultCount: 1 } }),
    );
  });
});
