import "server-only";

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/auth/authorization";

type AuditClient = Prisma.TransactionClient | typeof db;

type AuditHashInput = {
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
};

export type AuditEventInput = {
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
};

async function buildEntryHash(
  tx: Prisma.TransactionClient,
  input: AuditHashInput,
): Promise<string> {
  const rows = await tx.$queryRaw<Array<{ entryHash: string }>>`
    SELECT "computeAuditEntryHash"(
      ${input.id},
      ${input.clinicId},
      ${input.userId},
      ${input.sequence},
      ${input.action},
      ${input.entityType},
      ${input.entityId},
      CAST(${JSON.stringify(input.metadata)} AS jsonb),
      ${input.ipAddress},
      ${input.userAgent},
      ${input.previousHash},
      ${input.createdAt.toISOString()}
    ) AS "entryHash"
  `;

  const entryHash = rows[0]?.entryHash;
  if (!entryHash || !/^[a-f0-9]{64}$/.test(entryHash)) {
    throw new Error("Audit hash computation returned an invalid entry hash");
  }

  return entryHash;
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

  const id = crypto.randomUUID();
  const createdAt = new Date();
  const previousHash = previous?.entryHash ?? null;
  const metadata = event.metadata ?? null;
  const ipAddress = event.ipAddress ?? null;
  const userAgent = event.userAgent ?? null;
  const entryHash = await buildEntryHash(tx, {
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
 * Hash canonicalization is centralized in PostgreSQL so migration backfills
 * and runtime writes use the exact same representation. When called without
 * a transaction client, the event gets its own atomic transaction. Mutation
 * workflows should pass their existing transaction client so the business
 * write and audit event commit or roll back together.
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
