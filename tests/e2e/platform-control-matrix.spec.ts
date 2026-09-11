import { expect, test } from "@playwright/test";

const actions = [
  "VIEW_OVERVIEW",
  "VIEW_TENANTS",
  "VIEW_RESIDENCY",
  "VIEW_AUDIT",
  "OPERATE_PROVISIONING",
  "OPERATE_MAINTENANCE",
  "SUSPEND_TENANT",
  "IMPERSONATE_TENANT",
  "BREAK_GLASS",
] as const;

type Role = "PLATFORM_ADMIN" | "PLATFORM_OPERATOR" | "PLATFORM_AUDITOR";

const allowed: Record<Role, Set<string>> = {
  PLATFORM_ADMIN: new Set(actions),
  PLATFORM_OPERATOR: new Set([
    "VIEW_OVERVIEW",
    "VIEW_TENANTS",
    "VIEW_RESIDENCY",
    "VIEW_AUDIT",
    "OPERATE_PROVISIONING",
    "OPERATE_MAINTENANCE",
  ]),
  PLATFORM_AUDITOR: new Set([
    "VIEW_OVERVIEW",
    "VIEW_TENANTS",
    "VIEW_RESIDENCY",
    "VIEW_AUDIT",
  ]),
};

test.describe("Platform Control authorization matrix", () => {
  test("covers every action for every platform role", () => {
    for (const role of Object.keys(allowed) as Role[]) {
      expect(allowed[role].size).toBeGreaterThan(0);
      for (const action of actions) expect(allowed[role].has(action)).toBe(role === "PLATFORM_ADMIN" || allowed[role].has(action));
    }

    expect(allowed.PLATFORM_ADMIN.size).toBe(actions.length);
    expect(allowed.PLATFORM_OPERATOR.has("SUSPEND_TENANT")).toBe(false);
    expect(allowed.PLATFORM_OPERATOR.has("IMPERSONATE_TENANT")).toBe(false);
    expect(allowed.PLATFORM_OPERATOR.has("BREAK_GLASS")).toBe(false);
    expect(allowed.PLATFORM_AUDITOR.has("OPERATE_PROVISIONING")).toBe(false);
    expect(allowed.PLATFORM_AUDITOR.has("OPERATE_MAINTENANCE")).toBe(false);
    expect(allowed.PLATFORM_AUDITOR.has("SUSPEND_TENANT")).toBe(false);
    expect(allowed.PLATFORM_AUDITOR.has("IMPERSONATE_TENANT")).toBe(false);
    expect(allowed.PLATFORM_AUDITOR.has("BREAK_GLASS")).toBe(false);
  });
});
