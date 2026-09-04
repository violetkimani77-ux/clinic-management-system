import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { PermissionCode } from "./permissions";
import type { AuthContext } from "./authorization";

export const SESSION_COOKIE = "cms_session";

// The absolute lifetime limits how long a stolen session can remain useful,
// while the idle timeout protects unattended clinic workstations.
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const SESSION_IDLE_TIMEOUT_SECONDS = 60 * 30;

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
 * A session is valid only when its token exists, has not exceeded either the
 * absolute lifetime or idle timeout, its user is active, and the user still
 * has a membership in the session's clinic. Timeout enforcement stays on the
 * server because browser timers can be bypassed or manipulated.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const now = new Date();
  const session = await db.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, name: true, status: true } } },
  });

  // Older sessions may have no lastUsedAt. Treat their creation time as the
  // activity baseline so the idle policy is enforced consistently.
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
    // Invalidate expired sessions server-side so a stale browser cookie cannot
    // be reused after the timeout. The login cookie is replaced on re-login.
    if (session) {
      await db.authSession.deleteMany({ where: { id: session.id } });
    }
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
    data: { lastUsedAt: now },
  });

  return {
    userId: session.userId,
    userName: session.user.name,
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
