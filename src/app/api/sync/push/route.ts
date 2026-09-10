import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Prisma, VisitStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/session";
import { requireTenantDataStore } from "@/lib/tenant/datastore";
import { replaySyncOperation } from "@/lib/sync/idempotency";
import { validateSyncPushRequest } from "@/lib/sync/validation";
import type { SyncOperation, SyncPushRequest, SyncPushResponse } from "@/lib/sync/protocol";
import { SYNC_PROTOCOL_VERSION } from "@/lib/sync/protocol";
import type { AuthContext } from "@/lib/auth/authorization";
import { recordAuditEvent } from "@/lib/audit";

export const runtime = "nodejs";

function errorResponse(code: string, status: number) {
  return NextResponse.json({ error: code }, { status });
}

function stringValue(payload: Record<string, unknown>, key: string, required = false) {
  const value = payload[key];
  if (typeof value !== "string") {
    if (required) throw new Error("SYNC_INVALID_PAYLOAD");
    return undefined;
  }
  const trimmed = value.trim();
  if (required && !trimmed) throw new Error("SYNC_INVALID_PAYLOAD");
  return trimmed || null;
}

function dateValue(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new Error("SYNC_INVALID_PAYLOAD");
  }
  return new Date(value);
}

function applyPatientMutation(
  tx: Prisma.TransactionClient,
  context: AuthContext,
  operation: SyncOperation,
) {
  const patientNo = stringValue(operation.payload, "patientNo", true);
  const firstName = stringValue(operation.payload, "firstName", true);
  const lastName = stringValue(operation.payload, "lastName", true);
  const dateOfBirth = dateValue(operation.payload, "dateOfBirth");
  const phone = stringValue(operation.payload, "phone");
  const email = stringValue(operation.payload, "email");
  const address = stringValue(operation.payload, "address");
  const notes = stringValue(operation.payload, "notes");

  if (operation.operationType === "CREATE") {
    return tx.patient.create({
      data: {
        id: operation.entityId,
        clinicId: context.clinicId,
        patientNo: patientNo!,
        firstName: firstName!,
        lastName: lastName!,
        dateOfBirth: dateOfBirth ?? null,
        phone: phone ?? null,
        email: email ? email.toLowerCase() : null,
        address: address ?? null,
        notes: notes ?? null,
      },
      select: { id: true },
    });
  }

  if (operation.operationType === "UPDATE") {
    const existing = tx.patient.findFirst({
      where: { id: operation.entityId, clinicId: context.clinicId, archivedAt: null },
      select: { id: true },
    });

    return existing.then((patient) => {
      if (!patient) throw new Error("PATIENT_NOT_FOUND");
      return tx.patient.update({
        where: { id: patient.id },
        data: {
          patientNo: patientNo!,
          firstName: firstName!,
          lastName: lastName!,
          dateOfBirth: dateOfBirth ?? null,
          phone: phone ?? null,
          email: email ? email.toLowerCase() : null,
          address: address ?? null,
          notes: notes ?? null,
        },
        select: { id: true },
      });
    });
  }

  throw new Error("SYNC_UNSUPPORTED_ENTITY_OPERATION");
}

async function applyVisitMutation(
  tx: Prisma.TransactionClient,
  context: AuthContext,
  operation: SyncOperation,
) {
  const patientId = stringValue(operation.payload, "patientId", true);
  const notes = stringValue(operation.payload, "notes");
  const openedAt = dateValue(operation.payload, "openedAt");
  const statusValue = stringValue(operation.payload, "status");
  const status = statusValue ? (statusValue as VisitStatus) : undefined;

  if (status && !Object.values(VisitStatus).includes(status)) {
    throw new Error("SYNC_INVALID_PAYLOAD");
  }

  const patient = await tx.patient.findFirst({
    where: { id: patientId!, clinicId: context.clinicId, archivedAt: null },
    select: { id: true },
  });
  if (!patient) throw new Error("PATIENT_NOT_FOUND");

  if (operation.operationType === "CREATE") {
    return tx.visit.create({
      data: {
        id: operation.entityId,
        clinicId: context.clinicId,
        patientId: patient.id,
        status: status ?? VisitStatus.OPEN,
        openedAt: openedAt ?? new Date(),
        notes: notes ?? null,
      },
      select: { id: true },
    });
  }

  if (operation.operationType === "UPDATE") {
    const current = await tx.visit.findFirst({
      where: { id: operation.entityId, clinicId: context.clinicId },
      select: { id: true, status: true },
    });
    if (!current) throw new Error("VISIT_NOT_FOUND");

    return tx.visit.update({
      where: { id: current.id },
      data: {
        patientId: patient.id,
        ...(status ? { status } : {}),
        ...(openedAt ? { openedAt } : {}),
        ...(operation.payload.notes !== undefined ? { notes: notes ?? null } : {}),
        closedAt:
          status === VisitStatus.COMPLETED || status === VisitStatus.CANCELLED
            ? new Date()
            : status
              ? null
              : undefined,
      },
      select: { id: true },
    });
  }

  throw new Error("SYNC_UNSUPPORTED_ENTITY_OPERATION");
}

async function applyBusinessMutation(
  tx: Prisma.TransactionClient,
  context: AuthContext,
  operation: SyncOperation,
) {
  if (operation.entityType === "Patient") {
    return applyPatientMutation(tx, context, operation);
  }
  if (operation.entityType === "Visit") {
    return applyVisitMutation(tx, context, operation);
  }
  throw new Error("SYNC_UNSUPPORTED_ENTITY");
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

  const device = await db.device.findUnique({
    where: { clinicId_deviceId: { clinicId: context.clinicId, deviceId: body.deviceId } },
  });
  if (!device || device.userId !== context.userId) return errorResponse("SYNC_DEVICE_UNAUTHORIZED", 403);
  if (device.status !== "ACTIVE" || (device.expiresAt && device.expiresAt <= new Date())) {
    return errorResponse("SYNC_DEVICE_REVOKED", 403);
  }

  const now = new Date();
  const results = [] as SyncPushResponse["results"];

  for (const operation of body.operations as SyncOperation[]) {
    if (operation.userId !== context.userId) return errorResponse("SYNC_USER_MISMATCH", 403);

    const existing = await db.syncOperation.findUnique({ where: { operationId: operation.operationId } });
    if (existing) {
      if (existing.clinicId !== context.clinicId || existing.deviceId !== body.deviceId || existing.userId !== context.userId) {
        return errorResponse("SYNC_OPERATION_OWNERSHIP_MISMATCH", 403);
      }
      results.push(replaySyncOperation({
        operationId: existing.operationId,
        status: existing.status,
        entityVersion: existing.entityVersion ?? undefined,
        serverReceivedAt: existing.serverReceivedAt.toISOString(),
        errorCode: existing.errorCode ?? undefined,
      }));
      continue;
    }

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

      const existingChange = await tx.syncChange.findFirst({
        where: { clinicId: context.clinicId, entityType: operation.entityType, entityId: operation.entityId },
        orderBy: { sequence: "desc" },
      });
      const actualVersion = existingChange?.entityVersion ?? 0;

      if (operation.expectedVersion !== undefined && operation.expectedVersion !== actualVersion) {
        await tx.syncConflict.create({
          data: {
            id: randomUUID(),
            operationId: operation.operationId,
            clinicId: context.clinicId,
            deviceId: body.deviceId,
            entityType: operation.entityType,
            entityId: operation.entityId,
            expectedVersion: operation.expectedVersion,
            actualVersion,
            clientPayload: operation.payload as Prisma.InputJsonValue,
            serverPayload: existingChange?.payload ?? Prisma.JsonNull,
          },
        });
        return tx.syncOperation.update({
          where: { id: operationRecord.id },
          data: { status: "CONFLICT", processedAt: new Date(), entityVersion: actualVersion, errorCode: "SYNC_VERSION_CONFLICT" },
        });
      }

      await applyBusinessMutation(tx, context, operation);

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

      await recordAuditEvent(context, {
        action: "SYNC_MUTATION_APPLIED",
        entityType: operation.entityType,
        entityId: operation.entityId,
        metadata: { operationId: operation.operationId, operationType: operation.operationType },
      }, tx);

      return tx.syncOperation.update({
        where: { id: operationRecord.id },
        data: { status: "PROCESSED", processedAt: new Date(), entityVersion: nextVersion },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    results.push(replaySyncOperation({
      operationId: record.operationId,
      status: record.status,
      entityVersion: record.entityVersion ?? undefined,
      serverReceivedAt: record.serverReceivedAt.toISOString(),
      errorCode: record.errorCode ?? undefined,
    }));
  }

  await db.device.update({
    where: { id: device.id },
    data: { lastSeenAt: now, lastSyncAt: now },
  });

  const response: SyncPushResponse = { protocolVersion: SYNC_PROTOCOL_VERSION, results };
  return NextResponse.json(response);
}
