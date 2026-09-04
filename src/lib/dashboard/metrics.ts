import "server-only";

import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/auth/authorization";

/**
 * Loads dashboard metrics from the active clinic's source-of-truth records.
 *
 * Dashboard values are intentionally calculated from operational data rather
 * than stored separately, so the dashboard cannot drift from the registry.
 */
export async function getDashboardMetrics(context: AuthContext) {
  const activePatientCount = await db.patient.count({
    where: {
      clinicId: context.clinicId,
      archivedAt: null,
    },
  });

  return { activePatientCount };
}
