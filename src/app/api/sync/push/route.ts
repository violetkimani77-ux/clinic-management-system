import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/session";
import { requireTenantDataStore } from "@/lib/tenant/datastore";
import { replaySyncOperation } from "@/lib/sync/idempotency";
import { applySyncDomainMutation } from "@/lib/sync/domain";
import { validateSyncPushRequest } from "@/lib/sync/validation";
import type { SyncOperation, SyncPushRequest, SyncPushResponse } from "@/lib/sync/protocol";
import { SYNC_PROTOCOL_VERSION } from "@/lib/sync/protocol";

export const runtime = "nodejs";

function errorResponse(code: string, status: number) {
  return NextResponse.json({ error: code }, { status });
}

export async function POST(request: Request) {
  const context = await getAuthContext();
  if (!context) return errorResponse("UNAUTHORIZED", 401);

  let body: SyncPushRequest;
  try {
    body = (await request.json()) as SyncPushRequest;
    validateSyncPushRequest(body);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "SYNC_INVALID_REQUEST", 400);
  }

  if (body.clinicId !== context.clinicId) return errorResponse("TENANT_ACCESS_DENIED", 403);
  try {
    await requireTenantDataStore(context.clinicId);
  } catch {
    return errorResponse("TENANT_DATASTORE_UNAVAILABLE", 503);
  }

  const device = await db.device.findUnique({ where: { clinicId_deviceId: { clinicId: context.clinicId, deviceId: body.deviceId } } });
  if (!device || device.userId !== context.userId) return errorResponse("SYNC_DEVICE_UNAUTHORIZED", 403);
  if (device.status !== "ACTIVE" || (device.expiresAt && device.expiresAt <= new Date())) return errorResponse("SYNC_DEVICE_REVOKED", 403);

  const now = new Date();
  const results = [] as SyncPushResponse["results"];

  for (const operation of body.operations as SyncOperation[]) {
    const existing = await db.syncOperation.findUnique({ where: { operationId: operation.operationId } });
    if (existing) {
      if (existing.clinicId !== context.clinicId || existing.deviceId !== body.deviceId || existing.userId !== context.userId) return errorResponse("SYNC_OPERATION_OWNERSHIP_MISMATCH", 403);
      results.push(replaySyncOperation({ operationId: existing.operationId, status: existing.status, entityVersion: existing.entityVersion ?? undefined, serverReceivedAt: existing.serverReceivedAt.toISOString(), errorCode: existing.errorCode ?? undefined }));
      continue;
    }

    try {
      const receivedAt = new Date();
      const record = await db.$transaction(async (tx) => {
        const operationRecord = await tx.syncOperation.create({
          data: {
            id: randomUUID(),
            operationId: operation.operationId,
            clinicId: context.clinicId,
            deviceId: body.deviceId,
            userId: context.userId,
            entityType: operation.entityType,
            entityId: operation.entityId,
            operationType: operation.operationType,
            status: "PENDING",
            payload: operation.payload as Prisma.InputJsonValue,
            expectedVersion: operation.expectedVersion,
            clientCreatedAt: new Date(operation.clientCreatedAt),
            serverReceivedAt: receivedAt,
          },
        });

        const existingChange = await tx.syncChange.findFirst({ where: { clinicId: context.clinicId, entityType: operation.entityType, entityId: operation.entityId }, orderBy: { sequence: "desc" } });
        const actualVersion = existingChange?.entityVersion ?? 0;

        if (operation.expectedVersion !== undefined && operation.expectedVersion !== actualVersion) {
          await tx.syncConflict.create({
            data: {
              id: randomUUID(), operationId: operation.operationId, clinicId: context.clinicId, deviceId: body.deviceId,
              entityType: operation.entityType, entityId: operation.entityId, expectedVersion: operation.expectedVersion,
              actualVersion, clientPayload: operation.payload as Prisma.InputJsonValue, serverPayload: existingChange?.payload ?? Prisma.JsonNull,
            },
          });
          return tx.syncOperation.update({ where: { id: operationRecord.id }, data: { status: "CONFLICT", processedAt: new Date(), entityVersion: actualVersion, errorCode: "SYNC_VERSION_CONFLICT" } });
        }

        await applySyncDomainMutation(tx, context, {
          entityType: operation.entityType,
          entityId: operation.entityId,
          operationType: operation.operationType,
          payload: operation.payload,
        });

        const nextVersion = actualVersion + 1;
        await tx.syncChange.create({
          data: {
            operationId: operation.operationId,
            clinicId: context.clinicId,
            entityType: operation.entityType,
            entityId: operation.entityId,
            operationType: operation.operationType,
            payload: operation.payload as Prisma.InputJsonValue,
            entityVersion: nextVersion,
          },
        });
        return tx.syncOperation.update({ where: { id: operationRecord.id }, data: { status: "PROCESSED", processedAt: new Date(), entityVersion: nextVersion } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      results.push(replaySyncOperation({ operationId: record.operationId, status: record.status, entityVersion: record.entityVersion ?? undefined, serverReceivedAt: record.serverReceivedAt.toISOString(), errorCode: record.errorCode ?? undefined }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const replay = await db.syncOperation.findUnique({ where: { operationId: operation.operationId } });
        if (replay && replay.clinicId === context.clinicId && replay.deviceId === body.deviceId && replay.userId === context.userId) {
          results.push(replaySyncOperation({ operationId: replay.operationId, status: replay.status, entityVersion: replay.entityVersion ?? undefined, serverReceivedAt: replay.serverReceivedAt.toISOString(), errorCode: replay.errorCode ?? undefined }));
          continue;
        }
      }
      return errorResponse(error instanceof Error ? error.message : "SYNC_APPLY_FAILED", 400);
    }
  }

  await db.device.update({ where: { id: device.id }, data: { lastSeenAt: now, lastSyncAt: now } });
  const response: SyncPushResponse = { protocolVersion: SYNC_PROTOCOL_VERSION, results };
  return NextResponse.json(response);
}
