import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { PermissionCode } from "./permissions";
import type { AuthContext } from "./authorization";

export const SESSION_COOKIE = "cms_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

type MembershipPermission = {
  permission: {
    code: string;
  };
};

/** Hashes session tokens so the database never stores the bearer token itself. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a cryptographically random opaque token for a new server session. */
export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Persists a session for a specific user and clinic.
 *
 * The returned token must be placed in a secure HttpOnly cookie by the login
 * flow. Keeping persistence separate from cookie handling makes the session
 * service easier to test and keeps authentication concerns explicit.
 */
export async function createSession(userId: string, clinicId: string) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await db.authSession.create({
    data: { tokenHash: hashToken(token), userId, clinicId, expiresAt },
  });

  return { token, expiresAt };
}

/**
 * Resolves the current request to a server-side authorization context.
 *
 * A session is valid only when its token exists, has not expired, its user is
 * active, and the user still has a membership in the session's clinic.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, status: true } } },
  });

  if (
    !session ||
    session.expiresAt <= new Date() ||
    session.user.status !== "ACTIVE"
  ) {
    return null;
  }

  // Membership is checked on every context resolution so removing a user's
  // clinic access takes effect without waiting for the session to expire.
  // The explicit select keeps the permission query narrow; the relation type
  // below also prevents Prisma inference gaps from becoming implicit any.
  const membership = await db.membership.findUnique({
    where: {
      clinicId_userId: {
        clinicId: session.clinicId,
        userId: session.userId,
      },
    },
    select: {
      role: {
        select: {
          code: true,
          permissions: {
            select: {
              permission: { select: { code: true } },
            },
          },
        },
      },
    },
  });

  if (!membership) return null;

  const permissions = new Set<PermissionCode>(
    membership.role.permissions.map(
      (item: MembershipPermission) => item.permission.code as PermissionCode,
    ),
  );

  await db.authSession.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    userId: session.userId,
    clinicId: session.clinicId,
    roleCode: membership.role.code,
    permissions,
  };
}

/**
 * Revokes the current session and removes its browser cookie.
 *
 * Deleting the server-side session makes the bearer token unusable even if a
 * stale browser still holds the cookie.
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await db.authSession.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }

  cookieStore.delete(SESSION_COOKIE);
}
