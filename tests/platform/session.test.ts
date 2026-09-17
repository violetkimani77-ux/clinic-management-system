import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  PLATFORM_SESSION_COOKIE,
  clearPlatformSession,
  createPlatformSession,
  getPlatformAuthContext,
} from "@/lib/platform/session";

const cookieStore = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
};

jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => cookieStore),
}));
jest.mock("@/lib/db", () => ({
  db: {
    platformSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

const mockDb = db as typeof db & {
  platformSession: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    deleteMany: jest.Mock;
  };
};
const mockCookies = cookies as jest.Mock;

function sessionRecord(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    id: "session-1",
    tokenHash: "hash",
    createdAt: new Date(now - 60_000),
    lastUsedAt: new Date(now - 30_000),
    expiresAt: new Date(now + 60 * 60 * 1000),
    revokedAt: null,
    platformAdmin: {
      id: "admin-1",
      email: "ops@example.com",
      name: "Ops",
      roleCode: "PLATFORM_ADMIN",
      status: "ACTIVE",
      mfaEnabled: true,
    },
    ...overrides,
  };
}

describe("platform session", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCookies.mockResolvedValue(cookieStore);
    cookieStore.get.mockReturnValue({ value: "raw-token" });
    mockDb.platformSession.create.mockResolvedValue({ id: "session-1" });
    mockDb.platformSession.findUnique.mockResolvedValue(sessionRecord());
    mockDb.platformSession.update.mockResolvedValue(undefined);
    mockDb.platformSession.updateMany.mockResolvedValue({ count: 1 });
    mockDb.platformSession.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("createPlatformSession stores a SHA-256 token hash, not the raw token", async () => {
    const created = await createPlatformSession("admin-1");
    expect(created.token).toEqual(expect.any(String));
    expect(created.token.length).toBeGreaterThan(20);
    const storedHash = mockDb.platformSession.create.mock.calls[0][0].data.tokenHash;
    expect(storedHash).toMatch(/^[0-9a-f]{64}$/);
    expect(storedHash).not.toBe(created.token);
  });

  it("returns the admin context for a valid session and refreshes lastUsedAt", async () => {
    const auth = await getPlatformAuthContext();
    expect(auth).toEqual({
      platformAdminId: "admin-1",
      email: "ops@example.com",
      name: "Ops",
      roleCode: "PLATFORM_ADMIN",
    });
    expect(mockDb.platformSession.update).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: { lastUsedAt: expect.any(Date) },
    });
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("returns null when the cookie is missing", async () => {
    cookieStore.get.mockReturnValueOnce(undefined);
    expect(await getPlatformAuthContext()).toBeNull();
    expect(mockDb.platformSession.findUnique).not.toHaveBeenCalled();
  });

  it("destroys an idle session", async () => {
    mockDb.platformSession.findUnique.mockResolvedValueOnce(
      sessionRecord({ lastUsedAt: new Date(Date.now() - 16 * 60 * 1000), createdAt: new Date(Date.now() - 20 * 60 * 1000) }),
    );
    expect(await getPlatformAuthContext()).toBeNull();
    expect(mockDb.platformSession.deleteMany).toHaveBeenCalledWith({ where: { id: "session-1" } });
    expect(cookieStore.delete).toHaveBeenCalledWith(PLATFORM_SESSION_COOKIE);
  });

  it("destroys a session whose admin is no longer active or MFA-enabled", async () => {
    mockDb.platformSession.findUnique.mockResolvedValueOnce(
      sessionRecord({ platformAdmin: { id: "admin-1", email: "ops@example.com", name: "Ops", roleCode: "PLATFORM_ADMIN", status: "SUSPENDED", mfaEnabled: true } }),
    );
    expect(await getPlatformAuthContext()).toBeNull();
    expect(mockDb.platformSession.deleteMany).toHaveBeenCalled();
  });

  it("rotates the cookie when the session is older than 10 minutes", async () => {
    mockDb.platformSession.findUnique.mockResolvedValueOnce(
      sessionRecord({ createdAt: new Date(Date.now() - 11 * 60 * 1000), lastUsedAt: new Date() }),
    );
    const auth = await getPlatformAuthContext();
    expect(auth?.platformAdminId).toBe("admin-1");
    expect(mockDb.platformSession.create).toHaveBeenCalled();
    expect(mockDb.platformSession.update).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: { revokedAt: expect.any(Date), lastUsedAt: expect.any(Date) },
    });
    expect(cookieStore.set).toHaveBeenCalledWith(
      PLATFORM_SESSION_COOKIE,
      expect.any(String),
      expect.objectContaining({ httpOnly: true, path: "/platform", sameSite: "lax" }),
    );
  });

  it("clearPlatformSession revokes the hashed token and deletes the cookie", async () => {
    await clearPlatformSession();
    expect(mockDb.platformSession.updateMany).toHaveBeenCalledWith({
      where: { tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/), revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(cookieStore.delete).toHaveBeenCalledWith(PLATFORM_SESSION_COOKIE);
  });
});
