import "server-only";

import { db } from "@/lib/db";
import { SubscriptionStatus } from "@prisma/client";

const ACTIVE_STATUSES = new Set<SubscriptionStatus>([
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.GRACE_PERIOD,
  SubscriptionStatus.TRIAL,
]);

export async function getClinicSubscription(clinicId: string) {
  return db.clinicSubscription.findUnique({ where: { clinicId } });
}

export async function isClinicEntitled(clinicId: string, now = new Date()) {
  const subscription = await getClinicSubscription(clinicId);
  if (!subscription || !ACTIVE_STATUSES.has(subscription.status)) return false;

  if (subscription.status === SubscriptionStatus.GRACE_PERIOD) {
    return !!subscription.graceEndsAt && subscription.graceEndsAt > now;
  }

  if (subscription.currentPeriodEnd && subscription.currentPeriodEnd <= now) {
    return false;
  }

  return true;
}

export async function requireClinicEntitlement(clinicId: string) {
  if (!(await isClinicEntitled(clinicId))) {
    throw new Error("CLINIC_SUBSCRIPTION_REQUIRED");
  }
}
