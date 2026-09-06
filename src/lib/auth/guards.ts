import "server-only";

import { redirect } from "next/navigation";
import type { PermissionCode } from "./permissions";
import { getAuthContext } from "./session";
import { assertTenant, requirePermission } from "./authorization";
import { requireClinicEntitlement } from "@/lib/platform/subscriptions";
import { requireHealthyTenantDataStore } from "@/lib/platform/tenant-datastore";
import { requirePlatformAvailable } from "@/lib/platform/maintenance";

/**
 * Requires an authenticated, entitled clinic with a healthy registered datastore.
 * Maintenance is enforced at the server boundary rather than only in the UI.
 */
export async function requireAuth() {
  const context = await getAuthContext();
  if (!context) redirect("/login");

  await requirePlatformAvailable();
  await requireClinicEntitlement(context.clinicId);
  await requireHealthyTenantDataStore(context.clinicId);

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
