import { PlatformAdminRole } from "@prisma/client";
import { db } from "@/lib/db";
import { recordPlatformAudit, reauthenticatePlatformAdmin } from "@/lib/platform/auth";
import {
  getPlatformTenantControl,
  reactivatePlatformTenant,
  suspendPlatformTenant,
} from "@/lib/platform/tenant-control";
import type { PlatformAuthContext } from "@/lib/platform/session";
import type { PlatformStepUp } from "@/lib/platform/authorization";

jest.mock("@/lib/db", () => ({
  db: {
    $executeRawUnsafe: jest.fn(),
    $queryRawUnsafe: jest.fn(),
  },
}));
jest.mock("@/lib/platform/auth", () => ({
  recordPlatformAudit: jest.fn(async () => undefined),
  reauthenticatePlatformAdmin: jest.fn(async () => true),
}));

const mockDb = db as typeof db & {
  $executeRawUnsafe: jest.Mock;
  $queryRawUnsafe: jest.Mock;
};
const mockRecordAudit = recordPlatformAudit as jest.Mock;
const mockReauth = reauthenticatePlatformAdmin as jest.Mock;

const ADMIN: PlatformAuthContext = {
  platformAdminId: "admin-1",
  email: "ops@example.com",
  name: "Ops",
  roleCode: PlatformAdminRole.PLATFORM_ADMIN,
};
const AUDITOR: PlatformAuthContext = { ...ADMIN, roleCode: PlatformAdminRole.PLATFORM_AUDITOR };
const STEP_UP: PlatformStepUp = { confirmation: "CONFIRM", password: "correct-password", mfaCode: "123456" };
const CONTROL = {
  clinicId: "clinic-1",
  status: "ACTIVE" as const,
  suspensionReason: null,
  suspendedAt: null,
  updatedAt: new Date(),
};

describe("platform tenant control", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReauth.mockResolvedValue(true);
    mockDb.$executeRawUnsafe.mockResolvedValue(1);
    mockDb.$queryRawUnsafe.mockResolvedValue([CONTROL]);
  });

  it("lets a permitted role read tenant control using bound SQL parameters", async () => {
    const result = await getPlatformTenantControl("clinic-1", ADMIN);
    expect(result.clinicId).toBe("clinic-1");
    const insert = mockDb.$executeRawUnsafe.mock.calls[0];
    expect(insert[0]).toContain("INSERT INTO \"PlatformTenantControl\"");
    expect(insert[1]).toBe("clinic-1");
    expect(insert[0]).not.toContain("clinic-1");
    const select = mockDb.$queryRawUnsafe.mock.calls[0];
    expect(select[1]).toBe("clinic-1");
    expect(select[0]).not.toContain("clinic-1");
  });

  it("forbids an auditor from suspending a tenant", async () => {
    await expect(suspendPlatformTenant("clinic-1", "nonpayment of invoice", STEP_UP, AUDITOR)).rejects.toThrow(
      "PLATFORM_FORBIDDEN",
    );
    expect(mockDb.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it("rejects a short suspension reason after step-up succeeds", async () => {
    await expect(suspendPlatformTenant("clinic-1", "no", STEP_UP, ADMIN)).rejects.toThrow(
      "PLATFORM_SUSPENSION_REASON_INVALID",
    );
  });

  it("suspends a tenant with bound clinicId and reason after real step-up", async () => {
    await suspendPlatformTenant("clinic-1", "non-payment of subscription", STEP_UP, ADMIN);
    expect(mockReauth).toHaveBeenCalledWith(ADMIN, "correct-password", "123456");
    const update = mockDb.$executeRawUnsafe.mock.calls.find((call) => String(call[0]).includes("SUSPENDED"));
    expect(update?.[1]).toBe("clinic-1");
    expect(update?.[2]).toBe("non-payment of subscription");
    expect(String(update?.[0])).not.toContain("clinic-1");
    expect(String(update?.[0])).not.toContain("non-payment");
    expect(mockRecordAudit).toHaveBeenCalledWith(
      "PLATFORM_TENANT_SUSPENDED",
      ADMIN.platformAdminId,
      expect.objectContaining({ clinicId: "clinic-1" }),
    );
  });

  it("does not suspend when step-up re-authentication fails", async () => {
    mockReauth.mockResolvedValueOnce(false);
    await expect(suspendPlatformTenant("clinic-1", "non-payment of subscription", STEP_UP, ADMIN)).rejects.toThrow(
      "PLATFORM_STEP_UP_REQUIRED",
    );
    expect(mockDb.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it("reactivates a tenant with bound SQL after step-up", async () => {
    await reactivatePlatformTenant("clinic-1", STEP_UP, ADMIN);
    const update = mockDb.$executeRawUnsafe.mock.calls.find((call) => String(call[0]).includes("'ACTIVE'"));
    expect(update?.[1]).toBe("clinic-1");
    expect(mockRecordAudit).toHaveBeenCalledWith("PLATFORM_TENANT_REACTIVATED", ADMIN.platformAdminId, { clinicId: "clinic-1" });
  });
});
