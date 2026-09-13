import "server-only";

import { db } from "@/lib/db";
import { verifyPassword } from "./password";
import { createSession } from "./session";
import { consumeRateLimit } from "./rate-limit";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
// Looser IP bound catches distributed guessing across many accounts; the
// tighter per-email bound stops guessing against one account from any IP.
const LOGIN_IP_LIMIT = { keyType: "LOGIN_IP", windowMs: LOGIN_WINDOW_MS, limit: 20 };
const LOGIN_EMAIL_LIMIT = { keyType: "LOGIN_EMAIL", windowMs: LOGIN_WINDOW_MS, limit: 5 };

/**
 * Authenticates a staff account and creates a clinic-scoped session.
 *
 * The caller is responsible for setting the returned token in the secure
 * session cookie. A generic failure is returned so login cannot reveal
 * whether an email exists or whether its password was incorrect.
 */
export async function authenticateStaff(email: string, password: string, ipAddress: string | null) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!(await consumeRateLimit(LOGIN_IP_LIMIT, ipAddress))) {
    throw new Error("LOGIN_RATE_LIMITED");
  } 
  if (!(await consumeRateLimit(LOGIN_EMAIL_LIMIT, normalizedEmail))) {
    throw new Error("LOGIN_RATE_LIMITED");
  }

  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      memberships: {
        where: { role: { code: { in: ["ADMIN", "PHARMACY", "ACCOUNTS"] } } },
        include: { role: true },
      },
    },
  });

  if (!user || user.status !== "ACTIVE") return null;
  if (!(await verifyPassword(password, user.passwordHash))) return null;

  const membership = user.memberships[0];
  if (!membership) return null;

  const session = await createSession(user.id, membership.clinicId);

  return {
    ...session,
    clinicId: membership.clinicId,
    userId: user.id,
    roleCode: membership.role.code,
  };
}
