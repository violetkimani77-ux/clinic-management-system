jest.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: jest.fn() },
    mfaChallenge: { create: jest.fn() },
  },
}));

jest.mock("@/lib/auth/password", () => ({ verifyPassword: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ createSession: jest.fn() }));
jest.mock("@/lib/auth/security", () => ({
  checkLoginSecurity: jest.fn(),
  GENERIC_AUTH_ERROR: "Unable to sign in.",
  recordFailedLogin: jest.fn(),
  recordSuccessfulPasswordLogin: jest.fn(),
}));
jest.mock("@/lib/auth/mfa", () => ({
  createMfaChallengeToken: jest.fn(() => "challenge-token"),
  hashMfaChallengeToken: jest.fn(() => "challenge-hash"),
  getMfaChallengeExpiry: jest.fn(() => new Date(Date.now() + 300_000)),
}));

const { authenticateStaff } = require("@/lib/auth/login") as typeof import("@/lib/auth/login");
const { db } = require("@/lib/db") as typeof import("@/lib/db");
const { createSession } = require("@/lib/auth/session") as typeof import("@/lib/auth/session");
const {
  checkLoginSecurity,
  recordFailedLogin,
  recordSuccessfulPasswordLogin,
} = require("@/lib/auth/security") as typeof import("@/lib/auth/security");
const { verifyPassword } = require("@/lib/auth/password") as typeof import("@/lib/auth/password");

const context = { ipAddress: "127.0.0.1", userAgent: "jest" };

function makeUser() {
  return {
    id: "user-1",
    email: "staff@example.com",
    passwordHash: "hash",
    status: "ACTIVE",
    mfaEnabled: false,
    mfaSecretEncrypted: null as string | null,
    memberships: [
      { clinicId: "clinic-a", role: { code: "ADMIN" }, clinic: { id: "clinic-a", name: "Clinic A", code: "A" } },
      { clinicId: "clinic-b", role: { code: "PHARMACY" }, clinic: { id: "clinic-b", name: "Clinic B", code: "B" } },
    ],
  };
}

describe("staff login clinic context", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (checkLoginSecurity as jest.Mock).mockResolvedValue({ accountBlocked: false, ipBlocked: false });
    (verifyPassword as jest.Mock).mockResolvedValue(true);
    (createSession as jest.Mock).mockResolvedValue({ token: "session-token", expiresAt: new Date(Date.now() + 28_800_000) });
    (db.mfaChallenge.create as jest.Mock).mockResolvedValue({});
    (db.user.findUnique as jest.Mock).mockResolvedValue(makeUser());
  });

  it("requires clinic selection for multi-clinic users", async () => {
    await expect(authenticateStaff("staff@example.com", "password", context)).resolves.toEqual({
      status: "clinic_selection_required",
      clinics: [
        { clinicId: "clinic-a", clinicName: "Clinic A", clinicCode: "A", roleCode: "ADMIN" },
        { clinicId: "clinic-b", clinicName: "Clinic B", clinicCode: "B", roleCode: "PHARMACY" },
      ],
    });
    expect(createSession).not.toHaveBeenCalled();
    expect(db.mfaChallenge.create).not.toHaveBeenCalled();
  });

  it("rejects a clinic that is not one of the authenticated user's memberships", async () => {
    await expect(
      authenticateStaff("staff@example.com", "password", context, "clinic-z"),
    ).resolves.toEqual({ status: "failure", error: "Unable to sign in." });
    expect(createSession).not.toHaveBeenCalled();
    expect(db.mfaChallenge.create).not.toHaveBeenCalled();
    expect(recordFailedLogin).toHaveBeenCalledWith("user-1", "staff@example.com", context);
  });

  it("binds the session to the explicitly selected clinic", async () => {
    await expect(
      authenticateStaff("staff@example.com", "password", context, "clinic-b"),
    ).resolves.toMatchObject({
      status: "success",
      session: { clinicId: "clinic-b", userId: "user-1", roleCode: "PHARMACY" },
    });
    expect(createSession).toHaveBeenCalledWith("user-1", "clinic-b");
  });

  it("binds an MFA challenge to the selected clinic", async () => {
    const user = makeUser();
    user.mfaEnabled = true;
    user.mfaSecretEncrypted = "encrypted-secret";
    (db.user.findUnique as jest.Mock).mockResolvedValue(user);

    await expect(
      authenticateStaff("staff@example.com", "password", context, "clinic-b"),
    ).resolves.toEqual({ status: "mfa_required", challengeToken: "challenge-token" });

    expect(db.mfaChallenge.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "user-1", clinicId: "clinic-b", tokenHash: "challenge-hash" }),
    });
    expect(createSession).not.toHaveBeenCalled();
    expect(recordSuccessfulPasswordLogin).toHaveBeenCalledWith("user-1", "staff@example.com", context, true);
    expect(recordFailedLogin).not.toHaveBeenCalled();
  });
});
