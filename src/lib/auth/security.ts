import "server-only";

import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";

const ACCOUNT_FAILURE_LIMIT = 5;
const ACCOUNT_FAILURE_WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_LOCKOUT_MS = 15 * 60 * 1000;
const IP_FAILURE_LIMIT = 20;
const IP_FAILURE_WINDOW_MS = 15 * 60 * 1000;
const IP_BLOCK_MS = 15 * 60 * 1000;

export const GENERIC_AUTH_ERROR = "Invalid email or password.";

export type AuthAttemptContext = {
  ipAddress: string | null;
  userAgent: string | null;
};

export type LoginSecurityState = {
  accountBlocked: boolean;
  ipBlocked: boolean;
};

function hashRateLimitKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeIp(ipAddress: string | null): string {
  return ipAddress?.trim() || "unknown";
}

async function consumeRateLimit(
  tx: Prisma.TransactionClient,
  keyType: string,
  key: string,
  now: Date,
  limit: number,
  windowMs: number,
  blockMs: number,
): Promise<boolean> {
  const keyHash = hashRateLimitKey(key);
  const existing = await tx.authRateLimit.findUnique({
    where: { keyType_keyHash: { keyType, keyHash } },
  });

  if (!existing || now.getTime() - existing.windowStartedAt.getTime() >= windowMs) {
    await tx.authRateLimit.upsert({
      where: { keyType_keyHash: { keyType, keyHash } },
      create: {
        keyType,
        keyHash,
        attempts: 1,
        windowStartedAt: now,
        blockedUntil: null,
      },
      update: {
        attempts: 1,
        windowStartedAt: now,
        blockedUntil: null,
      },
    });
    return false;
  }

  if (existing.blockedUntil && existing.blockedUntil > now) return true;

  const attempts = existing.attempts + 1;
  await tx.authRateLimit.update({
    where: { keyType_keyHash: { keyType, keyHash } },
    data: {
      attempts,
      blockedUntil: attempts >= limit ? new Date(now.getTime() + blockMs) : null,
    },
  });

  return attempts >= limit;
}

async function isRateLimited(
  tx: Prisma.TransactionClient,
  keyType: string,
  key: string,
  now: Date,
): Promise<boolean> {
  const keyHash = hashRateLimitKey(key);
  const existing = await tx.authRateLimit.findUnique({
    where: { keyType_keyHash: { keyType, keyHash } },
    select: { blockedUntil: true, windowStartedAt: true },
  });

  if (!existing) return false;
  if (now.getTime() - existing.windowStartedAt.getTime() >= IP_FAILURE_WINDOW_MS) return false;
  return Boolean(existing.blockedUntil && existing.blockedUntil > now);
}

export async function checkLoginSecurity(
  email: string,
  context: AuthAttemptContext,
): Promise<LoginSecurityState> {
  const normalizedEmail = email.trim().toLowerCase();
  const ipAddress = normalizeIp(context.ipAddress);
  const now = new Date();

  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { email: normalizedEmail },
      select: { lockedUntil: true },
    });

    return {
      accountBlocked: Boolean(user?.lockedUntil && user.lockedUntil > now),
      ipBlocked: await isRateLimited(tx, "LOGIN_IP", ipAddress, now),
    };
  });
}

export async function recordFailedLogin(
  email: string,
  context: AuthAttemptContext,
): Promise<LoginSecurityState> {
  const normalizedEmail = email.trim().toLowerCase();
  const ipAddress = normalizeIp(context.ipAddress);
  const now = new Date();

  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        name: true,
        lockedUntil: true,
        failedLoginAttempts: true,
        memberships: {
          select: { clinicId: true },
          take: 1,
        },
      },
    });

    const ipBlocked = await consumeRateLimit(
      tx,
      "LOGIN_IP",
      ipAddress,
      now,
      IP_FAILURE_LIMIT,
      IP_FAILURE_WINDOW_MS,
      IP_BLOCK_MS,
    );

    let accountBlocked = Boolean(user?.lockedUntil && user.lockedUntil > now);
    if (user && !accountBlocked) {
      const accountKey = `${user.id}:${normalizedEmail}`;
      const accountRateLimited = await consumeRateLimit(
        tx,
        "LOGIN_ACCOUNT",
        accountKey,
        now,
        ACCOUNT_FAILURE_LIMIT,
        ACCOUNT_FAILURE_WINDOW_MS,
        ACCOUNT_LOCKOUT_MS,
      );
      const failedLoginAttempts = user.failedLoginAttempts + 1;
      const shouldLock = accountRateLimited || failedLoginAttempts >= ACCOUNT_FAILURE_LIMIT;
      const lockedUntil = shouldLock ? new Date(now.getTime() + ACCOUNT_LOCKOUT_MS) : null;

      await tx.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: shouldLock ? 0 : failedLoginAttempts,
          lockedUntil,
        },
      });

      accountBlocked = shouldLock;

      const clinicId = user.memberships[0]?.clinicId;
      if (clinicId) {
        await recordAuditEvent(
          {
            userId: user.id,
            userName: user.name,
            clinicId,
            roleCode: "AUTH",
            permissions: new Set(),
          },
          {
            action: shouldLock ? "AUTH_LOGIN_LOCKED" : "AUTH_LOGIN_FAILED",
            entityType: "User",
            entityId: user.id,
            metadata: { reason: "invalid_credentials" },
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
          },
          tx,
        );
      }
    }

    return { accountBlocked, ipBlocked };
  });
}

export async function recordSuccessfulPasswordLogin(
  userId: string,
  context: AuthAttemptContext,
  mfaRequired: boolean,
): Promise<void> {
  const now = new Date();

  await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        memberships: { select: { clinicId: true }, take: 1 },
      },
    });

    if (!user) return;

    await tx.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    const accountKey = `${user.id}:success`;
    await tx.authRateLimit.deleteMany({
      where: {
        keyType: "LOGIN_ACCOUNT",
        keyHash: hashRateLimitKey(`${user.id}:${user.id}`),
      },
    });

    const clinicId = user.memberships[0]?.clinicId;
    if (!clinicId) return;

    await recordAuditEvent(
      {
        userId: user.id,
        userName: user.name,
        clinicId,
        roleCode: "AUTH",
        permissions: new Set(),
      },
      {
        action: mfaRequired ? "AUTH_PASSWORD_VERIFIED_MFA_REQUIRED" : "AUTH_LOGIN_SUCCESS",
        entityType: "User",
        entityId: user.id,
        metadata: { mfaRequired },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      tx,
    );
  });
}

export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip")?.trim() || null;
}

export function getUserAgent(request: Request): string | null {
  return request.headers.get("user-agent")?.trim() || null;
}
