import "server-only";

import { PlatformAdminRole } from "@prisma/client";
import { recordPlatformAudit } from "./auth";
import type { PlatformAuthContext } from "./session";

export const PLATFORM_ACTIONS = {
  VIEW_OVERVIEW: "VIEW_OVERVIEW",
  VIEW_TENANTS: "VIEW_TENANTS",
  VIEW_RESIDENCY: "VIEW_RESIDENCY",
  VIEW_AUDIT: "VIEW_AUDIT",
  OPERATE_PROVISIONING: "OPERATE_PROVISIONING",
  OPERATE_MAINTENANCE: "OPERATE_MAINTENANCE",
  SUSPEND_TENANT: "SUSPEND_TENANT",
  IMPERSONATE_TENANT: "IMPERSONATE_TENANT",
  BREAK_GLASS: "BREAK_GLASS",
} as const;

export type PlatformAction = (typeof PLATFORM_ACTIONS)[keyof typeof PLATFORM_ACTIONS];

const ROLE_ACTIONS: Record<PlatformAdminRole, readonly PlatformAction[]> = {
  PLATFORM_ADMIN: Object.values(PLATFORM_ACTIONS),
  PLATFORM_OPERATOR: [
    PLATFORM_ACTIONS.VIEW_OVERVIEW,
    PLATFORM_ACTIONS.VIEW_TENANTS,
    PLATFORM_ACTIONS.VIEW_RESIDENCY,
    PLATFORM_ACTIONS.VIEW_AUDIT,
    PLATFORM_ACTIONS.OPERATE_PROVISIONING,
    PLATFORM_ACTIONS.OPERATE_MAINTENANCE,
  ],
  PLATFORM_AUDITOR: [
    PLATFORM_ACTIONS.VIEW_OVERVIEW,
    PLATFORM_ACTIONS.VIEW_TENANTS,
    PLATFORM_ACTIONS.VIEW_RESIDENCY,
    PLATFORM_ACTIONS.VIEW_AUDIT,
  ],
};

const HIGH_RISK_ACTIONS = new Set<PlatformAction>([
  PLATFORM_ACTIONS.SUSPEND_TENANT,
  PLATFORM_ACTIONS.IMPERSONATE_TENANT,
  PLATFORM_ACTIONS.BREAK_GLASS,
]);

export function canPlatformAction(role: PlatformAdminRole, action: PlatformAction): boolean {
  return ROLE_ACTIONS[role].includes(action);
}

export function isHighRiskPlatformAction(action: PlatformAction): boolean {
  return HIGH_RISK_ACTIONS.has(action);
}

export async function requirePlatformAction(
  auth: PlatformAuthContext,
  action: PlatformAction,
  options?: { entityType?: string; entityId?: string },
): Promise<void> {
  if (!canPlatformAction(auth.roleCode, action)) {
    await recordPlatformAudit("PLATFORM_AUTHORIZATION_DENIED", auth.platformAdminId, {
      action,
      roleCode: auth.roleCode,
      entityType: options?.entityType ?? "PLATFORM",
      entityId: options?.entityId,
    });
    throw new Error("PLATFORM_FORBIDDEN");
  }
}

export async function requireHighRiskStepUp(
  auth: PlatformAuthContext,
  action: PlatformAction,
  confirmation: string,
): Promise<void> {
  await requirePlatformAction(auth, action);
  if (!isHighRiskPlatformAction(action) || confirmation !== "CONFIRM") {
    await recordPlatformAudit("PLATFORM_HIGH_RISK_DENIED", auth.platformAdminId, {
      action,
      roleCode: auth.roleCode,
      reason: "explicit_confirmation_required",
    });
    throw new Error("PLATFORM_STEP_UP_REQUIRED");
  }
}
