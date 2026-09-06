import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { PermissionCode } from "./permissions";
import type { AuthContext } from "./authorization";

export const SESSION_COOKIE = "cms_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const SESSION_IDLE_TIMEOUT_SECONDS = 60 * 30;

type MembershipPermission = { permission: { code: string } };
type SessionClient = Prisma.TransactionClient | typeof db;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Persists a clinic-scoped session, optionally inside the caller's transaction. */
export async function createSession(userId: string, clinicId: string, client: SessionClient = db) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await client.authSession.create({
    data: { tokenHash: hashToken(token), userId, clinicId, expiresAt },
  });
  return { token, expiresAt };
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const now = new Date();
  const session = await db.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, name: true, status: true } } },
  });

  const lastActivityAt = session?.lastUsedAt ?? session?.createdAt ?? null;
  const idleDeadline = lastActivityAt
    ? new Date(lastActivityAt.getTime() + SESSION_IDLE_TIMEOUT_SECONDS * 1000)
    : null;

  if (
    !session ||
    session.expiresAt <= now ||
    (idleDeadline !== null && idleDeadline <= now) ||
    session.user.status !== "ACTIVE"
  ) {
    if (session) await db.authSession.deleteMany({ where: { id: session.id } });
    return null;
  }

  const membership = await db.membership.findUnique({
    where: { clinicId_userId: { clinicId: session.clinicId, userId: session.userId } },
    select: {
      role: {
        select: {
          code: true,
          permissions: { select: { permission: { select: { code: true } } } },
        },
      },
    },
  });

  if (!membership) {
    await db.authSession.deleteMany({ where: { id: session.id } });
    return null;
  }

  const permissions = new Set<PermissionCode>(
    membership.role.permissions.map((item: MembershipPermission) => item.permission.code as PermissionCode),
  );

  await db.authSession.update({ where: { id: session.id }, data: { lastUsedAt: now } });

  return {
    userId: session.userId,
    userName: session.user.name,
    clinicId: session.clinicId,
    roleCode: membership.role.code,
    permissions,
  };
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await db.authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  cookieStore.delete(SESSION_COOKIE);
}
