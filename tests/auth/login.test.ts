import { authenticateStaff } from "@/lib/auth/login";

const findUnique = jest.fn();
const create = jest.fn();
const createSession = jest.fn();
const verifyPassword = jest.fn();
const checkLoginSecurity = jest.fn();
const recordFailedLogin = jest.fn();
const recordSuccessfulPasswordLogin = jest.fn();
const createMfaChallengeToken = jest.fn(() => "challenge-token");
const hashMfaChallengeToken = jest.fn(() => "challenge-hash");
const getMfaChallengeExpiry = jest.fn(() => new Date(Date.now() + 300_000));

jest.mock("@/lib/db", () => ({
  db: {
    user: { findUnique },
    mfaChallenge: { create },
  },
}));

jest.mock("@/lib/auth/password", () => ({ verifyPassword: (...args: unknown[]) => verifyPassword(...args) }));
jest.mock("@/lib/auth/session", () => ({ createSession: (...args: unknown[]) => createSession(...args) }));
jest.mock("@/lib/auth/security", () => ({
  checkLoginSecurity: (...args: unknown[]) => checkLoginSecurity(...args),
  GENERIC_AUTH_ERROR: "Unable to sign in.",
  recordFailedLogin: (...args: unknown[]) => recordFailedLogin(...args),
  recordSuccessfulPasswordLogin: (...args: unknown[]) => recordSuccessfulPasswordLogin(...args),
}));
jest.mock("@/lib/auth/mfa", () => ({
  createMfaChallengeToken: () => createMfaChallengeToken(),
  hashMfaChallengeToken: (...args: unknown[]) => hashMfaChallengeToken(...args),
  getMfaChallengeExpiry: () => getMfaChallengeExpiry(),
}));

const context = { ipAddress: "127.0.0.1", userAgent: "jest" };

function makeUser() {
  return {
    id: "user-1",
    email: "staff@example.com",
    passwordHash: "hash",
    status: "ACTIVE",
    mfaEnabled: false,
    mfaSecretEncrypted: null,
    memberships: [
      { clinicId: "clinic-a", role: { code: "ADMIN" }, clinic: { id: "clinic-a", name: "Clinic A", code: "A" } },
      { clinicId: "clinic-b", role: { code: "PHARMACY" }, clinic: { id: "clinic-b", name: "Clinic B", code: "B" } },
    ],
  };
}

describe("staff login clinic context", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    checkLoginSecurity.mockResolvedValue({ accountBlocked: false, ipBlocked: false });
    verifyPassword.mockResolvedValue(true);
    createSession.mockResolvedValue({ token: "session-token", expiresAt: new Date(Date.now() + 28_800_000) });
    create.mockResolvedValue({});
    findUnique.mockResolvedValue(makeUser());
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
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a clinic that is not one of the authenticated user's memberships", async () => {
    await expect(
      authenticateStaff("staff@example.com", "password", context, "clinic-z"),
    ).resolves.toEqual({ status: "failure", error: "Unable to sign in." });
    expect(createSession).not.toHaveBeenCalled();
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
    findUnique.mockResolvedValue(user);

    await expect(
      authenticateStaff("staff@example.com", "password", context, "clinic-b"),
    ).resolves.toEqual({ status: "mfa_required", challengeToken: "challenge-token" });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "user-1", clinicId: "clinic-b", tokenHash: "challenge-hash" }),
    });
    expect(createSession).not.toHaveBeenCalled();
  });
});
