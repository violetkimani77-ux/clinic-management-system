-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TenantDataStoreStatus" AS ENUM ('SETUP', 'RESIDENCY_SELECTED', 'RESIDENCY_VALIDATED', 'PROVISIONING', 'MIGRATING', 'HEALTHY', 'DEGRADED', 'FAILED');

-- CreateEnum
CREATE TYPE "TenantIsolationMode" AS ENUM ('POOL', 'BRIDGE_DATABASE', 'SILO_DATABASE');

-- CreateEnum
CREATE TYPE "TenantResidencyPolicy" AS ENUM ('KENYA_ONLY', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "TransferAssessmentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "AuthRateLimit" (
    "id" TEXT NOT NULL,
    "keyType" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "blockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicSubscription" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClinicSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantDataStore" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "isolationMode" "TenantIsolationMode" NOT NULL,
    "status" "TenantDataStoreStatus" NOT NULL,
    "residencyPolicy" "TenantResidencyPolicy" NOT NULL,
    "transferAssessmentStatus" "TransferAssessmentStatus" NOT NULL,
    "transferAssessmentRef" TEXT,
    "country" TEXT NOT NULL,
    "backupCountry" TEXT NOT NULL,
    "provisionedAt" TIMESTAMP(3),
    "lastHealthCheckAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TenantDataStore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthRateLimit_keyType_keyHash_key" ON "AuthRateLimit"("keyType", "keyHash");
CREATE INDEX "AuthRateLimit_blockedUntil_idx" ON "AuthRateLimit"("blockedUntil");
CREATE INDEX "ClinicSubscription_clinicId_status_idx" ON "ClinicSubscription"("clinicId", "status");
CREATE INDEX "ClinicSubscription_currentPeriodEnd_idx" ON "ClinicSubscription"("currentPeriodEnd");
CREATE UNIQUE INDEX "TenantDataStore_clinicId_key" ON "TenantDataStore"("clinicId");
CREATE INDEX "TenantDataStore_status_idx" ON "TenantDataStore"("status");
CREATE INDEX "TenantDataStore_residencyPolicy_status_idx" ON "TenantDataStore"("residencyPolicy", "status");

-- AddForeignKey
ALTER TABLE "ClinicSubscription" ADD CONSTRAINT "ClinicSubscription_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TenantDataStore" ADD CONSTRAINT "TenantDataStore_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
