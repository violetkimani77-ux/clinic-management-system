import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { authenticatePlatformAdmin, reauthenticatePlatformAdmin } from "@/lib/platform/auth";
import { encryptPlatformSecret } from "@/lib/platform/crypto";
import { generateTotp } from "@/lib/platform/mfa";
import { createPlatformSession } from "@/lib/platform/session";
import type { PlatformAuthContext } from "@/lib/platform/session";

jest.mock("@/lib/db", () => ({
  db: {
    authRateLimit: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    platformAdmin: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    platformAuditLog: {
      create: jest.fn(),
    },
  },
}));
jest.mock("@/lib/auth/password", () => ({
  verifyPassword: jest.fn(async () => true),
}));
jest.mock("@/lib/platform/session", () => ({
  createPlatformSession: jest.fn(async () => ({ token: "platform-token", expiresAt: new Date("2030-01-01") })),
}));

const mockDb = db as typeof db & {
  authRateLimit: { findMany: jest.Mock; findUnique: jest.Mock; upsert: jest.Mock; deleteMany: jest.Mock };
  platformAdmin: { findUnique: jest.Mock; updateMany: jest.Mock };
  platformAuditLog: { create: jest.Mock };
};
const mockVerifyPassword = verifyPassword as jest.Mock;
const mockCreateSession = createPlatformSession as jest.Mock;

const KEY = "cd".repeat(32);
const SECRET = "JBSWY3DPEHPK3PXP";
const AUTH: PlatformAuthContext = {
  platformAdminId: "admin-1",
  email: "ops@example.com",
  name: "Ops",
  roleCode: "PLATFORM_ADMIN",
};

function auditAction() {
  return mockDb.platformAuditLog.create.mock.calls.at(-1)?.[0]?.data?.action;
}

function auditReason() {
  return mockDb.platformAuditLog.create.mock.calls.at(-1)?.[0]?.data?.metadata?.reason;
}

describe("authenticatePlatformAdmin", () => {
  const previous = process.env.PLATFORM_AUTH_ENCRYPTION_KEY;
  let admin: {
    id: string;
    email: string;
    status: string;
    mfaEnabled: boolean;
    passwordHash: string;
    mfaSecretEncrypted: string;
    roleCode: string;
    lastUsedTotpCounter: number | null;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PLATFORM_AUTH_ENCRYPTION_KEY = KEY;
    admin = {
      id: "admin-1",
      email: "ops@example.com",
      status: "ACTIVE",
      mfaEnabled: true,
      passwordHash: "scrypt:test-salt:test-key",
      mfaSecretEncrypted: encryptPlatformSecret(SECRET),
      roleCode: "PLATFORM_ADMIN",
      lastUsedTotpCounter: null,
    };
    mockDb.authRateLimit.findMany.mockResolvedValue([]);
    mockDb.authRateLimit.findUnique.mockResolvedValue(null);
    mockDb.authRateLimit.upsert.mockResolvedValue(undefined);
    mockDb.authRateLimit.deleteMany.mockResolvedValue({ count: 1 });
    mockDb.platformAdmin.findUnique.mockResolvedValue(admin);
    mockDb.platformAdmin.updateMany.mockResolvedValue({ count: 1 });
    mockDb.platformAuditLog.create.mockResolvedValue({ id: "audit-1" });
    mockVerifyPassword.mockResolvedValue(true);
    mockCreateSession.mockResolvedValue({ token: "platform-token", expiresAt: new Date("2030-01-01") });
  });

  afterEach(() => {
    process.env.PLATFORM_AUTH_ENCRYPTION_KEY = previous;
  });

  it("returns a session when password and a fresh TOTP succeed", async () => {
    const result = await authenticatePlatformAdmin("Ops@Example.com", "correct-password", generateTotp(SECRET));
    expect(result).toEqual(expect.objectContaining({ token: "platform-token", platformAdminId: "admin-1", roleCode: "PLATFORM_ADMIN" }));
    expect(mockDb.platformAdmin.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "admin-1" }),
    }));
    expect(auditAction()).toBe("PLATFORM_LOGIN_SUCCEEDED");
  });

  it("rejects a captured TOTP whose counter has already been consumed", async () => {
    mockDb.platformAdmin.updateMany.mockResolvedValueOnce({ count: 0 });
    const result = await authenticatePlatformAdmin("ops@example.com", "correct-password", generateTotp(SECRET));
    expect(result).toBeNull();
    expect(mockCreateSession).not.toHaveBeenCalled();
    expect(auditAction()).toBe("PLATFORM_LOGIN_FAILED");
    expect(auditReason()).toBe("mfa_replay");
  });

  it("rejects an invalid authenticator code", async () => {
    const result = await authenticatePlatformAdmin("ops@example.com", "correct-password", "000000");
    expect(result).toBeNull();
    expect(mockDb.platformAdmin.updateMany).not.toHaveBeenCalled();
    expect(auditReason()).toBe("invalid_mfa");
  });

  it("rejects a blocked email without looking up the account", async () => {
    mockDb.authRateLimit.findMany.mockResolvedValueOnce([{ blockedUntil: new Date(Date.now() + 60_000) }]);
    const result = await authenticatePlatformAdmin("ops@example.com", "correct-password", generateTotp(SECRET));
    expect(result).toBeNull();
    expect(mockDb.platformAdmin.findUnique).not.toHaveBeenCalled();
    expect(auditAction()).toBe("PLATFORM_LOGIN_BLOCKED");
  });

  it("rejects a missing, inactive, or MFA-disabled account", async () => {
    mockDb.platformAdmin.findUnique.mockResolvedValueOnce(null);
    expect(await authenticatePlatformAdmin("missing@example.com", "x", "123456")).toBeNull();
    expect(auditReason()).toBe("invalid_account");
  });

  it("rejects a wrong password", async () => {
    mockVerifyPassword.mockResolvedValueOnce(false);
    expect(await authenticatePlatformAdmin("ops@example.com", "nope", generateTotp(SECRET))).toBeNull();
    expect(auditReason()).toBe("invalid_credentials");
  });
});

describe("reauthenticatePlatformAdmin", () => {
  const previous = process.env.PLATFORM_AUTH_ENCRYPTION_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PLATFORM_AUTH_ENCRYPTION_KEY = KEY;
    mockDb.platformAdmin.findUnique.mockResolvedValue({
      id: "admin-1",
      status: "ACTIVE",
      mfaEnabled: true,
      passwordHash: "scrypt:test-salt:test-key",
      mfaSecretEncrypted: encryptPlatformSecret(SECRET),
      roleCode: "PLATFORM_ADMIN",
    });
    mockDb.platformAdmin.updateMany.mockResolvedValue({ count: 1 });
    mockDb.platformAuditLog.create.mockResolvedValue({ id: "audit-1" });
    mockVerifyPassword.mockResolvedValue(true);
  });

  afterEach(() => {
    process.env.PLATFORM_AUTH_ENCRYPTION_KEY = previous;
  });

  it("succeeds with a fresh password and TOTP and consumes the counter", async () => {
    const ok = await reauthenticatePlatformAdmin(AUTH, "correct-password", generateTotp(SECRET));
    expect(ok).toBe(true);
    expect(mockDb.platformAdmin.updateMany).toHaveBeenCalled();
    expect(auditAction()).toBe("PLATFORM_STEP_UP_SUCCEEDED");
  });

  it("rejects a replayed TOTP during step-up", async () => {
    mockDb.platformAdmin.updateMany.mockResolvedValueOnce({ count: 0 });
    const ok = await reauthenticatePlatformAdmin(AUTH, "correct-password", generateTotp(SECRET));
    expect(ok).toBe(false);
    expect(auditReason()).toBe("mfa_replay");
  });

  it("rejects a wrong password during step-up", async () => {
    mockVerifyPassword.mockResolvedValueOnce(false);
    const ok = await reauthenticatePlatformAdmin(AUTH, "wrong", generateTotp(SECRET));
    expect(ok).toBe(false);
    expect(auditReason()).toBe("invalid_credentials");
  });
});
