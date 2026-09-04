import "server-only";

import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/auth/authorization";

const EXPIRING_SOON_DAYS = 30;

/**
 * Returns live operational metrics for the active clinic.
 * Dashboard values are calculated from source records instead of stored
 * separately, so the dashboard cannot drift from the database.
 */
export async function getDashboardMetrics(context: AuthContext) {
  // The clinic operates in Kenya (EAT, UTC+3). Explicit boundaries prevent
  // a UTC-based server clock from assigning records to the wrong calendar day.
  const now = new Date();
  const kenyaDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [year, month, day] = kenyaDate.split("-").map(Number);
  const dayStart = new Date(Date.UTC(year, month - 1, day, -3));
  const dayEnd = new Date(Date.UTC(year, month - 1, day + 1, -3));
  const expiringSoonEnd = new Date(dayEnd);
  expiringSoonEnd.setUTCDate(expiringSoonEnd.getUTCDate() + EXPIRING_SOON_DAYS);

  const [activePatientCount, patientsRegisteredToday, patientsToday, visitsToday, completedVisitsToday, pendingVisitsToday, revenueToday, paymentsToday, outstandingInvoices, medicines, expiredBatchCount, expiringSoonBatchCount] = await Promise.all([
    db.patient.count({ where: { clinicId: context.clinicId, archivedAt: null } }),
    db.patient.count({ where: { clinicId: context.clinicId, archivedAt: null, createdAt: { gte: dayStart, lt: dayEnd } } }),
    db.visit.findMany({ where: { clinicId: context.clinicId, openedAt: { gte: dayStart, lt: dayEnd } }, distinct: ["patientId"], select: { patientId: true } }),
    db.visit.count({ where: { clinicId: context.clinicId, openedAt: { gte: dayStart, lt: dayEnd } } }),
    db.visit.count({ where: { clinicId: context.clinicId, status: "COMPLETED", openedAt: { gte: dayStart, lt: dayEnd } } }),
    db.visit.count({ where: { clinicId: context.clinicId, status: { in: ["OPEN", "IN_PROGRESS"] }, openedAt: { gte: dayStart, lt: dayEnd } } }),
    db.payment.aggregate({ where: { clinicId: context.clinicId, status: "VERIFIED", receivedAt: { gte: dayStart, lt: dayEnd } }, _sum: { amount: true } }),
    db.payment.groupBy({ by: ["method"], where: { clinicId: context.clinicId, status: "VERIFIED", receivedAt: { gte: dayStart, lt: dayEnd } }, _sum: { amount: true } }),
    db.invoice.aggregate({ where: { clinicId: context.clinicId, status: { in: ["ISSUED", "PARTIALLY_PAID"] } }, _sum: { total: true, amountPaid: true } }),
    db.medicine.findMany({ where: { clinicId: context.clinicId, active: true }, select: { id: true, name: true, reorderLevel: true, batches: { where: { quantity: { gt: 0 } }, select: { quantity: true } } } }),
    db.stockBatch.count({ where: { clinicId: context.clinicId, quantity: { gt: 0 }, expiryDate: { lt: dayStart } } }),
    db.stockBatch.count({ where: { clinicId: context.clinicId, quantity: { gt: 0 }, expiryDate: { gte: dayStart, lt: expiringSoonEnd } } }),
  ]);

  const lowStockMedicines = medicines.filter((medicine) => {
    const quantity = medicine.batches.reduce((total, batch) => total + batch.quantity, 0);
    return quantity <= medicine.reorderLevel;
  });

  const paymentBreakdown = Object.fromEntries(
    paymentsToday.map((payment) => [payment.method, Number(payment._sum.amount ?? 0)]),
  );

  const totalInvoiced = outstandingInvoices._sum.total ?? 0;
  const totalPaid = outstandingInvoices._sum.amountPaid ?? 0;

  return {
    activePatientCount,
    patientsRegisteredToday,
    patientsToday: patientsToday.length,
    visitsToday,
    completedVisitsToday,
    pendingVisitsToday,
    revenueToday: Number(revenueToday._sum.amount ?? 0),
    paymentBreakdown,
    outstandingAmount: Number(totalInvoiced) - Number(totalPaid),
    lowStockMedicines: lowStockMedicines.map((medicine) => ({
      id: medicine.id,
      name: medicine.name,
      quantity: medicine.batches.reduce((total, batch) => total + batch.quantity, 0),
      reorderLevel: medicine.reorderLevel,
    })),
    expiredBatchCount,
    expiringSoonBatchCount,
  };
}
