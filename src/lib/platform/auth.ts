import "server-only";

import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { decryptPlatformSecret } from "./crypto";
import { verifyTotp } from "./mfa";
import { createPlatformSession } from "./session";

export async function authenticatePlatformAdmin(
  email: string,
  password: string,
  mfaCode: string,
  auditContext?: { ipAddress?: string; userAgent?: string },
) {
  const normalizedEmail = email.trim().toLowerCase();
  const admin = await db.platformAdmin.findUnique({ where: { email: normalizedEmail } });

  if (!admin || admin.status !== "ACTIVE" || !admin.mfaEnabled) {
    await recordPlatformAudit("PLATFORM_LOGIN_FAILED", null, { email: normalizedEmail, reason: "invalid_account" }, auditContext);
    return null;
  }

  if (!(await verifyPassword(password, admin.passwordHash))) {
    await recordPlatformAudit("PLATFORM_LOGIN_FAILED", admin.id, { reason: "invalid_credentials" }, auditContext);
    return null;
  }

  let secret: string;
  try {
    secret = decryptPlatformSecret(admin.mfaSecretEncrypted);
  } catch {
    await recordPlatformAudit("PLATFORM_LOGIN_FAILED", admin.id, { reason: "mfa_configuration_error" }, auditContext);
    return null;
  }

  if (!verifyTotp(secret, mfaCode)) {
    await recordPlatformAudit("PLATFORM_LOGIN_FAILED", admin.id, { reason: "invalid_mfa" }, auditContext);
    return null;
  }

  const session = await createPlatformSession(admin.id);
  await recordPlatformAudit("PLATFORM_LOGIN_SUCCEEDED", admin.id, { roleCode: admin.roleCode }, auditContext);
  return { ...session, platformAdminId: admin.id, roleCode: admin.roleCode };
}

export async function recordPlatformAudit(
  action: string,
  platformAdminId: string | null,
  metadata: Record<string, unknown> = {},
  context?: { ipAddress?: string; userAgent?: string },
) {
  await db.platformAuditLog.create({
    data: {
      action,
      entityType: "PLATFORM",
      platformAdminId,
      metadata,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    },
  });
}
