import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { PermissionCode } from "./permissions";
import type { AuthContext } from "./authorization";

export const SESSION_COOKIE = "cms_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createSession(userId: string, clinicId: string) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await db.authSession.create({
    data: { tokenHash: hashToken(token), userId, clinicId, expiresAt },
  });

  return { token, expiresAt };
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, status: true } } },
  });

  if (!session || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") {
    return null;
  }

  const membership = await db.membership.findUnique({
    where: { clinicId_userId: { clinicId: session.clinicId, userId: session.userId } },
    include: {
      role: {
        include: {
          permissions: { include: { permission: { select: { code: true } } } },
        },
      },
    },
  });

  if (!membership) return null;

  const permissions = new Set(
    membership.role.permissions.map((item) => item.permission.code as PermissionCode),
  );

  await db.authSession.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() },
  });

  return { userId: session.userId, clinicId: session.clinicId, permissions };
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await db.authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  cookieStore.delete(SESSION_COOKIE);
}
