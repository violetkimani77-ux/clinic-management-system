import { PlatformAdminRole } from "@prisma/client";
import { recordPlatformAudit, reauthenticatePlatformAdmin } from "@/lib/platform/auth";
import {
  PLATFORM_ACTIONS,
  canPlatformAction,
  isHighRiskPlatformAction,
  requireHighRiskStepUp,
  requirePlatformAction,
} from "@/lib/platform/authorization";
import type { PlatformAuthContext } from "@/lib/platform/session";

jest.mock("@/lib/platform/auth", () => ({
  recordPlatformAudit: jest.fn(async () => undefined),
  reauthenticatePlatformAdmin: jest.fn(async () => true),
}));

const mockRecordAudit = recordPlatformAudit as jest.Mock;
const mockReauth = reauthenticatePlatformAdmin as jest.Mock;

const ADMIN: PlatformAuthContext = {
  platformAdminId: "admin-1",
  email: "ops@example.com",
  name: "Ops",
  roleCode: PlatformAdminRole.PLATFORM_ADMIN,
};

const OPERATOR: PlatformAuthContext = { ...ADMIN, roleCode: PlatformAdminRole.PLATFORM_OPERATOR };
const AUDITOR: PlatformAuthContext = { ...ADMIN, roleCode: PlatformAdminRole.PLATFORM_AUDITOR };

const STEP_UP = { confirmation: "CONFIRM", password: "correct-password", mfaCode: "123456" };

describe("platform authorization matrix", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReauth.mockResolvedValue(true);
  });

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

  it("grants platform admins every action", () => {
    for (const action of Object.values(PLATFORM_ACTIONS)) {
      expect(canPlatformAction(PlatformAdminRole.PLATFORM_ADMIN, action)).toBe(true);
    }
  });

  it("marks tenant suspension, impersonation, and break-glass as high risk", () => {
    expect(isHighRiskPlatformAction(PLATFORM_ACTIONS.SUSPEND_TENANT)).toBe(true);
    expect(isHighRiskPlatformAction(PLATFORM_ACTIONS.IMPERSONATE_TENANT)).toBe(true);
    expect(isHighRiskPlatformAction(PLATFORM_ACTIONS.BREAK_GLASS)).toBe(true);
    expect(isHighRiskPlatformAction(PLATFORM_ACTIONS.VIEW_OVERVIEW)).toBe(false);
  });

  it("requirePlatformAction throws PLATFORM_FORBIDDEN for a role that lacks the action", async () => {
    await expect(requirePlatformAction(AUDITOR, PLATFORM_ACTIONS.SUSPEND_TENANT)).rejects.toThrow("PLATFORM_FORBIDDEN");
    expect(mockRecordAudit).toHaveBeenCalledWith(
      "PLATFORM_AUTHORIZATION_DENIED",
      AUDITOR.platformAdminId,
      expect.objectContaining({ action: PLATFORM_ACTIONS.SUSPEND_TENANT }),
    );
  });

  it("requirePlatformAction allows a permitted action", async () => {
    await expect(requirePlatformAction(OPERATOR, PLATFORM_ACTIONS.VIEW_TENANTS)).resolves.toBeUndefined();
    expect(mockRecordAudit).not.toHaveBeenCalled();
  });

  it("requireHighRiskStepUp rejects operators even with confirmation and credentials", async () => {
    await expect(requireHighRiskStepUp(OPERATOR, PLATFORM_ACTIONS.SUSPEND_TENANT, STEP_UP)).rejects.toThrow(
      "PLATFORM_FORBIDDEN",
    );
    expect(mockReauth).not.toHaveBeenCalled();
  });

  it("requireHighRiskStepUp rejects a CONFIRM-only payload without re-authentication", async () => {
    mockReauth.mockResolvedValueOnce(false);
    await expect(requireHighRiskStepUp(ADMIN, PLATFORM_ACTIONS.SUSPEND_TENANT, STEP_UP)).rejects.toThrow(
      "PLATFORM_STEP_UP_REQUIRED",
    );
    expect(mockReauth).toHaveBeenCalledWith(ADMIN, STEP_UP.password, STEP_UP.mfaCode);
    expect(mockRecordAudit).toHaveBeenCalledWith(
      "PLATFORM_HIGH_RISK_DENIED",
      ADMIN.platformAdminId,
      expect.objectContaining({ reason: "reauthentication_failed" }),
    );
  });

  it("requireHighRiskStepUp rejects the wrong confirmation string before re-auth", async () => {
    await expect(
      requireHighRiskStepUp(ADMIN, PLATFORM_ACTIONS.SUSPEND_TENANT, { ...STEP_UP, confirmation: "yes" }),
    ).rejects.toThrow("PLATFORM_STEP_UP_REQUIRED");
    expect(mockReauth).not.toHaveBeenCalled();
    expect(mockRecordAudit).toHaveBeenCalledWith(
      "PLATFORM_HIGH_RISK_DENIED",
      ADMIN.platformAdminId,
      expect.objectContaining({ reason: "explicit_confirmation_required" }),
    );
  });

  it("requireHighRiskStepUp succeeds only after confirmation plus password and TOTP", async () => {
    await expect(requireHighRiskStepUp(ADMIN, PLATFORM_ACTIONS.SUSPEND_TENANT, STEP_UP)).resolves.toBeUndefined();
    expect(mockReauth).toHaveBeenCalledWith(ADMIN, "correct-password", "123456");
  });
});
