import type { PermissionCode } from "./permissions";

export type AuthContext = {
  userId: string;
  clinicId: string;
  roleCode: string;
  permissions: ReadonlySet<PermissionCode>;
};

export function hasPermission(
  context: AuthContext,
  permission: PermissionCode,
): boolean {
  return context.permissions.has(permission);
}

export function requirePermission(
  context: AuthContext,
  permission: PermissionCode,
): void {
  if (!hasPermission(context, permission)) {
    throw new Error("FORBIDDEN");
  }
}

export function assertTenant(
  context: AuthContext,
  clinicId: string,
): void {
  if (context.clinicId !== clinicId) {
    throw new Error("TENANT_ACCESS_DENIED");
  }
}
