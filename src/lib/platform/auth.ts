import "server-only";

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { decryptPlatformSecret } from "./crypto";
import { verifyTotp } from "./mfa";
import { createPlatformSession } from "./session";

const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const BLOCK_MS = 15 * 60 * 1000;

function rateKey(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

async function isRateLimited(email: string, ipAddress?: string) {
  const now = new Date();
  const keys = [
    { keyType: "PLATFORM_EMAIL", keyHash: rateKey(email) },
    ...(ipAddress ? [{ keyType: "PLATFORM_IP", keyHash: rateKey(ipAddress) }] : []),
  ];
  const records = await db.authRateLimit.findMany({ where: { OR: keys } });
  return records.some((record) => record.blockedUntil && record.blockedUntil > now);
}

async function registerFailure(email: string, ipAddress?: string) {
  const now = new Date();
  const keys = [
    { keyType: "PLATFORM_EMAIL", keyHash: rateKey(email) },
    ...(ipAddress ? [{ keyType: "PLATFORM_IP", keyHash: rateKey(ipAddress) }] : []),
  ];
  for (const key of keys) {
    const existing = await db.authRateLimit.findUnique({ where: { keyType_keyHash: key } });
    const windowExpired = !existing || now.getTime() - existing.windowStartedAt.getTime() >= RATE_WINDOW_MS;
    const attempts = windowExpired ? 1 : existing.attempts + 1;
    await db.authRateLimit.upsert({
      where: { keyType_keyHash: key },
      create: {
        keyType: key.keyType,
        keyHash: key.keyHash,
        attempts,
        windowStartedAt: now,
        blockedUntil: attempts >= MAX_ATTEMPTS ? new Date(now.getTime() + BLOCK_MS) : null,
      },
      update: {
        attempts,
        windowStartedAt: windowExpired ? now : existing!.windowStartedAt,
        blockedUntil: attempts >= MAX_ATTEMPTS ? new Date(now.getTime() + BLOCK_MS) : null,
      },
    });
  }
}

async function clearFailures(email: string, ipAddress?: string) {
  const keys = [
    { keyType: "PLATFORM_EMAIL", keyHash: rateKey(email) },
    ...(ipAddress ? [{ keyType: "PLATFORM_IP", keyHash: rateKey(ipAddress) }] : []),
  ];
  await db.authRateLimit.deleteMany({ where: { OR: keys } });
}

export async function authenticatePlatformAdmin(
  email: string,
  password: string,
  mfaCode: string,
  auditContext?: { ipAddress?: string; userAgent?: string },
) {
  const normalizedEmail = email.trim().toLowerCase();

  if (await isRateLimited(normalizedEmail, auditContext?.ipAddress)) {
    await recordPlatformAudit("PLATFORM_LOGIN_BLOCKED", null, { email: normalizedEmail, reason: "rate_limited" }, auditContext);
    return null;
  }

  const admin = await db.platformAdmin.findUnique({ where: { email: normalizedEmail } });

  if (!admin || admin.status !== "ACTIVE" || !admin.mfaEnabled) {
    await registerFailure(normalizedEmail, auditContext?.ipAddress);
    await recordPlatformAudit("PLATFORM_LOGIN_FAILED", null, { email: normalizedEmail, reason: "invalid_account" }, auditContext);
    return null;
  }

  if (!(await verifyPassword(password, admin.passwordHash))) {
    await registerFailure(normalizedEmail, auditContext?.ipAddress);
    await recordPlatformAudit("PLATFORM_LOGIN_FAILED", admin.id, { reason: "invalid_credentials" }, auditContext);
    return null;
  }

  let secret: string;
  try {
    secret = decryptPlatformSecret(admin.mfaSecretEncrypted);
  } catch {
    await registerFailure(normalizedEmail, auditContext?.ipAddress);
    await recordPlatformAudit("PLATFORM_LOGIN_FAILED", admin.id, { reason: "mfa_configuration_error" }, auditContext);
    return null;
  }

  if (!verifyTotp(secret, mfaCode)) {
    await registerFailure(normalizedEmail, auditContext?.ipAddress);
    await recordPlatformAudit("PLATFORM_LOGIN_FAILED", admin.id, { reason: "invalid_mfa" }, auditContext);
    return null;
  }

  await clearFailures(normalizedEmail, auditContext?.ipAddress);
  const session = await createPlatformSession(admin.id);
  await recordPlatformAudit("PLATFORM_LOGIN_SUCCEEDED", admin.id, { roleCode: admin.roleCode }, auditContext);
  return { ...session, platformAdminId: admin.id, roleCode: admin.roleCode };
}

export async function recordPlatformAudit(
  action: string,
  platformAdminId: string | null,
  metadata: Record<string, unknown> = {},
  context?: { ipAddress?: string; userAgent?: string },
) {
  await db.platformAuditLog.create({
    data: {
      action,
      entityType: "PLATFORM",
      platformAdminId,
      metadata: metadata as Prisma.InputJsonValue,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    },
  });
}
