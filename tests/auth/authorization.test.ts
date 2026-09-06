import {
  assertTenant,
  hasPermission,
  requirePermission,
  type AuthContext,
} from "@/lib/auth/authorization";
import { PERMISSIONS } from "@/lib/auth/permissions";

const context: AuthContext = {
  userId: "user-1",
  userName: "Test User",
  clinicId: "clinic-1",
  roleCode: "PHARMACY",
  permissions: new Set([
    PERMISSIONS.PATIENTS_VIEW,
    PERMISSIONS.PHARMACY_VIEW,
    PERMISSIONS.PHARMACY_DISPENSE,
  ]),
};

describe("authorization", () => {
  it("returns true when the user has a permission", () => {
    expect(hasPermission(context, PERMISSIONS.PHARMACY_VIEW)).toBe(true);
  });

  it("returns false when the user lacks a permission", () => {
    expect(hasPermission(context, PERMISSIONS.PATIENTS_CREATE)).toBe(false);
  });

  it("allows a required permission when present", () => {
    expect(() =>
      requirePermission(context, PERMISSIONS.PHARMACY_DISPENSE),
    ).not.toThrow();
  });

  it("throws FORBIDDEN when a required permission is missing", () => {
    expect(() =>
      requirePermission(context, PERMISSIONS.PATIENTS_CREATE),
    ).toThrow("FORBIDDEN");
  });

  it("allows access within the authenticated clinic", () => {
    expect(() => assertTenant(context, "clinic-1")).not.toThrow();
  });

  it("blocks access to another clinic", () => {
    expect(() => assertTenant(context, "clinic-2")).toThrow(
      "TENANT_ACCESS_DENIED",
    );
  });
});
