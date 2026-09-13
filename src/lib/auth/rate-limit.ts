import "server-only";

import { createHash } from "node:crypto";
import { db } from "@/lib/db";

export type RateLimitConfig = {
  /** Discriminates independent limiter buckets sharing the AuthRateLimit table, e.g. "LOGIN_IP". */
  keyType: string;
  windowMs: number;
  limit: number;
};

export function hashRateLimitKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Fixed-window rate limiter backed by the shared AuthRateLimit table.
 *
 * Returns true if this attempt is allowed (and records it), false if the
 * caller is currently blocked. A stale window is reset rather than carried
 * forward, matching a standard fixed-window limiter.
 */
export async function consumeRateLimit(config: RateLimitConfig, rawKey: string | null): Promise<boolean> {
  const keyHash = hashRateLimitKey(rawKey?.trim() || "unknown");
  const now = new Date();

  return db.$transaction(async (tx) => {
    const existing = await tx.authRateLimit.findUnique({
      where: { keyType_keyHash: { keyType: config.keyType, keyHash } },
    });

    if (!existing || now.getTime() - existing.windowStartedAt.getTime() >= config.windowMs) {
      await tx.authRateLimit.upsert({
        where: { keyType_keyHash: { keyType: config.keyType, keyHash } },
        create: { keyType: config.keyType, keyHash, attempts: 1, windowStartedAt: now },
        update: { attempts: 1, windowStartedAt: now, blockedUntil: null },
      });
      return true;
    }

    if (existing.blockedUntil && existing.blockedUntil > now) return false;

    const attempts = existing.attempts + 1;
    await tx.authRateLimit.update({
      where: { keyType_keyHash: { keyType: config.keyType, keyHash } },
      data: {
        attempts,
        blockedUntil: attempts >= config.limit ? new Date(now.getTime() + config.windowMs) : null,
      },
    });

    return attempts < config.limit;
  });
}