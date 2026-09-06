import "server-only";

import { db } from "@/lib/db";
import {
  createMfaChallengeToken,
  getMfaChallengeExpiry,
  hashMfaChallengeToken,
} from "./mfa";
import { verifyPassword } from "./password";
import { createSession } from "./session";
import {
  checkLoginSecurity,
  GENERIC_AUTH_ERROR,
  recordFailedLogin,
  recordSuccessfulPasswordLogin,
  type AuthAttemptContext,
} from "./security";

export type StaffLoginResult =
  | { status: "failure"; error: typeof GENERIC_AUTH_ERROR }
  | { status: "success"; session: Awaited<ReturnType<typeof createSession>> & { clinicId: string; userId: string; roleCode: string } }
  | { status: "mfa_required"; challengeToken: string };

/**
 * Authenticates a staff account and either creates a clinic-scoped session or
 * issues a short-lived MFA challenge. No full session exists before MFA passes.
 */
export async function authenticateStaff(
  email: string,
  password: string,
  context: AuthAttemptContext,
): Promise<StaffLoginResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const security = await checkLoginSecurity(normalizedEmail, context);

  if (security.accountBlocked || security.ipBlocked) {
    return { status: "failure", error: GENERIC_AUTH_ERROR };
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

  if (!user || user.status !== "ACTIVE") {
    await recordFailedLogin(normalizedEmail, context);
    return { status: "failure", error: GENERIC_AUTH_ERROR };
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    await recordFailedLogin(normalizedEmail, context);
    return { status: "failure", error: GENERIC_AUTH_ERROR };
  }

  const membership = user.memberships[0];
  if (!membership) {
    await recordFailedLogin(normalizedEmail, context);
    return { status: "failure", error: GENERIC_AUTH_ERROR };
  }

  if (user.mfaEnabled) {
    if (!user.mfaSecretEncrypted) {
      // Fail closed if an account is marked MFA-enabled without a usable secret.
      await recordFailedLogin(normalizedEmail, context);
      return { status: "failure", error: GENERIC_AUTH_ERROR };
    }

    const challengeToken = createMfaChallengeToken();
    await db.mfaChallenge.create({
      data: {
        tokenHash: hashMfaChallengeToken(challengeToken),
        userId: user.id,
        clinicId: membership.clinicId,
        expiresAt: getMfaChallengeExpiry(),
      },
    });

    await recordSuccessfulPasswordLogin(user.id, normalizedEmail, context, true);
    return { status: "mfa_required", challengeToken };
  }

  const session = await createSession(user.id, membership.clinicId);
  await recordSuccessfulPasswordLogin(user.id, normalizedEmail, context, false);

  return {
    status: "success",
    session: {
      ...session,
      clinicId: membership.clinicId,
      userId: user.id,
      roleCode: membership.role.code,
    },
  };
}
