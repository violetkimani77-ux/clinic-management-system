import "server-only";

import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/auth/authorization";

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

  const [activePatientCount, visitsToday, revenueToday, outstandingInvoices] =
    await Promise.all([
      db.patient.count({
        where: { clinicId: context.clinicId, archivedAt: null },
      }),
      db.visit.count({
        where: { clinicId: context.clinicId, openedAt: { gte: dayStart, lt: dayEnd } },
      }),
      db.payment.aggregate({
        where: {
          clinicId: context.clinicId,
          status: "VERIFIED",
          receivedAt: { gte: dayStart, lt: dayEnd },
        },
        _sum: { amount: true },
      }),
      db.invoice.aggregate({
        where: {
          clinicId: context.clinicId,
          status: { in: ["ISSUED", "PARTIALLY_PAID"] },
        },
        _sum: { total: true, amountPaid: true },
      }),
    ]);

  const totalInvoiced = outstandingInvoices._sum.total ?? 0;
  const totalPaid = outstandingInvoices._sum.amountPaid ?? 0;

  return {
    activePatientCount,
    visitsToday,
    revenueToday: revenueToday._sum.amount ?? 0,
    outstandingAmount: Number(totalInvoiced) - Number(totalPaid),
  };
}
