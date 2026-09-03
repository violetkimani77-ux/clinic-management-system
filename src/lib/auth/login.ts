import "server-only";

import { db } from "@/lib/db";
import { verifyPassword } from "./password";
import { createSession } from "./session";

/**
 * Authenticates a staff account and creates a clinic-scoped session.
 *
 * The caller is responsible for setting the returned token in the secure
 * session cookie. A generic failure is returned so login cannot reveal
 * whether an email exists or whether its password was incorrect.
 */
export async function authenticateStaff(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

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
