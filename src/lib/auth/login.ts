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

export type LoginClinicOption = {
  clinicId: string;
  clinicName: string;
  clinicCode: string;
  roleCode: string;
};

export type StaffLoginResult =
  | { status: "failure"; error: typeof GENERIC_AUTH_ERROR }
  | { status: "success"; session: Awaited<ReturnType<typeof createSession>> & { clinicId: string; userId: string; roleCode: string } }
  | { status: "mfa_required"; challengeToken: string }
  | { status: "clinic_selection_required"; clinics: LoginClinicOption[] };

/**
 * Authenticates a staff account and either creates a clinic-scoped session,
 * issues a clinic-bound MFA challenge, or requires explicit clinic selection.
 * Clinic memberships are never exposed before the password is verified.
 */
export async function authenticateStaff(
  email: string,
  password: string,
  context: AuthAttemptContext,
  requestedClinicId?: string,
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
        include: { role: true, clinic: true },
        orderBy: { createdAt: "asc" },
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

  if (user.memberships.length === 0) {
    await recordFailedLogin(normalizedEmail, context);
    return { status: "failure", error: GENERIC_AUTH_ERROR };
  }

  if (user.memberships.length > 1 && !requestedClinicId) {
    return {
      status: "clinic_selection_required",
      clinics: user.memberships.map((membership) => ({
        clinicId: membership.clinicId,
        clinicName: membership.clinic.name,
        clinicCode: membership.clinic.code,
        roleCode: membership.role.code,
      })),
    };
  }

  const membership = requestedClinicId
    ? user.memberships.find((candidate) => candidate.clinicId === requestedClinicId)
    : user.memberships[0];

  if (!membership) {
    return { status: "failure", error: GENERIC_AUTH_ERROR };
  }

  if (user.mfaEnabled) {
    if (!user.mfaSecretEncrypted) {
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
