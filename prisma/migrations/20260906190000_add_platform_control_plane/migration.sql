CREATE TYPE "PlatformUserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DISABLED');
CREATE TYPE "PlatformRole" AS ENUM ('OWNER', 'ADMIN', 'SUPPORT', 'BILLING');
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "SubscriptionStatus" AS ENUM ('SETUP', 'TRIAL', 'ACTIVE', 'GRACE_PERIOD', 'PAST_DUE', 'SUSPENDED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "TenantIsolationMode" AS ENUM ('POOL', 'BRIDGE_DATABASE', 'SILO_DATABASE');
CREATE TYPE "TenantDataStoreStatus" AS ENUM ('PROVISIONING', 'MIGRATING', 'HEALTHY', 'DEGRADED', 'SUSPENDED', 'RETIRED');
CREATE TYPE "TenantResidencyPolicy" AS ENUM ('KENYA_ONLY', 'KENYA_SERVING_COPY');
CREATE TYPE "TransferAssessmentStatus" AS ENUM ('NOT_REQUIRED', 'REQUIRED', 'PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "MaintenanceStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

CREATE TABLE "PlatformUser" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "PlatformRole" NOT NULL DEFAULT 'SUPPORT',
  "status" "PlatformUserStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformUser_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformUser_email_key" ON "PlatformUser"("email");
CREATE INDEX "PlatformUser_status_role_idx" ON "PlatformUser"("status", "role");

CREATE TABLE "ClinicQuote" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
  "currency" TEXT NOT NULL DEFAULT 'KES',
  "quotedAmount" DECIMAL(14,2),
  "validUntil" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClinicQuote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClinicQuote_clinicId_status_idx" ON "ClinicQuote"("clinicId", "status");
CREATE INDEX "ClinicQuote_status_validUntil_idx" ON "ClinicQuote"("status", "validUntil");

CREATE TABLE "ClinicSubscription" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "quoteId" TEXT,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'SETUP',
  "activatedAt" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "graceEndsAt" TIMESTAMP(3),
  "suspendedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClinicSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClinicSubscription_clinicId_key" ON "ClinicSubscription"("clinicId");
CREATE INDEX "ClinicSubscription_status_currentPeriodEnd_idx" ON "ClinicSubscription"("status", "currentPeriodEnd");

CREATE TABLE "TenantDataStore" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "isolationMode" "TenantIsolationMode" NOT NULL DEFAULT 'POOL',
  "status" "TenantDataStoreStatus" NOT NULL DEFAULT 'HEALTHY',
  "residencyPolicy" "TenantResidencyPolicy" NOT NULL DEFAULT 'KENYA_ONLY',
  "transferAssessmentStatus" "TransferAssessmentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  "connectionRef" TEXT,
  "databaseName" TEXT,
  "schemaName" TEXT,
  "provider" TEXT,
  "country" TEXT NOT NULL DEFAULT 'KE',
  "region" TEXT,
  "backupCountry" TEXT NOT NULL DEFAULT 'KE',
  "backupRegion" TEXT,
  "allowedTransferCountries" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "transferAssessmentRef" TEXT,
  "migrationVersion" TEXT,
  "provisionedAt" TIMESTAMP(3),
  "lastHealthCheckAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantDataStore_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TenantDataStore_clinicId_key" ON "TenantDataStore"("clinicId");
CREATE INDEX "TenantDataStore_isolationMode_status_idx" ON "TenantDataStore"("isolationMode", "status");
CREATE INDEX "TenantDataStore_region_status_idx" ON "TenantDataStore"("region", "status");
CREATE INDEX "TenantDataStore_residencyPolicy_transferAssessmentStatus_idx" ON "TenantDataStore"("residencyPolicy", "transferAssessmentStatus");

CREATE TABLE "MaintenanceWindow" (
  "id" TEXT NOT NULL,
  "status" "MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "expectedEndAt" TIMESTAMP(3),
  "maintenanceType" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "lastUpdatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaintenanceWindow_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MaintenanceWindow_status_startsAt_endsAt_idx" ON "MaintenanceWindow"("status", "startsAt", "endsAt");

INSERT INTO "ClinicSubscription" ("id", "clinicId", "status", "activatedAt", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), "id", 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Clinic";

INSERT INTO "TenantDataStore" ("id", "clinicId", "isolationMode", "status", "residencyPolicy", "transferAssessmentStatus", "country", "backupCountry", "provisionedAt", "lastHealthCheckAt", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), "id", 'POOL', 'HEALTHY', 'KENYA_ONLY', 'NOT_REQUIRED', 'KE', 'KE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Clinic";
