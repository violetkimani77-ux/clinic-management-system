import { PlatformAdminRole } from "@prisma/client";
import {
  PLATFORM_ACTIONS,
  canPlatformAction,
  isHighRiskPlatformAction,
} from "@/lib/platform/authorization";

describe("platform authorization matrix", () => {
  it("keeps auditors read-only", () => {
    expect(canPlatformAction(PlatformAdminRole.PLATFORM_AUDITOR, PLATFORM_ACTIONS.VIEW_OVERVIEW)).toBe(true);
    expect(canPlatformAction(PlatformAdminRole.PLATFORM_AUDITOR, PLATFORM_ACTIONS.VIEW_AUDIT)).toBe(true);
    expect(canPlatformAction(PlatformAdminRole.PLATFORM_AUDITOR, PLATFORM_ACTIONS.OPERATE_PROVISIONING)).toBe(false);
    expect(canPlatformAction(PlatformAdminRole.PLATFORM_AUDITOR, PLATFORM_ACTIONS.SUSPEND_TENANT)).toBe(false);
  });

  it("allows operators to operate but not perform destructive authority", () => {
    expect(canPlatformAction(PlatformAdminRole.PLATFORM_OPERATOR, PLATFORM_ACTIONS.OPERATE_PROVISIONING)).toBe(true);
    expect(canPlatformAction(PlatformAdminRole.PLATFORM_OPERATOR, PLATFORM_ACTIONS.OPERATE_MAINTENANCE)).toBe(true);
    expect(canPlatformAction(PlatformAdminRole.PLATFORM_OPERATOR, PLATFORM_ACTIONS.SUSPEND_TENANT)).toBe(false);
    expect(canPlatformAction(PlatformAdminRole.PLATFORM_OPERATOR, PLATFORM_ACTIONS.IMPERSONATE_TENANT)).toBe(false);
    expect(canPlatformAction(PlatformAdminRole.PLATFORM_OPERATOR, PLATFORM_ACTIONS.BREAK_GLASS)).toBe(false);
  });

  it("marks tenant suspension, impersonation, and break-glass as high risk", () => {
    expect(isHighRiskPlatformAction(PLATFORM_ACTIONS.SUSPEND_TENANT)).toBe(true);
    expect(isHighRiskPlatformAction(PLATFORM_ACTIONS.IMPERSONATE_TENANT)).toBe(true);
    expect(isHighRiskPlatformAction(PLATFORM_ACTIONS.BREAK_GLASS)).toBe(true);
    expect(isHighRiskPlatformAction(PLATFORM_ACTIONS.VIEW_OVERVIEW)).toBe(false);
  });
});
