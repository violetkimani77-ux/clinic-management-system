import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { requireTenantDataStore } from "@/lib/tenant/datastore";
import { normalizePullLimit, SYNC_PROTOCOL_VERSION, type SyncPullRequest, type SyncPullResponse } from "@/lib/sync/protocol";
import { db } from "@/lib/db";

export const runtime = "nodejs";

function errorResponse(code: string, status: number) {
  return NextResponse.json({ error: code }, { status });
}

export async function POST(request: Request) {
  const context = await getAuthContext();
  if (!context) return errorResponse("UNAUTHORIZED", 401);

  let body: SyncPullRequest;
  try {
    body = (await request.json()) as SyncPullRequest;
  } catch {
    return errorResponse("SYNC_INVALID_REQUEST", 400);
  }

  if (body.protocolVersion !== SYNC_PROTOCOL_VERSION) return errorResponse("SYNC_PROTOCOL_VERSION_UNSUPPORTED", 400);
  if (body.clinicId !== context.clinicId) return errorResponse("TENANT_ACCESS_DENIED", 403);
  if (typeof body.deviceId !== "string" || !body.deviceId.trim()) return errorResponse("SYNC_DEVICE_REQUIRED", 400);

  try {
    await requireTenantDataStore(context.clinicId);
  } catch {
    return errorResponse("TENANT_DATASTORE_UNAVAILABLE", 503);
  }

  const device = await db.device.findUnique({
    where: { clinicId_deviceId: { clinicId: context.clinicId, deviceId: body.deviceId } },
  });
  if (!device || device.userId !== context.userId) return errorResponse("SYNC_DEVICE_UNAUTHORIZED", 403);
  if (device.status !== "ACTIVE" || (device.expiresAt && device.expiresAt <= new Date())) return errorResponse("SYNC_DEVICE_REVOKED", 403);

  const cursor = typeof body.cursor === "string" && /^\d+$/.test(body.cursor) ? body.cursor : "0";
  const limit = normalizePullLimit(body.limit);
  const changes = await db.syncChange.findMany({
    where: { clinicId: context.clinicId, sequence: { gt: BigInt(cursor) } },
    orderBy: { sequence: "asc" },
    take: limit,
  });

  const response: SyncPullResponse = {
    protocolVersion: SYNC_PROTOCOL_VERSION,
    nextCursor: changes.length ? changes[changes.length - 1].sequence.toString() : cursor,
    hasMore: changes.length === limit,
    changes: changes.map((change) => ({
      sequence: change.sequence.toString(),
      operationId: change.operationId,
      clinicId: change.clinicId,
      entityType: change.entityType,
      entityId: change.entityId,
      operationType: change.operationType,
      payload: change.payload as Record<string, unknown>,
      entityVersion: change.entityVersion,
      serverCreatedAt: change.serverCreatedAt.toISOString(),
    })),
  };

  await db.device.update({ where: { id: device.id }, data: { lastSeenAt: new Date(), lastSyncAt: new Date() } });
  return NextResponse.json(response);
}
