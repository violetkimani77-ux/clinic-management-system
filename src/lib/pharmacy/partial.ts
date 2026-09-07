import type { AuthContext } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { InvoiceStatus, PrescriptionStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { recordAuditEvent } from "@/lib/audit";

export type PartialQueueItem = {
  id: string;
  medicineId: string;
  medicineName: string;
  strength: string | null;
  prescribed: number;
  alreadyDispensed: number;
  remaining: number;
};

type PrescriptionProgressItem = {
  id: string;
  medicineId: string;
  quantity: number;
  alreadyDispensed: number;
  remaining: number;
};

export function calculatePrescriptionItemProgress(
  items: Array<{ id: string; medicineId: string; quantity: number }>,
  dispensedByMedicine: Map<string, number>,
): PrescriptionProgressItem[] {
  const remainingDispensed = new Map(dispensedByMedicine);
  return items.map((item) => {
    const availableDispensed = remainingDispensed.get(item.medicineId) ?? 0;
    const alreadyDispensed = Math.min(item.quantity, availableDispensed);
    remainingDispensed.set(item.medicineId, Math.max(availableDispensed - alreadyDispensed, 0));
    return {
      id: item.id,
      medicineId: item.medicineId,
      quantity: item.quantity,
      alreadyDispensed,
      remaining: Math.max(item.quantity - alreadyDispensed, 0),
    };
  });
}

export async function getPartialDispensingQueue(context: AuthContext) {
  const prescriptions = await db.prescription.findMany({
    where: { clinicId: context.clinicId, status: { in: [PrescriptionStatus.SENT_TO_PHARMACY, PrescriptionStatus.PROCESSING, PrescriptionStatus.PARTIALLY_DISPENSED] } },
    orderBy: { createdAt: "asc" }, take: 100,
    select: {
      id: true, patientId: true, visitId: true, status: true, createdAt: true,
      patient: { select: { patientNo: true, firstName: true, lastName: true } },
      items: { select: { id: true, medicineId: true, quantity: true, medicine: { select: { name: true, strength: true } } } },
      dispensing: { select: { items: { select: { quantity: true, batch: { select: { medicineId: true } } } } } },
    },
  });

  return prescriptions.map((p) => {
    const dispensedByMedicine = new Map<string, number>();
    for (const d of p.dispensing) for (const item of d.items) dispensedByMedicine.set(item.batch.medicineId, (dispensedByMedicine.get(item.batch.medicineId) ?? 0) + item.quantity);
    const progress = calculatePrescriptionItemProgress(p.items, dispensedByMedicine);
    const progressById = new Map(progress.map((item) => [item.id, item]));
    return {
      id: p.id,
      patientId: p.patientId,
      patientNo: p.patient.patientNo,
      patientName: `${p.patient.firstName} ${p.patient.lastName}`,
      visitId: p.visitId,
      status: p.status,
      createdAt: p.createdAt,
      items: p.items.map((item) => {
        const itemProgress = progressById.get(item.id)!;
        return { id: item.id, medicineId: item.medicineId, medicineName: item.medicine.name, strength: item.medicine.strength, prescribed: item.quantity, alreadyDispensed: itemProgress.alreadyDispensed, remaining: itemProgress.remaining } satisfies PartialQueueItem;
      }),
    };
  });
}

export async function dispensePartialPrescription(context: AuthContext, prescriptionId: string, requested: Record<string, number>) {
  return db.$transaction(async (tx) => {
    const prescription = await tx.prescription.findFirst({
      where: { id: prescriptionId, clinicId: context.clinicId, status: { in: [PrescriptionStatus.SENT_TO_PHARMACY, PrescriptionStatus.PROCESSING, PrescriptionStatus.PARTIALLY_DISPENSED] } },
      select: { id: true, patientId: true, visitId: true, status: true, items: { select: { id: true, medicineId: true, quantity: true, medicine: { select: { name: true } } } }, dispensing: { select: { items: { select: { quantity: true, batch: { select: { medicineId: true } } } } } } },
    });
    if (!prescription) throw new Error("PRESCRIPTION_NOT_FOUND");
    const dispensedByMedicine = new Map<string, number>();
    for (const d of prescription.dispensing) for (const item of d.items) dispensedByMedicine.set(item.batch.medicineId, (dispensedByMedicine.get(item.batch.medicineId) ?? 0) + item.quantity);
    const progress = calculatePrescriptionItemProgress(prescription.items, dispensedByMedicine);
    const progressById = new Map(progress.map((item) => [item.id, item]));

    const plan = prescription.items.map((item) => {
      const itemProgress = progressById.get(item.id)!;
      const value = requested[item.id] ?? 0;
      if (!Number.isInteger(value) || value < 0 || value > itemProgress.remaining) throw new Error("INVALID_DISPENSING_QUANTITY");
      return { item, remaining: itemProgress.remaining, value };
    }).filter((x) => x.value > 0);
    if (plan.length === 0) throw new Error("NO_DISPENSING_QUANTITY");

    const dispensing = await tx.dispensing.create({ data: { clinicId: context.clinicId, prescriptionId: prescription.id, dispensedById: context.userId }, select: { id: true } });
    let totalCharge = 0;
    const descriptions: string[] = [];
    for (const entry of plan) {
      const batches = await tx.stockBatch.findMany({ where: { clinicId: context.clinicId, medicineId: entry.item.medicineId, quantity: { gt: 0 }, expiryDate: { gte: new Date() } }, orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }], select: { id: true, quantity: true, sellingPrice: true } });
      const available = batches.reduce((sum, b) => sum + b.quantity, 0);
      if (available < entry.value) throw new Error("INSUFFICIENT_STOCK");
      let left = entry.value;
      let itemCharge = 0;
      for (const batch of batches) {
        if (!left) break;
        const quantity = Math.min(left, batch.quantity);
        itemCharge += quantity * Number(batch.sellingPrice);
        await tx.stockBatch.update({ where: { id: batch.id }, data: { quantity: { decrement: quantity } } });
        await tx.dispensingItem.create({ data: { dispensingId: dispensing.id, batchId: batch.id, quantity } });
        await tx.stockMovement.create({ data: { clinicId: context.clinicId, batchId: batch.id, type: "DISPENSE", quantity, referenceId: dispensing.id, reason: `Prescription ${prescription.id}` } });
        left -= quantity;
      }
      totalCharge += itemCharge;
      descriptions.push(`${entry.item.medicine.name} x${entry.value}`);
    }

    if (totalCharge <= 0) throw new Error("INVALID_DISPENSING_CHARGE");
    const invoice = await tx.invoice.findFirst({ where: { clinicId: context.clinicId, patientId: prescription.patientId, visitId: prescription.visitId, status: { not: InvoiceStatus.VOID } }, select: { id: true } });
    let invoiceId: string;
    const description = `Pharmacy dispensing: ${descriptions.join(", ")}`;
    if (invoice) {
      invoiceId = invoice.id;
      await tx.invoiceItem.create({ data: { invoiceId, dispensingId: dispensing.id, description, quantity: 1, unitPrice: totalCharge, total: totalCharge } });
      await tx.invoice.update({ where: { id: invoice.id }, data: { total: { increment: totalCharge } } });
    } else {
      const created = await tx.invoice.create({ data: { clinicId: context.clinicId, patientId: prescription.patientId, visitId: prescription.visitId, invoiceNo: `INV-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}-${randomUUID().slice(0, 6).toUpperCase()}`, status: InvoiceStatus.ISSUED, total: totalCharge, issuedAt: new Date(), items: { create: { dispensingId: dispensing.id, description, quantity: 1, unitPrice: totalCharge, total: totalCharge } } }, select: { id: true } });
      invoiceId = created.id;
    }

    const allFulfilled = progress.every((item) => item.alreadyDispensed + (requested[item.id] ?? 0) >= item.quantity);
    const status = allFulfilled ? PrescriptionStatus.DISPENSED : PrescriptionStatus.PARTIALLY_DISPENSED;
    const updated = await tx.prescription.update({ where: { id: prescription.id }, data: { status }, select: { id: true, status: true } });
    await recordAuditEvent(context, { action: allFulfilled ? "PRESCRIPTION_DISPENSED" : "PRESCRIPTION_PARTIALLY_DISPENSED", entityType: "Prescription", entityId: prescription.id, metadata: { dispensingId: dispensing.id, invoiceId, totalCharge, requested } }, tx);
    return { ...updated, dispensingId: dispensing.id, invoiceId, totalCharge };
  }, { isolationLevel: "Serializable" });
}
