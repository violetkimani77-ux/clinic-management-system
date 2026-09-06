import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/auth/authorization";

type AuditClient = Prisma.TransactionClient | typeof db;

export type AuditEventInput = {
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
};

function canonicalMetadata(metadata: Prisma.InputJsonValue | null) {
  return JSON.stringify(metadata ?? null);
}

function buildEntryHash(input: {
  id: string;
  clinicId: string;
  userId: string | null;
  sequence: number;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Prisma.InputJsonValue | null;
  ipAddress: string | null;
  userAgent: string | null;
  previousHash: string | null;
  createdAt: Date;
}) {
  const canonical = [
    input.id,
    input.clinicId,
    input.userId ?? "",
    String(input.sequence),
    input.action,
    input.entityType,
    input.entityId ?? "",
    canonicalMetadata(input.metadata),
    input.ipAddress ?? "",
    input.userAgent ?? "",
    input.previousHash ?? "",
    input.createdAt.toISOString(),
  ].join("|");

  return createHash("sha256").update(canonical).digest("hex");
}

async function writeAuditEvent(
  tx: Prisma.TransactionClient,
  context: AuthContext,
  event: AuditEventInput,
): Promise<void> {
  await tx.auditSequence.upsert({
    where: { clinicId: context.clinicId },
    create: { clinicId: context.clinicId },
    update: {},
  });

  const lockedSequence = await tx.$queryRaw<Array<{ currentSequence: number }>>`
    SELECT "currentSequence"
    FROM "AuditSequence"
    WHERE "clinicId" = ${context.clinicId}
    FOR UPDATE
  `;

  const currentSequence = lockedSequence[0]?.currentSequence ?? 0;
  const sequence = currentSequence + 1;

  const previous =
    sequence > 1
      ? await tx.auditLog.findUnique({
          where: {
            clinicId_sequence: {
              clinicId: context.clinicId,
              sequence: sequence - 1,
            },
          },
          select: { entryHash: true },
        })
      : null;

  const id = randomUUID();
  const createdAt = new Date();
  const previousHash = previous?.entryHash ?? null;
  const metadata = event.metadata ?? null;
  const ipAddress = event.ipAddress ?? null;
  const userAgent = event.userAgent ?? null;
  const entryHash = buildEntryHash({
    id,
    clinicId: context.clinicId,
    userId: context.userId,
    sequence,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId ?? null,
    metadata,
    ipAddress,
    userAgent,
    previousHash,
    createdAt,
  });

  await tx.auditSequence.update({
    where: { clinicId: context.clinicId },
    data: { currentSequence: sequence },
  });

  await tx.auditLog.create({
    data: {
      id,
      clinicId: context.clinicId,
      userId: context.userId,
      sequence,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId ?? null,
      metadata: metadata ?? undefined,
      ipAddress,
      userAgent,
      previousHash,
      entryHash,
      createdAt,
    },
  });
}

/**
 * Records an append-only, clinic-scoped audit event.
 *
 * When called without a transaction client, the event gets its own atomic
 * transaction. Mutation workflows should pass their existing transaction
 * client so the business write and audit event commit or roll back together.
 */
export async function recordAuditEvent(
  context: AuthContext,
  event: AuditEventInput,
  client: AuditClient = db,
): Promise<void> {
  if (client === db) {
    await db.$transaction((tx) => writeAuditEvent(tx, context, event));
    return;
  }

  await writeAuditEvent(client, context, event);
}
