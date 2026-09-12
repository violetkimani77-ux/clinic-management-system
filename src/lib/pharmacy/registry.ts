import type { AuthContext } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { InvoiceStatus, PrescriptionStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { recordAuditEvent } from "@/lib/audit";

export type PharmacyPrescriptionItem = {
  id: string; medicineId: string; medicineName: string; strength: string | null; form: string | null;
  quantity: number; remainingQuantity: number; dosage: string | null; frequency: string | null; duration: string | null; instructions: string | null;
};
export type PharmacyPrescription = {
  id: string; patientId: string; patientNo: string; patientName: string; visitId: string | null;
  status: PrescriptionStatus; createdAt: Date; notes: string | null; items: PharmacyPrescriptionItem[];
};
export type PharmacyOverview = {
  prescriptions: PharmacyPrescription[]; dispensedTodayCount: number;
  lowStockMedicines: Array<{ id: string; name: string; currentQuantity: number; reorderLevel: number }>;
  expiredBatchCount: number; expiringSoonBatchCount: number;
};

export async function listPharmacyPrescriptions(context: AuthContext): Promise<PharmacyPrescription[]> {
  const prescriptions = await db.prescription.findMany({
    where: { clinicId: context.clinicId, status: { in: [PrescriptionStatus.SENT_TO_PHARMACY, PrescriptionStatus.PROCESSING, PrescriptionStatus.PARTIALLY_DISPENSED] } },
    orderBy: { createdAt: "asc" }, take: 100,
    select: {
      id: true, patientId: true, visitId: true, status: true, createdAt: true, notes: true,
      patient: { select: { patientNo: true, firstName: true, lastName: true } },
      items: { orderBy: { createdAt: "asc" }, select: {
        id: true, medicineId: true, quantity: true, dosage: true, frequency: true, duration: true, instructions: true,
        medicine: { select: { name: true, strength: true, form: true } },
      } },
      dispensing: { select: { items: { select: { quantity: true, batch: { select: { medicineId: true } } } } } },
    },
  });
  return prescriptions.map((prescription) => {
    const dispensedByMedicine = new Map<string, number>();
    for (const dispensing of prescription.dispensing) for (const item of dispensing.items) {
      dispensedByMedicine.set(item.batch.medicineId, (dispensedByMedicine.get(item.batch.medicineId) ?? 0) + item.quantity);
    }
    return {
      id: prescription.id, patientId: prescription.patientId, patientNo: prescription.patient.patientNo,
      patientName: `${prescription.patient.firstName} ${prescription.patient.lastName}`, visitId: prescription.visitId,
      status: prescription.status, createdAt: prescription.createdAt, notes: prescription.notes,
      items: prescription.items.map((item) => ({
        id: item.id, medicineId: item.medicineId, medicineName: item.medicine.name, strength: item.medicine.strength,
        form: item.medicine.form, quantity: item.quantity, remainingQuantity: Math.max(0, item.quantity - (dispensedByMedicine.get(item.medicineId) ?? 0)),
        dosage: item.dosage, frequency: item.frequency, duration: item.duration, instructions: item.instructions,
      })),
    };
  });
}

export async function getPharmacyOverview(context: AuthContext): Promise<PharmacyOverview> {
  const [prescriptions, dispensedTodayCount, medicines, batches] = await Promise.all([
    listPharmacyPrescriptions(context),
    db.dispensing.count({ where: { clinicId: context.clinicId, createdAt: { gte: getKenyaDayStart(), lt: getKenyaNextDayStart() } } }),
    db.medicine.findMany({ where: { clinicId: context.clinicId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, reorderLevel: true } }),
    db.stockBatch.findMany({ where: { clinicId: context.clinicId }, select: { medicineId: true, quantity: true, expiryDate: true } }),
  ]);
  const quantityByMedicine = new Map<string, number>();
  for (const batch of batches) quantityByMedicine.set(batch.medicineId, (quantityByMedicine.get(batch.medicineId) ?? 0) + batch.quantity);
  const lowStockMedicines = medicines.map((medicine) => ({ id: medicine.id, name: medicine.name, currentQuantity: quantityByMedicine.get(medicine.id) ?? 0, reorderLevel: medicine.reorderLevel })).filter((medicine) => medicine.currentQuantity <= medicine.reorderLevel);
  const now = new Date();
  const expiryLimit = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return { prescriptions, dispensedTodayCount, lowStockMedicines, expiredBatchCount: batches.filter((batch) => batch.expiryDate < now).length, expiringSoonBatchCount: batches.filter((batch) => batch.expiryDate >= now && batch.expiryDate <= expiryLimit).length };
}

export async function dispensePrescription(context: AuthContext, prescriptionId: string, requestedQuantities?: Record<string, number>) {
  return db.$transaction(async (tx) => {
    const prescription = await tx.prescription.findFirst({
      where: { id: prescriptionId, clinicId: context.clinicId },
      select: {
        id: true, patientId: true, visitId: true, status: true,
        items: { select: { id: true, medicineId: true, quantity: true } },
        dispensing: { select: { items: { select: { quantity: true, batch: { select: { medicineId: true } } } } } },
      },
    });
    if (!prescription) throw new Error("PRESCRIPTION_NOT_FOUND");
    if (prescription.status !== PrescriptionStatus.SENT_TO_PHARMACY && prescription.status !== PrescriptionStatus.PROCESSING && prescription.status !== PrescriptionStatus.PARTIALLY_DISPENSED) throw new Error("PRESCRIPTION_NOT_READY");
    if (prescription.items.length === 0) throw new Error("PRESCRIPTION_HAS_NO_ITEMS");

    const dispensedByMedicine = new Map<string, number>();
    for (const dispensing of prescription.dispensing) for (const item of dispensing.items) {
      dispensedByMedicine.set(item.batch.medicineId, (dispensedByMedicine.get(item.batch.medicineId) ?? 0) + item.quantity);
    }

    const quantities = prescription.items.map((item) => {
      const remaining = Math.max(0, item.quantity - (dispensedByMedicine.get(item.medicineId) ?? 0));
      const requested = requestedQuantities ? (requestedQuantities[item.medicineId] ?? 0) : remaining;
      if (!Number.isInteger(requested) || requested < 0 || requested > remaining) throw new Error("INVALID_DISPENSING_QUANTITY");
      return { ...item, remaining, requested };
    });
    if (quantities.every((item) => item.requested === 0)) throw new Error("INVALID_DISPENSING_QUANTITY");

    const dispensing = await tx.dispensing.create({ data: { clinicId: context.clinicId, prescriptionId: prescription.id, dispensedById: context.userId }, select: { id: true } });
    const now = new Date();
    const chargeDescriptions: string[] = [];
    let totalCharge = 0;

    for (const item of quantities) {
      if (item.requested === 0) continue;
      const batches = await tx.stockBatch.findMany({
        where: { clinicId: context.clinicId, medicineId: item.medicineId, quantity: { gt: 0 }, expiryDate: { gte: now } },
        orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }],
        select: { id: true, quantity: true, sellingPrice: true, medicine: { select: { name: true } } },
      });
      if (batches.reduce((sum, batch) => sum + batch.quantity, 0) < item.requested) throw new Error("INSUFFICIENT_STOCK");
      let remaining = item.requested;
      let itemCharge = 0;
      for (const batch of batches) {
        if (remaining === 0) break;
        const allocated = Math.min(batch.quantity, remaining);
        itemCharge += allocated * Number(batch.sellingPrice);
        await tx.stockBatch.update({ where: { id: batch.id }, data: { quantity: { decrement: allocated } } });
        await tx.dispensingItem.create({ data: { dispensingId: dispensing.id, batchId: batch.id, quantity: allocated } });
        await tx.stockMovement.create({ data: { clinicId: context.clinicId, batchId: batch.id, type: "DISPENSE", quantity: allocated, referenceId: dispensing.id, reason: `Prescription ${prescription.id}` } });
        remaining -= allocated;
      }
      totalCharge += itemCharge;
      chargeDescriptions.push(`${batches[0].medicine.name} x${item.requested}`);
    }

    if (totalCharge <= 0) throw new Error("INVALID_DISPENSING_CHARGE");
    const description = `Pharmacy dispensing: ${chargeDescriptions.join(", ")}`;
    const existingInvoice = await tx.invoice.findFirst({ where: { clinicId: context.clinicId, patientId: prescription.patientId, visitId: prescription.visitId, status: { not: InvoiceStatus.VOID } }, select: { id: true } });
    let invoiceId: string;
    if (existingInvoice) {
      invoiceId = existingInvoice.id;
      await tx.invoiceItem.create({ data: { invoiceId, dispensingId: dispensing.id, description, quantity: 1, unitPrice: totalCharge, total: totalCharge } });
      await tx.invoice.update({ where: { id: invoiceId }, data: { total: { increment: totalCharge } } });
    } else {
      const invoice = await tx.invoice.create({ data: { clinicId: context.clinicId, patientId: prescription.patientId, visitId: prescription.visitId, invoiceNo: makeInvoiceNo(), status: InvoiceStatus.ISSUED, total: totalCharge, issuedAt: new Date(), items: { create: { dispensingId: dispensing.id, description, quantity: 1, unitPrice: totalCharge, total: totalCharge } } }, select: { id: true } });
      invoiceId = invoice.id;
    }

    const allRemainingDispensed = quantities.every((item) => item.requested === item.remaining);
    const updated = await tx.prescription.update({ where: { id: prescription.id }, data: { status: allRemainingDispensed ? PrescriptionStatus.DISPENSED : PrescriptionStatus.PARTIALLY_DISPENSED }, select: { id: true, status: true } });
    await recordAuditEvent(context, { action: allRemainingDispensed ? "PRESCRIPTION_DISPENSED" : "PRESCRIPTION_PARTIALLY_DISPENSED", entityType: "Prescription", entityId: prescription.id, metadata: { dispensingId: dispensing.id, invoiceId, totalCharge } }, tx);
    return { ...updated, dispensingId: dispensing.id, invoiceId, totalCharge };
  }, { isolationLevel: "Serializable" });
}

function makeInvoiceNo() { return `INV-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}-${randomUUID().slice(0, 6).toUpperCase()}`; }
function getKenyaDayStart() { const now = new Date(); const kenyaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(now); const [year, month, day] = kenyaDate.split("-").map(Number); return new Date(Date.UTC(year, month - 1, day, -3)); }
function getKenyaNextDayStart() { return new Date(getKenyaDayStart().getTime() + 24 * 60 * 60 * 1000); }
