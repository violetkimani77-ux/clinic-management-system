import { randomBytes } from "node:crypto";
import { Prisma, SubscriptionStatus, TenantDataStoreStatus, TenantIsolationMode, TenantResidencyPolicy, TransferAssessmentStatus, UserStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { consumeRateLimit } from "@/lib/auth/rate-limit";

const TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000;
const TRIAL_WINDOW_MS = 60 * 60 * 1000;
const TRIAL_ATTEMPT_LIMIT = 5;
const TRIAL_RATE_LIMIT = { keyType: "TRIAL_IP", windowMs: TRIAL_WINDOW_MS, limit: TRIAL_ATTEMPT_LIMIT };

export type CreateTrialInput = {
  clinicName: string;
  administratorName: string;
  email: string;
  password: string;
  ipAddress: string | null;
};

export type CreateTrialResult = {
  clinicId: string;
  clinicCode: string;
  email: string;
  trialEndsAt: Date;
};

function normalize(value: string) {
  return value.trim();
}

function createClinicCode() {
  return `HALI-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function createClinicTrial(input: CreateTrialInput): Promise<CreateTrialResult> {
  const clinicName = normalize(input.clinicName);
  const administratorName = normalize(input.administratorName);
  const email = input.email.trim().toLowerCase();

  if (clinicName.length < 2 || clinicName.length > 120) throw new Error("INVALID_CLINIC_NAME");
  if (administratorName.length < 2 || administratorName.length > 120) throw new Error("INVALID_ADMINISTRATOR_NAME");
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) throw new Error("INVALID_EMAIL");
  if (input.password.length < 12 || input.password.length > 128) throw new Error("INVALID_PASSWORD");

  if (!(await consumeRateLimit(TRIAL_RATE_LIMIT, input.ipAddress))) {
    throw new Error("TRIAL_RATE_LIMITED");
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DURATION_MS);

  return db.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) throw new Error("TRIAL_EMAIL_ALREADY_REGISTERED");

    const adminRole = await tx.role.findUnique({ where: { code: "ADMIN" } });
    if (!adminRole) throw new Error("ADMIN_ROLE_NOT_CONFIGURED");

    let clinic;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        clinic = await tx.clinic.create({
          data: {
            name: clinicName,
            code: createClinicCode(),
          },
        });
        break;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          continue;
        }
        throw error;
      }
    }

    if (!clinic) throw new Error("TRIAL_CLINIC_CREATION_FAILED");

    const administrator = await tx.user.create({
      data: {
        email,
        name: administratorName,
        passwordHash,
        status: UserStatus.ACTIVE,
      },
    });

    await tx.membership.create({
      data: {
        clinicId: clinic.id,
        userId: administrator.id,
        roleId: adminRole.id,
      },
    });

    await tx.clinicSubscription.create({
      data: {
        clinicId: clinic.id,
        status: SubscriptionStatus.TRIAL,
        activatedAt: now,
        currentPeriodEnd: trialEndsAt,
        notes: "Self-service 14-day trial",
      },
    });

    await tx.tenantDataStore.create({
      data: {
        clinicId: clinic.id,
        isolationMode: TenantIsolationMode.POOL,
        status: TenantDataStoreStatus.HEALTHY,
        residencyPolicy: TenantResidencyPolicy.KENYA_ONLY,
        transferAssessmentStatus: TransferAssessmentStatus.NOT_REQUIRED,
        country: "KE",
        backupCountry: "KE",
        provisionedAt: now,
        lastHealthCheckAt: now,
      },
    });

    return {
      clinicId: clinic.id,
      clinicCode: clinic.code,
      email: administrator.email,
      trialEndsAt,
    };
  });
}
