import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { PlatformAdminRole, PlatformAdminStatus } from "@prisma/client";

export const PLATFORM_SESSION_COOKIE = "heri_platform_session";
const SESSION_TTL_SECONDS = 60 * 60 * 2;
const SESSION_IDLE_TIMEOUT_SECONDS = 60 * 15;
const SESSION_ROTATION_SECONDS = 60 * 10;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function token(): string {
  return randomBytes(32).toString("base64url");
}

export type PlatformAuthContext = {
  platformAdminId: string;
  email: string;
  name: string;
  roleCode: PlatformAdminRole;
};

export async function createPlatformSession(platformAdminId: string) {
  const raw = token();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await db.platformSession.create({
    data: {
      tokenHash: hashToken(raw),
      platformAdminId,
      expiresAt,
      mfaVerifiedAt: new Date(),
    },
  });
  return { token: raw, expiresAt };
}

export async function getPlatformAuthContext(): Promise<PlatformAuthContext | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PLATFORM_SESSION_COOKIE)?.value;
  if (!raw) return null;

  const now = new Date();
  const session = await db.platformSession.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { platformAdmin: true },
  });

  if (!session) return null;
  const lastActivity = session.lastUsedAt ?? session.createdAt;
  const idleDeadline = new Date(lastActivity.getTime() + SESSION_IDLE_TIMEOUT_SECONDS * 1000);
  const adminStatus: PlatformAdminStatus = session.platformAdmin.status;

  if (
    session.revokedAt ||
    session.expiresAt <= now ||
    idleDeadline <= now ||
    adminStatus !== "ACTIVE" ||
    !session.platformAdmin.mfaEnabled
  ) {
    await db.platformSession.deleteMany({ where: { id: session.id } });
    cookieStore.delete(PLATFORM_SESSION_COOKIE);
    return null;
  }

  const shouldRotate = now.getTime() - session.createdAt.getTime() >= SESSION_ROTATION_SECONDS * 1000;
  if (shouldRotate) {
    const rotated = await createPlatformSession(session.platformAdmin.id);
    await db.platformSession.update({
      where: { id: session.id },
      data: { revokedAt: now, lastUsedAt: now },
    });
    cookieStore.set(PLATFORM_SESSION_COOKIE, rotated.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/platform",
      expires: rotated.expiresAt,
    });
  } else {
    await db.platformSession.update({ where: { id: session.id }, data: { lastUsedAt: now } });
  }

  return {
    platformAdminId: session.platformAdmin.id,
    email: session.platformAdmin.email,
    name: session.platformAdmin.name,
    roleCode: session.platformAdmin.roleCode,
  };
}

export async function clearPlatformSession(): Promise<void> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PLATFORM_SESSION_COOKIE)?.value;
  if (raw) {
    await db.platformSession.updateMany({
      where: { tokenHash: hashToken(raw), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  cookieStore.delete(PLATFORM_SESSION_COOKIE);
}
