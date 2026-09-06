import "server-only";

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import {
  decryptMfaSecret,
  hashMfaChallengeToken,
  hashRecoveryCode,
  verifyTotp,
} from "./mfa";
import { createSession } from "./session";

const MFA_MAX_ATTEMPTS = 5;
const MFA_GENERIC_ERROR = "Invalid authentication code.";

export type MfaVerificationResult =
  | { status: "failure"; error: typeof MFA_GENERIC_ERROR }
  | { status: "success"; session: Awaited<ReturnType<typeof createSession>> & { clinicId: string; userId: string; roleCode: string } };

function authContext(userId: string, userName: string, clinicId: string) {
  return {
    userId,
    userName,
    clinicId,
    roleCode: "AUTH",
    permissions: new Set<never>(),
  };
}

async function auditMfaFailure(
  userId: string,
  userName: string,
  clinicId: string,
  reason: string,
  context: { ipAddress: string | null; userAgent: string | null },
  tx: Prisma.TransactionClient,
) {
  await recordAuditEvent(
    authContext(userId, userName, clinicId),
    {
      action: "AUTH_MFA_FAILED",
      entityType: "User",
      entityId: userId,
      metadata: { reason },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    },
    tx,
  );
}

export async function verifyMfaLogin(
  challengeToken: string,
  code: string,
  context: { ipAddress: string | null; userAgent: string | null },
): Promise<MfaVerificationResult> {
  if (!challengeToken || !code) {
    return { status: "failure", error: MFA_GENERIC_ERROR };
  }

  const tokenHash = hashMfaChallengeToken(challengeToken);
  const normalizedCode = code.replace(/[\s-]/g, "").toUpperCase();
  const now = new Date();

  return db.$transaction(async (tx) => {
    const challenge = await tx.mfaChallenge.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            status: true,
            mfaEnabled: true,
            mfaSecretEncrypted: true,
          },
        },
      },
    });

    if (
      !challenge ||
      challenge.consumedAt ||
      challenge.expiresAt <= now ||
      challenge.attempts >= MFA_MAX_ATTEMPTS ||
      challenge.user.status !== "ACTIVE" ||
      !challenge.user.mfaEnabled ||
      !challenge.user.mfaSecretEncrypted
    ) {
      if (challenge) {
        await auditMfaFailure(
          challenge.user.id,
          challenge.user.name,
          challenge.clinicId,
          "invalid_or_expired_challenge",
          context,
          tx,
        );
      }
      return { status: "failure", error: MFA_GENERIC_ERROR };
    }

    let valid = false;
    let recoveryCodeId: string | null = null;

    try {
      const secret = decryptMfaSecret(challenge.user.mfaSecretEncrypted);
      valid = verifyTotp(secret, normalizedCode);
    } catch {
      valid = false;
    }

    if (!valid) {
      const recoveryCode = await tx.mfaRecoveryCode.findFirst({
        where: {
          userId: challenge.user.id,
          usedAt: null,
          codeHash: hashRecoveryCode(normalizedCode),
        },
        select: { id: true },
      });
      if (recoveryCode) {
        valid = true;
        recoveryCodeId = recoveryCode.id;
      }
    }

    if (!valid) {
      const updated = await tx.mfaChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
          expiresAt: { gt: now },
          attempts: { lt: MFA_MAX_ATTEMPTS },
        },
        data: { attempts: { increment: 1 } },
      });

      if (updated.count === 0) return { status: "failure", error: MFA_GENERIC_ERROR };

      await auditMfaFailure(
        challenge.user.id,
        challenge.user.name,
        challenge.clinicId,
        "invalid_code",
        context,
        tx,
      );
      return { status: "failure", error: MFA_GENERIC_ERROR };
    }

    const consumed = await tx.mfaChallenge.updateMany({
      where: {
        id: challenge.id,
        consumedAt: null,
        expiresAt: { gt: now },
        attempts: { lt: MFA_MAX_ATTEMPTS },
      },
      data: { consumedAt: now },
    });

    if (consumed.count !== 1) {
      return { status: "failure", error: MFA_GENERIC_ERROR };
    }

    if (recoveryCodeId) {
      const marked = await tx.mfaRecoveryCode.updateMany({
        where: { id: recoveryCodeId, usedAt: null },
        data: { usedAt: now },
      });
      if (marked.count !== 1) {
        return { status: "failure", error: MFA_GENERIC_ERROR };
      }
    }

    const membership = await tx.membership.findUnique({
      where: {
        clinicId_userId: {
          clinicId: challenge.clinicId,
          userId: challenge.user.id,
        },
      },
      select: { role: { select: { code: true } } },
    });

    if (!membership) {
      return { status: "failure", error: MFA_GENERIC_ERROR };
    }

    const session = await createSession(
      challenge.user.id,
      challenge.clinicId,
      tx,
    );

    await recordAuditEvent(
      authContext(challenge.user.id, challenge.user.name, challenge.clinicId),
      {
        action: recoveryCodeId ? "AUTH_MFA_RECOVERY_SUCCESS" : "AUTH_MFA_SUCCESS",
        entityType: "User",
        entityId: challenge.user.id,
        metadata: { recoveryCodeUsed: Boolean(recoveryCodeId) },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      tx,
    );

    return {
      status: "success",
      session: {
        ...session,
        clinicId: challenge.clinicId,
        userId: challenge.user.id,
        roleCode: membership.role.code,
      },
    };
  });
}
