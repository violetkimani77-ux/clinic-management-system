import type { AuthContext } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { PrescriptionStatus } from "@prisma/client";
import { recordAuditEvent } from "@/lib/audit";

type PrescriptionItemInput = {
  medicineId: string;
  quantity: number;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
};

/**
 * Owns clinic-scoped prescription reads and mutations.
 *
 * Prescriptions remain attached to the originating patient and visit. The
 * clinical side explicitly sends a prescription to Pharmacy; Pharmacy only
 * receives prescriptions after that workflow transition.
 */

export async function listActiveMedicines(context: AuthContext) {
  return db.medicine.findMany({
    where: { clinicId: context.clinicId, active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, strength: true, form: true },
  });
}

export async function getVisitPrescriptions(context: AuthContext, visitId: string) {
  const prescriptions = await db.prescription.findMany({
    where: { clinicId: context.clinicId, visitId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      notes: true,
      createdAt: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          quantity: true,
          dosage: true,
          frequency: true,
          duration: true,
          instructions: true,
          medicine: { select: { name: true, strength: true, form: true } },
        },
      },
    },
  });

  await recordAuditEvent(context, {
    action: "PRESCRIPTIONS_VIEWED",
    entityType: "Prescription",
    metadata: { visitId, resultCount: prescriptions.length },
  });

  return prescriptions;
}

function cleanOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Creates a draft prescription only for an active patient and clinic visit. */
export async function createPrescription(
  context: AuthContext,
  input: { visitId: string; notes?: string | null; items: PrescriptionItemInput[] },
) {
  if (input.items.length === 0) throw new Error("PRESCRIPTION_HAS_NO_ITEMS");

  return db.$transaction(async (tx) => {
    const visit = await tx.visit.findFirst({
      where: {
        id: input.visitId,
        clinicId: context.clinicId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
      select: { id: true, patientId: true },
    });

    if (!visit) throw new Error("VISIT_NOT_FOUND_OR_CLOSED");

    const medicineIds = [...new Set(input.items.map((item) => item.medicineId))];
    const medicines = await tx.medicine.findMany({
      where: { clinicId: context.clinicId, active: true, id: { in: medicineIds } },
      select: { id: true },
    });

    if (medicines.length !== medicineIds.length) throw new Error("MEDICINE_NOT_FOUND");

    for (const item of input.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error("INVALID_PRESCRIPTION_QUANTITY");
      }
    }

    return tx.prescription.create({
      data: {
        clinicId: context.clinicId,
        patientId: visit.patientId,
        visitId: visit.id,
        status: PrescriptionStatus.CREATED,
        notes: cleanOptionalText(input.notes),
        items: {
          create: input.items.map((item) => ({
            medicineId: item.medicineId,
            quantity: item.quantity,
            dosage: cleanOptionalText(item.dosage),
            frequency: cleanOptionalText(item.frequency),
            duration: cleanOptionalText(item.duration),
            instructions: cleanOptionalText(item.instructions),
          })),
        },
      },
      select: { id: true, patientId: true },
    });
  });
}

/** Moves a draft prescription into the Pharmacy queue and records the audit event. */
export async function sendPrescriptionToPharmacy(context: AuthContext, prescriptionId: string) {
  return db.$transaction(async (tx) => {
    const prescription = await tx.prescription.findFirst({
      where: { id: prescriptionId, clinicId: context.clinicId },
      select: { id: true, status: true, patientId: true, visitId: true },
    });

    if (!prescription) throw new Error("PRESCRIPTION_NOT_FOUND");
    if (prescription.status !== PrescriptionStatus.CREATED) throw new Error("PRESCRIPTION_NOT_DRAFT");

    const itemCount = await tx.prescriptionItem.count({ where: { prescriptionId: prescription.id } });
    if (itemCount === 0) throw new Error("PRESCRIPTION_HAS_NO_ITEMS");

    const updated = await tx.prescription.update({
      where: { id: prescription.id },
      data: { status: PrescriptionStatus.SENT_TO_PHARMACY },
      select: { id: true, patientId: true, visitId: true },
    });

    await recordAuditEvent(context, {
      action: "PRESCRIPTION_SENT_TO_PHARMACY",
      entityType: "Prescription",
      entityId: prescription.id,
      metadata: { patientId: prescription.patientId, visitId: prescription.visitId },
    }, tx);

    return updated;
  });
}
