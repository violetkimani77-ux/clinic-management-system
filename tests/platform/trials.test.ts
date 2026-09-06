import { Prisma } from "@prisma/client";
import { createClinicTrial } from "@/lib/platform/trials";

const mockTransaction = jest.fn();
const mockDb = {
  $transaction: mockTransaction,
  authRateLimit: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock("@/lib/db", () => ({ db: mockDb }));
jest.mock("@/lib/auth/password", () => ({
  hashPassword: jest.fn(async () => "scrypt:test-salt:test-key"),
}));

describe("createClinicTrial", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.authRateLimit.findUnique.mockResolvedValue(null);
    mockDb.authRateLimit.upsert.mockResolvedValue(undefined);
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
      authRateLimit: mockDb.authRateLimit,
      user: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: "user-1", email: "admin@example.com" }) },
      role: { findUnique: jest.fn().mockResolvedValue({ id: "role-1" }) },
      clinic: { create: jest.fn().mockResolvedValue({ id: "clinic-1", code: "HALI-ABCD1234" }) },
      membership: { create: jest.fn().mockResolvedValue(undefined) },
      clinicSubscription: { create: jest.fn().mockResolvedValue(undefined) },
      tenantDataStore: { create: jest.fn().mockResolvedValue(undefined) },
    }));
  });

  it("creates a four-day Kenya-only pooled trial", async () => {
    const result = await createClinicTrial({
      clinicName: "Example Clinic",
      administratorName: "Admin User",
      email: "Admin@Example.com",
      password: "a-secure-password",
      ipAddress: "127.0.0.1",
    });

    expect(result.email).toBe("admin@example.com");
    expect(result.clinicId).toBe("clinic-1");
    expect(result.trialEndsAt.getTime() - Date.now()).toBeGreaterThan(3.9 * 24 * 60 * 60 * 1000);
  });

  it("retries only Prisma P2002 clinic-code collisions", async () => {
    const clinicCreate = jest
      .fn()
      .mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "6.19.3",
      }))
      .mockResolvedValueOnce({ id: "clinic-1", code: "HALI-ABCD1234" });

    mockTransaction.mockImplementationOnce(async (callback: (tx: unknown) => unknown) => callback({
      authRateLimit: mockDb.authRateLimit,
      user: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: "user-1", email: "admin@example.com" }) },
      role: { findUnique: jest.fn().mockResolvedValue({ id: "role-1" }) },
      clinic: { create: clinicCreate },
      membership: { create: jest.fn().mockResolvedValue(undefined) },
      clinicSubscription: { create: jest.fn().mockResolvedValue(undefined) },
      tenantDataStore: { create: jest.fn().mockResolvedValue(undefined) },
    }));

    await createClinicTrial({
      clinicName: "Example Clinic",
      administratorName: "Admin User",
      email: "admin@example.com",
      password: "a-secure-password",
      ipAddress: "127.0.0.1",
    });

    expect(clinicCreate).toHaveBeenCalledTimes(2);
  });
});
