import "server-only";

import { redirect } from "next/navigation";
import type { PermissionCode } from "./permissions";
import { getAuthContext } from "./session";
import { assertTenant, requirePermission } from "./authorization";

/**
 * Requires an authenticated user for a server-rendered page or server-side
 * operation. Unauthenticated requests are sent to the staff login page.
 */
export async function requireAuth() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  return context;
}

/**
 * Requires both authentication and a specific permission.
 *
 * Use this at the server boundary of each protected workspace or action;
 * client-side navigation filtering is only a usability feature.
 */
export async function requireClinicPermission(permission: PermissionCode) {
  const context = await requireAuth();
  requirePermission(context, permission);
  return context;
}

/**
 * Requires authentication, permission, and ownership by the active clinic.
 *
 * This helper is intended for operations acting on a specific clinic-owned
 * resource and makes the tenant check explicit at the call site.
 */
export async function requireTenantPermission(
  clinicId: string,
  permission: PermissionCode,
) {
  const context = await requireClinicPermission(permission);
  assertTenant(context, clinicId);
  return context;
}
