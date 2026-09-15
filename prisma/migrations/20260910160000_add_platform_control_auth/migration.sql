CREATE TABLE "PlatformAdmin" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "mfaSecretEncrypted" TEXT NOT NULL,
  "mfaEnabled" BOOLEAN NOT NULL DEFAULT true,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "roleCode" TEXT NOT NULL DEFAULT 'PLATFORM_ADMIN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformAdmin_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlatformAdmin_status_check" CHECK ("status" IN ('ACTIVE','SUSPENDED','DISABLED')),
  CONSTRAINT "PlatformAdmin_roleCode_check" CHECK ("roleCode" IN ('PLATFORM_ADMIN','PLATFORM_OPERATOR','PLATFORM_AUDITOR'))
);

CREATE UNIQUE INDEX "PlatformAdmin_email_key" ON "PlatformAdmin"("email");
CREATE INDEX "PlatformAdmin_status_idx" ON "PlatformAdmin"("status");
CREATE INDEX "PlatformAdmin_roleCode_idx" ON "PlatformAdmin"("roleCode");

CREATE TABLE "PlatformSession" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "platformAdminId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  "mfaVerifiedAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "PlatformSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlatformSession_platformAdminId_fkey" FOREIGN KEY ("platformAdminId") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PlatformSession_tokenHash_key" ON "PlatformSession"("tokenHash");
CREATE INDEX "PlatformSession_platformAdminId_expiresAt_idx" ON "PlatformSession"("platformAdminId", "expiresAt");
CREATE INDEX "PlatformSession_expiresAt_idx" ON "PlatformSession"("expiresAt");

CREATE TABLE "PlatformAuditLog" (
  "id" TEXT NOT NULL,
  "platformAdminId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformAuditLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlatformAuditLog_platformAdminId_fkey" FOREIGN KEY ("platformAdminId") REFERENCES "PlatformAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "PlatformAuditLog_platformAdminId_createdAt_idx" ON "PlatformAuditLog"("platformAdminId", "createdAt");
CREATE INDEX "PlatformAuditLog_entityType_entityId_createdAt_idx" ON "PlatformAuditLog"("entityType", "entityId", "createdAt");
CREATE INDEX "PlatformAuditLog_action_createdAt_idx" ON "PlatformAuditLog"("action", "createdAt");
