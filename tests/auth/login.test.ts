import { db } from "@/lib/db";
import { authenticateStaff } from "@/lib/auth/login";

jest.mock("@/lib/db", () => ({
  db: {
    $transaction: jest.fn(),
    authRateLimit: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));
jest.mock("@/lib/auth/password", () => ({
  verifyPassword: jest.fn(async () => true),
}));
jest.mock("@/lib/auth/session", () => ({
  createSession: jest.fn(async () => ({ token: "test-token", expiresAt: new Date() })),
}));

const mockDb = db as typeof db & {
  $transaction: jest.Mock;
  authRateLimit: { findUnique: jest.Mock; upsert: jest.Mock; update: jest.Mock };
  user: { findUnique: jest.Mock };
};

const ACTIVE_USER = {
  id: "user-1",
  status: "ACTIVE",
  passwordHash: "scrypt:test-salt:test-key",
  memberships: [{ clinicId: "clinic-1", role: { code: "ADMIN" } }],
};

describe("authenticateStaff", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.authRateLimit.findUnique.mockResolvedValue(null);
    mockDb.authRateLimit.upsert.mockResolvedValue(undefined);
    mockDb.authRateLimit.update.mockResolvedValue(undefined);
    mockDb.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({ authRateLimit: mockDb.authRateLimit }),
    );
    mockDb.user.findUnique.mockResolvedValue(ACTIVE_USER);
  });

  it("authenticates a valid staff member under the rate limit", async () => {
    const session = await authenticateStaff("admin@example.com", "correct-password", "203.0.113.1");
    expect(session?.clinicId).toBe("clinic-1");
    expect(session?.roleCode).toBe("ADMIN");
  });

  it("rejects the sixth login attempt for the same email within the window", async () => {
    mockDb.authRateLimit.findUnique
      .mockResolvedValueOnce({ attempts: 4, windowStartedAt: new Date(), blockedUntil: null })
      .mockResolvedValueOnce({ attempts: 5, windowStartedAt: new Date(), blockedUntil: new Date(Date.now() + 60_000) });

    await expect(
      authenticateStaff("admin@example.com", "correct-password", "203.0.113.1"),
    ).rejects.toThrow("LOGIN_RATE_LIMITED");

    expect(mockDb.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects the twenty-first login attempt from the same IP within the window", async () => {
    mockDb.authRateLimit.findUnique.mockResolvedValueOnce({
      attempts: 20,
      windowStartedAt: new Date(),
      blockedUntil: new Date(Date.now() + 60_000),
    });

    await expect(
      authenticateStaff("admin@example.com", "correct-password", "203.0.113.1"),
    ).rejects.toThrow("LOGIN_RATE_LIMITED");

    expect(mockDb.user.findUnique).not.toHaveBeenCalled();
  });

  it("scopes the email rate-limit bucket to the normalized email, not the IP", async () => {
    await authenticateStaff("Admin@Example.com", "correct-password", "203.0.113.1");

    const emailBucketCalls = mockDb.authRateLimit.findUnique.mock.calls.filter(
      ([arg]) => arg.where.keyType_keyHash.keyType === "LOGIN_EMAIL",
    );
    expect(emailBucketCalls).toHaveLength(1);
  });
});