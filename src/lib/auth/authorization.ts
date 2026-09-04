import type { PermissionCode } from "./permissions";

/**
 * Server-side identity and authorization context for one clinic.
 *
 * The clinicId is established by the authenticated session and is the tenant
 * boundary for clinic-owned data. The user name is display metadata only; it
 * must never be used as an authorization decision.
 */
export type AuthContext = {
  userId: string;
  userName: string;
  clinicId: string;
  roleCode: string;
  permissions: ReadonlySet<PermissionCode>;
};

/** Returns true when the authenticated user has the requested permission. */
export function hasPermission(
  context: AuthContext,
  permission: PermissionCode,
): boolean {
  return context.permissions.has(permission);
}

/**
 * Enforces a server-side permission boundary.
 *
 * Navigation visibility is not authorization. Protected server actions, route
 * handlers, and data access functions must enforce their own permissions.
 */
export function requirePermission(
  context: AuthContext,
  permission: PermissionCode,
): void {
  if (!hasPermission(context, permission)) {
    throw new Error("FORBIDDEN");
  }
}

/**
 * Enforces the tenant boundary for clinic-owned data.
 *
 * A resource is accessible only when its clinic matches the clinic established
 * by the authenticated session, preventing cross-clinic data access.
 */
export function assertTenant(
  context: AuthContext,
  clinicId: string,
): void {
  if (context.clinicId !== clinicId) {
    throw new Error("TENANT_ACCESS_DENIED");
  }
}
