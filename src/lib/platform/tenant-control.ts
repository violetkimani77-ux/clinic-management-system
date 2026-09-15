import "server-only";

import { db } from "@/lib/db";
import { recordPlatformAudit } from "./auth";
import { PLATFORM_ACTIONS, requireHighRiskStepUp, requirePlatformAction } from "./authorization";
import type { PlatformAuthContext } from "./session";

export type PlatformTenantControl = {
  clinicId: string;
  status: "ACTIVE" | "SUSPENDED";
  suspensionReason: string | null;
  suspendedAt: Date | null;
  updatedAt: Date;
};

async function ensureControl(clinicId: string): Promise<PlatformTenantControl> {
  await db.$executeRawUnsafe(
    `INSERT INTO "PlatformTenantControl" ("clinicId", "status", "updatedAt")
     VALUES ($1, 'ACTIVE', CURRENT_TIMESTAMP)
     ON CONFLICT ("clinicId") DO NOTHING`,
    clinicId,
  );
  const rows = await db.$queryRawUnsafe<PlatformTenantControl[]>(
    `SELECT "clinicId", "status", "suspensionReason", "suspendedAt", "updatedAt"
     FROM "PlatformTenantControl" WHERE "clinicId" = $1`,
    clinicId,
  );
  if (!rows[0]) throw new Error("PLATFORM_TENANT_CONTROL_NOT_FOUND");
  return rows[0];
}

export async function getPlatformTenantControl(clinicId: string, auth: PlatformAuthContext) {
  await requirePlatformAction(auth, PLATFORM_ACTIONS.VIEW_TENANTS, { entityType: "CLINIC", entityId: clinicId });
  return ensureControl(clinicId);
}

export async function suspendPlatformTenant(
  clinicId: string,
  reason: string,
  confirmation: string,
  auth: PlatformAuthContext,
) {
  await requireHighRiskStepUp(auth, PLATFORM_ACTIONS.SUSPEND_TENANT, confirmation);
  const cleanReason = reason.trim();
  if (cleanReason.length < 5 || cleanReason.length > 500) {
    throw new Error("PLATFORM_SUSPENSION_REASON_INVALID");
  }
  await ensureControl(clinicId);
  await db.$executeRawUnsafe(
    `UPDATE "PlatformTenantControl"
     SET "status" = 'SUSPENDED', "suspensionReason" = $2, "suspendedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "clinicId" = $1`,
    clinicId,
    cleanReason,
  );
  await recordPlatformAudit("PLATFORM_TENANT_SUSPENDED", auth.platformAdminId, {
    clinicId,
    reason: cleanReason,
  });
}

export async function reactivatePlatformTenant(
  clinicId: string,
  confirmation: string,
  auth: PlatformAuthContext,
) {
  await requireHighRiskStepUp(auth, PLATFORM_ACTIONS.SUSPEND_TENANT, confirmation);
  await ensureControl(clinicId);
  await db.$executeRawUnsafe(
    `UPDATE "PlatformTenantControl"
     SET "status" = 'ACTIVE', "suspensionReason" = NULL, "suspendedAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "clinicId" = $1`,
    clinicId,
  );
  await recordPlatformAudit("PLATFORM_TENANT_REACTIVATED", auth.platformAdminId, { clinicId });
}
