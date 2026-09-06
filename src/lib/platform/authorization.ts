import "server-only";

import { PlatformRole } from "@prisma/client";

export function hasPlatformRole(role: PlatformRole, allowed: readonly PlatformRole[]) {
  return allowed.includes(role);
}

export function requirePlatformRole(role: PlatformRole, allowed: readonly PlatformRole[]) {
  if (!hasPlatformRole(role, allowed)) {
    throw new Error("PLATFORM_FORBIDDEN");
  }
}

export const PLATFORM_ADMIN_ROLES = [PlatformRole.OWNER, PlatformRole.ADMIN] as const;
export const PLATFORM_SUPPORT_ROLES = [PlatformRole.OWNER, PlatformRole.ADMIN, PlatformRole.SUPPORT] as const;
export const PLATFORM_BILLING_ROLES = [PlatformRole.OWNER, PlatformRole.ADMIN, PlatformRole.BILLING] as const;
