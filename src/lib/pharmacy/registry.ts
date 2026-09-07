import type { AuthContext } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { InvoiceStatus, PrescriptionStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { recordAuditEvent } from "@/lib/audit";

export type PharmacyPrescriptionItem = { id: string; medicineId: string; medicineName: string; strength: string | null; form: string | null; quantity: number; dosage: string | null; frequency: string | null; duration: string | null; instructions: string | null; };
export type PharmacyPrescription = { id: string; patientId: string; patientNo: string; patientName: string; visitId: string | null; status: PrescriptionStatus; createdAt: Date; notes: string | null; items: PharmacyPrescriptionItem[]; };
export type PharmacyOverview = { prescriptions: PharmacyPrescription[]; dispensedTodayCount: number; lowStockMedicines: Array<{ id: string; name: string; currentQuantity: number; reorderLevel: number }>; expiredBatchCount: number; expiringSoonBatchCount: number; };

export async function listPharmacyPrescriptions(context: AuthContext): Promise<PharmacyPrescription[]> {
  const prescriptions = await db.prescription.findMany({ where: { clinicId: context.clinicId, status: { in: [PrescriptionStatus.SENT_TO_PHARMACY, PrescriptionStatus.PROCESSING, PrescriptionStatus.PARTIALLY_DISPENSED] } }, orderBy: { createdAt: "asc" }, take: 100, select: { id: true, patientId: true, visitId: true, status: true, createdAt: true, notes: true, patient: { select: { patientNo: true, firstName: true, lastName: true } }, items: { orderBy: { createdAt: "asc" }, select: { id: true, medicineId: true, quantity: true, dosage: true, frequency: true, duration: true, instructions: true, medicine: { select: { name: true, strength: true, form: true } } } } } });
  return prescriptions.map((p) => ({ id: p.id, patientId: p.patientId, patientNo: p.patient.patientNo, patientName: `${p.patient.firstName} ${p.patient.lastName}`, visitId: p.visitId, status: p.status, createdAt: p.createdAt, notes: p.notes, items: p.items.map((i) => ({ id: i.id, medicineId: i.medicineId, medicineName: i.medicine.name, strength: i.medicine.strength, form: i.medicine.form, quantity: i.quantity, dosage: i.dosage, frequency: i.frequency, duration: i.duration, instructions: i.instructions })) }));
}

export async function getPharmacyOverview(context: AuthContext): Promise<PharmacyOverview> {
  const [prescriptions, dispensedTodayCount, medicines, batches] = await Promise.all([listPharmacyPrescriptions(context), db.dispensing.count({ where: { clinicId: context.clinicId, createdAt: { gte: getKenyaDayStart(), lt: getKenyaNextDayStart() } } }), db.medicine.findMany({ where: { clinicId: context.clinicId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, reorderLevel: true } }), db.stockBatch.findMany({ where: { clinicId: context.clinicId }, select: { medicineId: true, quantity: true, expiryDate: true } })]);
  const now = new Date();
  const usable = batches.filter((b) => b.quantity > 0 && b.expiryDate >= now);
  const quantityByMedicine = new Map<string, number>();
  for (const batch of usable) quantityByMedicine.set(batch.medicineId, (quantityByMedicine.get(batch.medicineId) ?? 0) + batch.quantity);
  const lowStockMedicines = medicines.map((m) => ({ id: m.id, name: m.name, currentQuantity: quantityByMedicine.get(m.id) ?? 0, reorderLevel: m.reorderLevel })).filter((m) => m.currentQuantity <= m.reorderLevel);
  const expiryLimit = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return { prescriptions, dispensedTodayCount, lowStockMedicines, expiredBatchCount: batches.filter((b) => b.quantity > 0 && b.expiryDate < now).length, expiringSoonBatchCount: batches.filter((b) => b.quantity > 0 && b.expiryDate >= now && b.expiryDate <= expiryLimit).length };
}

export async function dispensePrescription(context: AuthContext, prescriptionId: string) {
  return db.$transaction(async (tx) => {
    const prescription = await tx.prescription.findFirst({ where: { id: prescriptionId, clinicId: context.clinicId }, select: { id: true, patientId: true, visitId: true, status: true, items: { select: { medicineId: true, quantity: true } } } });
    if (!prescription) throw new Error("PRESCRIPTION_NOT_FOUND");
    if (prescription.status !== PrescriptionStatus.SENT_TO_PHARMACY && prescription.status !== PrescriptionStatus.PROCESSING) throw new Error("PRESCRIPTION_NOT_READY");
    if (prescription.items.length === 0) throw new Error("PRESCRIPTION_HAS_NO_ITEMS");
    if (await tx.dispensing.findFirst({ where: { clinicId: context.clinicId, prescriptionId: prescription.id }, select: { id: true } })) throw new Error("PRESCRIPTION_ALREADY_DISPENSED");
    const dispensing = await tx.dispensing.create({ data: { clinicId: context.clinicId, prescriptionId: prescription.id, dispensedById: context.userId }, select: { id: true } });
    const now = new Date(); let totalCharge = 0; const descriptions: string[] = [];
    for (const item of prescription.items) {
      const batches = await tx.stockBatch.findMany({ where: { clinicId: context.clinicId, medicineId: item.medicineId, quantity: { gt: 0 }, expiryDate: { gte: now } }, orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }], select: { id: true, quantity: true, sellingPrice: true, medicine: { select: { name: true } } } });
      if (batches.reduce((s, b) => s + b.quantity, 0) < item.quantity) throw new Error("INSUFFICIENT_STOCK");
      let remaining = item.quantity; let itemCharge = 0;
      for (const batch of batches) { if (!remaining) break; const qty = Math.min(batch.quantity, remaining); itemCharge += qty * Number(batch.sellingPrice); await tx.stockBatch.update({ where: { id: batch.id }, data: { quantity: { decrement: qty } } }); await tx.dispensingItem.create({ data: { dispensingId: dispensing.id, batchId: batch.id, quantity: qty } }); await tx.stockMovement.create({ data: { clinicId: context.clinicId, batchId: batch.id, type: "DISPENSE", quantity: qty, referenceId: dispensing.id, reason: `Prescription ${prescription.id}` } }); remaining -= qty; }
      totalCharge += itemCharge; descriptions.push(`${batches[0].medicine.name} x${item.quantity}`);
    }
    if (totalCharge <= 0) throw new Error("INVALID_DISPENSING_CHARGE");
    const description = `Pharmacy dispensing: ${descriptions.join(", ")}`;
    const existingInvoice = await tx.invoice.findFirst({ where: { clinicId: context.clinicId, patientId: prescription.patientId, visitId: prescription.visitId, status: { not: InvoiceStatus.VOID } }, select: { id: true } });
    let invoiceId: string;
    if (existingInvoice) { invoiceId = existingInvoice.id; await tx.invoiceItem.create({ data: { invoiceId, dispensingId: dispensing.id, description, quantity: 1, unitPrice: totalCharge, total: totalCharge } }); await tx.invoice.update({ where: { id: invoiceId }, data: { total: { increment: totalCharge } } }); }
    else { const invoice = await tx.invoice.create({ data: { clinicId: context.clinicId, patientId: prescription.patientId, visitId: prescription.visitId, invoiceNo: makeInvoiceNo(), status: InvoiceStatus.ISSUED, total: totalCharge, issuedAt: new Date(), items: { create: { dispensingId: dispensing.id, description, quantity: 1, unitPrice: totalCharge, total: totalCharge } } }, select: { id: true } }); invoiceId = invoice.id; }
    const updated = await tx.prescription.update({ where: { id: prescription.id }, data: { status: PrescriptionStatus.DISPENSED }, select: { id: true, status: true } });
    await recordAuditEvent(context, { action: "PRESCRIPTION_DISPENSED", entityType: "Prescription", entityId: prescription.id, metadata: { dispensingId: dispensing.id, invoiceId, totalCharge } }, tx);
    return { ...updated, dispensingId: dispensing.id, invoiceId, totalCharge };
  }, { isolationLevel: "Serializable" });
}
function makeInvoiceNo() { return `INV-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}-${randomUUID().slice(0, 6).toUpperCase()}`; }
function getKenyaDayStart() { const now = new Date(); const kenyaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(now); const [year, month, day] = kenyaDate.split("-").map(Number); return new Date(Date.UTC(year, month - 1, day, -3)); }
function getKenyaNextDayStart() { return new Date(getKenyaDayStart().getTime() + 24 * 60 * 60 * 1000); }
