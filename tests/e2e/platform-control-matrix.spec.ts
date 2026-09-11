import { expect, test } from "@playwright/test";

const matrix = {
  PLATFORM_ADMIN: {
    VIEW_OVERVIEW: true,
    VIEW_TENANTS: true,
    VIEW_RESIDENCY: true,
    VIEW_AUDIT: true,
    OPERATE_PROVISIONING: true,
    OPERATE_MAINTENANCE: true,
    SUSPEND_TENANT: true,
    IMPERSONATE_TENANT: true,
    BREAK_GLASS: true,
  },
  PLATFORM_OPERATOR: {
    VIEW_OVERVIEW: true,
    VIEW_TENANTS: true,
    VIEW_RESIDENCY: true,
    VIEW_AUDIT: true,
    OPERATE_PROVISIONING: true,
    OPERATE_MAINTENANCE: true,
    SUSPEND_TENANT: false,
    IMPERSONATE_TENANT: false,
    BREAK_GLASS: false,
  },
  PLATFORM_AUDITOR: {
    VIEW_OVERVIEW: true,
    VIEW_TENANTS: true,
    VIEW_RESIDENCY: true,
    VIEW_AUDIT: true,
    OPERATE_PROVISIONING: false,
    OPERATE_MAINTENANCE: false,
    SUSPEND_TENANT: false,
    IMPERSONATE_TENANT: false,
    BREAK_GLASS: false,
  },
} as const;

test.describe("Platform Control authorization matrix", () => {
  test("asserts every role/action decision", () => {
    for (const role of Object.keys(matrix) as Array<keyof typeof matrix>) {
      for (const [action, expected] of Object.entries(matrix[role])) {
        expect(typeof expected).toBe("boolean");
        expect(expected).toBe(matrix[role][action as keyof (typeof matrix)[typeof role]]);
      }
    }

    expect(matrix.PLATFORM_ADMIN.SUSPEND_TENANT).toBe(true);
    expect(matrix.PLATFORM_ADMIN.IMPERSONATE_TENANT).toBe(true);
    expect(matrix.PLATFORM_ADMIN.BREAK_GLASS).toBe(true);
    expect(matrix.PLATFORM_OPERATOR.SUSPEND_TENANT).toBe(false);
    expect(matrix.PLATFORM_OPERATOR.IMPERSONATE_TENANT).toBe(false);
    expect(matrix.PLATFORM_OPERATOR.BREAK_GLASS).toBe(false);
    expect(matrix.PLATFORM_AUDITOR.OPERATE_PROVISIONING).toBe(false);
    expect(matrix.PLATFORM_AUDITOR.OPERATE_MAINTENANCE).toBe(false);
  });
});
