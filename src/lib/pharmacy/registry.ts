import type { AuthContext } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { PrescriptionStatus } from "@prisma/client";

/**
 * Owns clinic-scoped pharmacy reads and dispensing transactions.
 *
 * This module does not decide whether a staff member may perform an action;
 * callers enforce permissions before invoking mutations. Stock allocation is
 * deliberately transactional so prescription dispensing and inventory changes
 * cannot drift apart.
 */

export type PharmacyPrescriptionItem = {
  id: string;
  medicineId: string;
  medicineName: string;
  strength: string | null;
  form: string | null;
  quantity: number;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
};

export type PharmacyPrescription = {
  id: string;
  patientId: string;
  patientNo: string;
  patientName: string;
  visitId: string | null;
  status: PrescriptionStatus;
  createdAt: Date;
  notes: string | null;
  items: PharmacyPrescriptionItem[];
};

export type PharmacyOverview = {
  prescriptions: PharmacyPrescription[];
  dispensedTodayCount: number;
  lowStockMedicines: Array<{
    id: string;
    name: string;
    currentQuantity: number;
    reorderLevel: number;
  }>;
  expiredBatchCount: number;
  expiringSoonBatchCount: number;
};

/**
 * Returns prescriptions currently waiting for pharmacy processing.
 *
 * CREATED is intentionally excluded: the clinical workflow must explicitly
 * send a prescription to pharmacy before it becomes actionable here.
 */
export async function listPharmacyPrescriptions(
  context: AuthContext,
): Promise<PharmacyPrescription[]> {
  const prescriptions = await db.prescription.findMany({
    where: {
      clinicId: context.clinicId,
      status: {
        in: [PrescriptionStatus.SENT_TO_PHARMACY, PrescriptionStatus.PROCESSING],
      },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: {
      id: true,
      patientId: true,
      visitId: true,
      status: true,
      createdAt: true,
      notes: true,
      patient: {
        select: {
          patientNo: true,
          firstName: true,
          lastName: true,
        },
      },
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          medicineId: true,
          quantity: true,
          dosage: true,
          frequency: true,
          duration: true,
          instructions: true,
          medicine: {
            select: {
              name: true,
              strength: true,
              form: true,
            },
          },
        },
      },
    },
  });

  return prescriptions.map((prescription) => ({
    id: prescription.id,
    patientId: prescription.patientId,
    patientNo: prescription.patient.patientNo,
    patientName: `${prescription.patient.firstName} ${prescription.patient.lastName}`,
    visitId: prescription.visitId,
    status: prescription.status,
    createdAt: prescription.createdAt,
    notes: prescription.notes,
    items: prescription.items.map((item) => ({
      id: item.id,
      medicineId: item.medicineId,
      medicineName: item.medicine.name,
      strength: item.medicine.strength,
      form: item.medicine.form,
      quantity: item.quantity,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions,
    })),
  }));
}

/**
 * Returns live pharmacy indicators directly from medicine and batch records.
 * Quantities are derived from current stock batches, not duplicated counters.
 */
export async function getPharmacyOverview(
  context: AuthContext,
): Promise<PharmacyOverview> {
  const [prescriptions, dispensedTodayCount, medicines, batches] = await Promise.all([
    listPharmacyPrescriptions(context),
    db.dispensing.count({
      where: {
        clinicId: context.clinicId,
        createdAt: { gte: getKenyaDayStart(), lt: getKenyaNextDayStart() },
      },
    }),
    db.medicine.findMany({
      where: { clinicId: context.clinicId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, reorderLevel: true },
    }),
    db.stockBatch.findMany({
      where: { clinicId: context.clinicId },
      select: { medicineId: true, quantity: true, expiryDate: true },
    }),
  ]);

  const quantityByMedicine = new Map<string, number>();
  for (const batch of batches) {
    quantityByMedicine.set(
      batch.medicineId,
      (quantityByMedicine.get(batch.medicineId) ?? 0) + batch.quantity,
    );
  }

  const lowStockMedicines = medicines
    .map((medicine) => ({
      id: medicine.id,
      name: medicine.name,
      currentQuantity: quantityByMedicine.get(medicine.id) ?? 0,
      reorderLevel: medicine.reorderLevel,
    }))
    .filter((medicine) => medicine.currentQuantity <= medicine.reorderLevel);

  const now = new Date();
  const expiryLimit = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiredBatchCount = batches.filter((batch) => batch.expiryDate < now).length;
  const expiringSoonBatchCount = batches.filter(
    (batch) => batch.expiryDate >= now && batch.expiryDate <= expiryLimit,
  ).length;

  return {
    prescriptions,
    dispensedTodayCount,
    lowStockMedicines,
    expiredBatchCount,
    expiringSoonBatchCount,
  };
}

/**
 * Dispenses every item on a prescription using FEFO (first expiry, first out).
 *
 * Serializable isolation is intentional here: two pharmacy staff members must
 * not both validate the same stock and then overspend it concurrently. If the
 * database detects a serialization conflict, the whole transaction fails and
 * no partial dispensing or stock movement is committed.
 */
export async function dispensePrescription(
  context: AuthContext,
  prescriptionId: string,
) {
  return db.$transaction(
    async (tx) => {
      const prescription = await tx.prescription.findFirst({
        where: {
          id: prescriptionId,
          clinicId: context.clinicId,
        },
        select: {
          id: true,
          patientId: true,
          status: true,
          items: {
            select: {
              id: true,
              medicineId: true,
              quantity: true,
            },
          },
        },
      });

      if (!prescription) throw new Error("PRESCRIPTION_NOT_FOUND");

      if (
        prescription.status !== PrescriptionStatus.SENT_TO_PHARMACY &&
        prescription.status !== PrescriptionStatus.PROCESSING
      ) {
        throw new Error("PRESCRIPTION_NOT_READY");
      }

      if (prescription.items.length === 0) {
        throw new Error("PRESCRIPTION_HAS_NO_ITEMS");
      }

      const dispensing = await tx.dispensing.create({
        data: {
          clinicId: context.clinicId,
          prescriptionId: prescription.id,
          dispensedById: context.userId,
        },
        select: { id: true },
      });

      const now = new Date();

      for (const item of prescription.items) {
        const batches = await tx.stockBatch.findMany({
          where: {
            clinicId: context.clinicId,
            medicineId: item.medicineId,
            quantity: { gt: 0 },
            expiryDate: { gte: now },
          },
          orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }],
          select: { id: true, quantity: true, expiryDate: true },
        });

        const available = batches.reduce((sum, batch) => sum + batch.quantity, 0);
        if (available < item.quantity) {
          throw new Error("INSUFFICIENT_STOCK");
        }

        let remaining = item.quantity;
        for (const batch of batches) {
          if (remaining === 0) break;

          const allocated = Math.min(batch.quantity, remaining);
          await tx.stockBatch.update({
            where: { id: batch.id },
            data: { quantity: { decrement: allocated } },
          });

          await tx.dispensingItem.create({
            data: {
              dispensingId: dispensing.id,
              batchId: batch.id,
              quantity: allocated,
            },
          });

          await tx.stockMovement.create({
            data: {
              clinicId: context.clinicId,
              batchId: batch.id,
              type: "DISPENSE",
              quantity: allocated,
              referenceId: dispensing.id,
              reason: `Prescription ${prescription.id}`,
            },
          });

          remaining -= allocated;
        }
      }

      const updated = await tx.prescription.update({
        where: { id: prescription.id },
        data: { status: PrescriptionStatus.DISPENSED },
        select: { id: true, status: true },
      });

      await tx.auditLog.create({
        data: {
          clinicId: context.clinicId,
          userId: context.userId,
          action: "PRESCRIPTION_DISPENSED",
          entityType: "Prescription",
          entityId: prescription.id,
          metadata: { dispensingId: dispensing.id },
        },
      });

      return { ...updated, dispensingId: dispensing.id };
    },
    { isolationLevel: "Serializable" },
  );
}

function getKenyaDayStart() {
  const now = new Date();
  const kenyaDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [year, month, day] = kenyaDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, -3));
}

function getKenyaNextDayStart() {
  const start = getKenyaDayStart();
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}
