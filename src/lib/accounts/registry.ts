import type { AuthContext } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { InvoiceStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { recordAuditEvent } from "@/lib/audit";

export type AccountInvoice = {
  id: string; invoiceNo: string; patientId: string; patientNo: string; patientName: string; visitId: string | null;
  status: InvoiceStatus; total: number; amountPaid: number; balance: number; issuedAt: Date | null;
  items: Array<{ id: string; description: string; quantity: number; unitPrice: number; total: number }>;
};
export type BillableVisit = { id: string; patientId: string; patientNo: string; patientName: string; openedAt: Date; status: string };
function toNumber(value: unknown) { return Number(value ?? 0); }
function makeInvoiceNo() { return `INV-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}-${randomUUID().slice(0, 6).toUpperCase()}`; }
function makeReceiptNo() { return `RCT-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}-${randomUUID().slice(0, 6).toUpperCase()}`; }

export async function listInvoices(context: AuthContext): Promise<AccountInvoice[]> {
  const invoices = await db.invoice.findMany({ where: { clinicId: context.clinicId, status: { not: InvoiceStatus.VOID } }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, invoiceNo: true, patientId: true, visitId: true, status: true, total: true, amountPaid: true, issuedAt: true, patient: { select: { patientNo: true, firstName: true, lastName: true } }, items: { select: { id: true, description: true, quantity: true, unitPrice: true, total: true } } } });
  return invoices.map((invoice) => ({ id: invoice.id, invoiceNo: invoice.invoiceNo, patientId: invoice.patientId, patientNo: invoice.patient.patientNo, patientName: `${invoice.patient.firstName} ${invoice.patient.lastName}`, visitId: invoice.visitId, status: invoice.status, total: toNumber(invoice.total), amountPaid: toNumber(invoice.amountPaid), balance: Math.max(0, toNumber(invoice.total) - toNumber(invoice.amountPaid)), issuedAt: invoice.issuedAt, items: invoice.items.map((item) => ({ id: item.id, description: item.description, quantity: item.quantity, unitPrice: toNumber(item.unitPrice), total: toNumber(item.total) })) }));
}

export async function listBillableVisits(context: AuthContext): Promise<BillableVisit[]> {
  const visits = await db.visit.findMany({ where: { clinicId: context.clinicId, status: { in: ["OPEN", "IN_PROGRESS", "COMPLETED"] }, invoices: { none: { status: { not: InvoiceStatus.VOID } } } }, orderBy: { openedAt: "desc" }, take: 30, select: { id: true, patientId: true, openedAt: true, status: true, patient: { select: { patientNo: true, firstName: true, lastName: true } } } });
  return visits.map((visit) => ({ id: visit.id, patientId: visit.patientId, patientNo: visit.patient.patientNo, patientName: `${visit.patient.firstName} ${visit.patient.lastName}`, openedAt: visit.openedAt, status: visit.status }));
}

export async function createInvoice(context: AuthContext, input: { visitId: string; description: string; quantity: number; unitPrice: number }) {
  const description = input.description.trim();
  if (!description) throw new Error("INVOICE_DESCRIPTION_REQUIRED");
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error("INVALID_INVOICE_QUANTITY");
  if (!Number.isFinite(input.unitPrice) || input.unitPrice <= 0) throw new Error("INVALID_INVOICE_PRICE");
  return db.$transaction(async (tx) => {
    const visit = await tx.visit.findFirst({ where: { id: input.visitId, clinicId: context.clinicId }, select: { id: true, patientId: true } });
    if (!visit) throw new Error("VISIT_NOT_FOUND");
    const existing = await tx.invoice.findFirst({ where: { clinicId: context.clinicId, visitId: visit.id, status: { not: InvoiceStatus.VOID } }, select: { id: true } });
    if (existing) throw new Error("VISIT_ALREADY_INVOICED");
    const total = input.quantity * input.unitPrice;
    const invoice = await tx.invoice.create({ data: { clinicId: context.clinicId, patientId: visit.patientId, visitId: visit.id, invoiceNo: makeInvoiceNo(), status: InvoiceStatus.ISSUED, total, issuedAt: new Date(), items: { create: { description, quantity: input.quantity, unitPrice: input.unitPrice, total } } }, select: { id: true, invoiceNo: true, total: true } });
    await recordAuditEvent(context, { action: "INVOICE_CREATED", entityType: "Invoice", entityId: invoice.id, metadata: { visitId: visit.id, total: invoice.total.toString() } }, tx);
    return invoice;
  });
}

export async function recordPayment(context: AuthContext, input: { invoiceId: string; amount: number; method: PaymentMethod; externalRef?: string | null }) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("INVALID_PAYMENT_AMOUNT");
  if (input.method === PaymentMethod.MPESA && !input.externalRef?.trim()) throw new Error("MPESA_REFERENCE_REQUIRED");
  return db.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id: input.invoiceId, clinicId: context.clinicId, status: { not: InvoiceStatus.VOID } }, select: { id: true, patientId: true, total: true, amountPaid: true } });
    if (!invoice) throw new Error("INVOICE_NOT_FOUND");
    const balance = Number(invoice.total) - Number(invoice.amountPaid);
    if (balance <= 0) throw new Error("INVOICE_ALREADY_PAID");
    if (input.amount > balance + 0.0001) throw new Error("PAYMENT_EXCEEDS_BALANCE");
    const externalRef = input.externalRef?.trim() || null;
    if (externalRef) { const duplicate = await tx.payment.findFirst({ where: { clinicId: context.clinicId, externalRef }, select: { id: true } }); if (duplicate) throw new Error("PAYMENT_REFERENCE_ALREADY_USED"); }
    const payment = await tx.payment.create({ data: { clinicId: context.clinicId, patientId: invoice.patientId, invoiceId: invoice.id, amount: input.amount, method: input.method, status: PaymentStatus.VERIFIED, externalRef, receiptNo: makeReceiptNo(), idempotencyKey: randomUUID(), receivedAt: new Date() }, select: { id: true, receiptNo: true, amount: true } });
    const newAmountPaid = Number(invoice.amountPaid) + input.amount;
    const nextStatus = newAmountPaid >= Number(invoice.total) - 0.0001 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
    await tx.invoice.update({ where: { id: invoice.id }, data: { amountPaid: newAmountPaid, status: nextStatus } });
    await recordAuditEvent(context, { action: "PAYMENT_VERIFIED", entityType: "Payment", entityId: payment.id, metadata: { invoiceId: invoice.id, method: input.method, receiptNo: payment.receiptNo } }, tx);
    return payment;
  }, { isolationLevel: "Serializable" });
}

export async function getAccountsSummary(context: AuthContext) {
  const day = getKenyaDayBounds();
  const [payments, mpesa, outstanding, invoices] = await Promise.all([
    db.payment.aggregate({ where: { clinicId: context.clinicId, status: PaymentStatus.VERIFIED, receivedAt: { gte: day.start, lt: day.end } }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { clinicId: context.clinicId, status: PaymentStatus.VERIFIED, method: PaymentMethod.MPESA, receivedAt: { gte: day.start, lt: day.end } }, _sum: { amount: true }, _count: { _all: true } }),
    db.invoice.findMany({ where: { clinicId: context.clinicId, status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] } }, select: { total: true, amountPaid: true } }),
    db.invoice.count({ where: { clinicId: context.clinicId, status: { not: InvoiceStatus.VOID } } }),
  ]);
  return { collectedToday: toNumber(payments._sum.amount), mpesaToday: toNumber(mpesa._sum.amount), mpesaPaymentCountToday: mpesa._count._all, outstanding: outstanding.reduce((sum, invoice) => sum + Math.max(0, toNumber(invoice.total) - toNumber(invoice.amountPaid)), 0), invoiceCount: invoices };
}

function getKenyaDayBounds() {
  const now = new Date();
  const kenyaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const [year, month, day] = kenyaDate.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, -3));
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}
