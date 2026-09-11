import { expect, test } from "@playwright/test";

const matrix = [
  { role: "PLATFORM_ADMIN", allowed: ["overview", "tenants", "audit"], denied: [] },
  { role: "PLATFORM_OPERATOR", allowed: ["overview", "tenants", "audit"], denied: ["suspend", "impersonate", "break-glass"] },
  { role: "PLATFORM_AUDITOR", allowed: ["overview", "tenants", "audit"], denied: ["provisioning", "maintenance", "suspend", "impersonate", "break-glass"] },
];

test.describe("Platform Control authorization matrix", () => {
  test("documents every platform role's allowed and denied authority", () => {
    for (const entry of matrix) {
      expect(entry.role).toMatch(/^PLATFORM_(ADMIN|OPERATOR|AUDITOR)$/);
      expect(entry.allowed).toContain("overview");
      expect(entry.allowed).toContain("tenants");
      expect(entry.allowed).toContain("audit");
      expect(entry.denied).not.toContain("overview");
    }
  });
});
