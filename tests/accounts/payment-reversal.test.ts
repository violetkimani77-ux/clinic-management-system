import { db } from "@/lib/db";
import { reversePayment } from "@/lib/accounts/registry";
import { recordAuditEvent } from "@/lib/audit";
import { InvoiceStatus } from "@prisma/client";

jest.mock("@/lib/db", () => ({
  db: { $transaction: jest.fn() },
}));
jest.mock("@/lib/audit", () => ({
  recordAuditEvent: jest.fn(async () => undefined),
}));

const mockDb = db as typeof db & { $transaction: jest.Mock };
const mockRecordAuditEvent = recordAuditEvent as jest.Mock;

const CONTEXT = { clinicId: "clinic-1", userId: "user-1" } as never;

const PAYMENT = { id: "payment-1", amount: 500, invoiceId: "invoice-1" };
const INVOICE = { id: "invoice-1", total: 1000, amountPaid: 500 };

function makeTx(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    payment: { findFirst: jest.fn(async () => PAYMENT) },
    paymentReversal: {
      findFirst: jest.fn(async () => null),
      create: jest.fn(async () => ({ id: "reversal-1" })),
    },
    invoice: {
      findFirst: jest.fn(async () => INVOICE),
      update: jest.fn(async () => undefined),
    },
    ...overrides,
  };
}

describe("reversePayment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects an empty reason before touching the database", async () => {
    await expect(reversePayment(CONTEXT, { paymentId: "payment-1", reason: "   " })).rejects.toThrow(
      "REVERSAL_REASON_REQUIRED",
    );
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  it("throws PAYMENT_NOT_FOUND when the payment doesn't exist or belongs to another clinic", async () => {
    const tx = makeTx({ payment: { findFirst: jest.fn(async () => null) } });
    mockDb.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(tx));

    await expect(
      reversePayment(CONTEXT, { paymentId: "payment-1", reason: "duplicate entry" }),
    ).rejects.toThrow("PAYMENT_NOT_FOUND");
  });

  it("throws PAYMENT_ALREADY_REVERSED if a reversal already exists", async () => {
    const tx = makeTx({
      paymentReversal: {
        findFirst: jest.fn(async () => ({ id: "existing-reversal" })),
        create: jest.fn(),
      },
    });
    mockDb.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(tx));

    await expect(
      reversePayment(CONTEXT, { paymentId: "payment-1", reason: "duplicate entry" }),
    ).rejects.toThrow("PAYMENT_ALREADY_REVERSED");
    expect(tx.paymentReversal.create).not.toHaveBeenCalled();
  });

  it("creates the reversal and decrements the invoice to PARTIALLY_PAID when balance remains", async () => {
    const tx = makeTx();
    mockDb.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(tx));

    const result = await reversePayment(CONTEXT, { paymentId: "payment-1", reason: "wrong amount entered" });

    expect(result).toEqual({ id: "reversal-1" });
    expect(tx.paymentReversal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentId: "payment-1",
          clinicId: "clinic-1",
          amount: PAYMENT.amount,
          reversedByUserId: "user-1",
        }),
      }),
    );
    expect(tx.invoice.update).toHaveBeenCalledWith({
      where: { id: "invoice-1" },
      data: { amountPaid: 0, status: InvoiceStatus.ISSUED },
    });
    expect(mockRecordAuditEvent).toHaveBeenCalledWith(
      CONTEXT,
      expect.objectContaining({ action: "PAYMENT_REVERSED", entityId: "payment-1" }),
      tx,
    );
  });

  it("sets invoice status back to PARTIALLY_PAID when some balance remains after reversal", async () => {
    const tx = makeTx({
      payment: { findFirst: jest.fn(async () => ({ id: "payment-2", amount: 200, invoiceId: "invoice-1" })) },
      invoice: {
        findFirst: jest.fn(async () => ({ id: "invoice-1", total: 1000, amountPaid: 500 })),
        update: jest.fn(async () => undefined),
      },
    });
    mockDb.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(tx));

    await reversePayment(CONTEXT, { paymentId: "payment-2", reason: "partial correction" });

    expect(tx.invoice.update).toHaveBeenCalledWith({
      where: { id: "invoice-1" },
      data: { amountPaid: 300, status: InvoiceStatus.PARTIALLY_PAID },
    });
  });

  it("skips the invoice update entirely when the payment has no linked invoice", async () => {
    const tx = makeTx({ payment: { findFirst: jest.fn(async () => ({ id: "payment-3", amount: 100, invoiceId: null })) } });
    mockDb.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(tx));

    await reversePayment(CONTEXT, { paymentId: "payment-3", reason: "no invoice" });

    expect(tx.invoice.findFirst).not.toHaveBeenCalled();
    expect(tx.invoice.update).not.toHaveBeenCalled();
  });
});
