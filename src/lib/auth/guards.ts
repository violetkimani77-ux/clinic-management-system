import "server-only";

import { redirect } from "next/navigation";
import type { PermissionCode } from "./permissions";
import { getAuthContext } from "./session";
import { assertTenant, requirePermission } from "./authorization";

export async function requireAuth() {
  const context = await getAuthContext();
  if (!context) redirect("/");
  return context;
}

export async function requireClinicPermission(permission: PermissionCode) {
  const context = await requireAuth();
  requirePermission(context, permission);
  return context;
}

export async function requireTenantPermission(
  clinicId: string,
  permission: PermissionCode,
) {
  const context = await requireClinicPermission(permission);
  assertTenant(context, clinicId);
  return context;
}
