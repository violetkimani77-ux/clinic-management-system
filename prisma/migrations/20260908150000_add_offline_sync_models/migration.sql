-- Offline-first sync persistence for tenant-scoped clinic devices.
-- Sync tables intentionally keep tenant/user/device IDs as scalar values so
-- routing can evolve with the tenant datastore abstraction without coupling
-- pooled, bridge, and silo deployments to one physical foreign-key layout.

CREATE TYPE "DeviceStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "SyncOperationType" AS ENUM ('CREATE', 'UPDATE', 'DELETE');
CREATE TYPE "SyncOperationStatus" AS ENUM ('PENDING', 'PROCESSED', 'REJECTED', 'CONFLICT');
CREATE TYPE "SyncConflictStatus" AS ENUM ('OPEN', 'RESOLVED', 'REJECTED');

CREATE TABLE "Device" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "name" TEXT,
  "status" "DeviceStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastSeenAt" TIMESTAMP(3),
  "lastSyncAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Device_clinicId_deviceId_key" ON "Device"("clinicId", "deviceId");
CREATE INDEX "Device_clinicId_status_idx" ON "Device"("clinicId", "status");
CREATE INDEX "Device_userId_status_idx" ON "Device"("userId", "status");

CREATE TABLE "SyncOperation" (
  "id" TEXT NOT NULL,
  "operationId" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "operationType" "SyncOperationType" NOT NULL,
  "status" "SyncOperationStatus" NOT NULL DEFAULT 'PENDING',
  "payload" JSONB NOT NULL,
  "expectedVersion" INTEGER,
  "entityVersion" INTEGER,
  "clientCreatedAt" TIMESTAMP(3) NOT NULL,
  "serverReceivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "result" JSONB,
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SyncOperation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SyncOperation_operationId_key" ON "SyncOperation"("operationId");
CREATE INDEX "SyncOperation_clinicId_deviceId_createdAt_idx" ON "SyncOperation"("clinicId", "deviceId", "createdAt");
CREATE INDEX "SyncOperation_clinicId_status_createdAt_idx" ON "SyncOperation"("clinicId", "status", "createdAt");
CREATE INDEX "SyncOperation_clinicId_entityType_entityId_createdAt_idx" ON "SyncOperation"("clinicId", "entityType", "entityId", "createdAt");

CREATE TABLE "SyncCursor" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "cursor" TEXT NOT NULL DEFAULT '0',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SyncCursor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SyncCursor_clinicId_deviceId_key" ON "SyncCursor"("clinicId", "deviceId");

CREATE TABLE "SyncChange" (
  "sequence" BIGSERIAL NOT NULL,
  "operationId" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "operationType" "SyncOperationType" NOT NULL,
  "payload" JSONB NOT NULL,
  "entityVersion" INTEGER NOT NULL,
  "serverCreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SyncChange_pkey" PRIMARY KEY ("sequence")
);

CREATE UNIQUE INDEX "SyncChange_operationId_key" ON "SyncChange"("operationId");
CREATE INDEX "SyncChange_clinicId_sequence_idx" ON "SyncChange"("clinicId", "sequence");
CREATE INDEX "SyncChange_clinicId_entityType_entityId_sequence_idx" ON "SyncChange"("clinicId", "entityType", "entityId", "sequence");

CREATE TABLE "SyncConflict" (
  "id" TEXT NOT NULL,
  "operationId" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "expectedVersion" INTEGER,
  "actualVersion" INTEGER,
  "clientPayload" JSONB NOT NULL,
  "serverPayload" JSONB,
  "status" "SyncConflictStatus" NOT NULL DEFAULT 'OPEN',
  "resolution" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "SyncConflict_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SyncConflict_clinicId_status_createdAt_idx" ON "SyncConflict"("clinicId", "status", "createdAt");
CREATE INDEX "SyncConflict_clinicId_entityType_entityId_idx" ON "SyncConflict"("clinicId", "entityType", "entityId");
CREATE INDEX "SyncConflict_deviceId_status_idx" ON "SyncConflict"("deviceId", "status");
