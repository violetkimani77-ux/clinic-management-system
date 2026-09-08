import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

export type SyncChangeMutation = {
  clinicId: string;
  entityType: string;
  entityId: string;
  operationType: "CREATE" | "UPDATE" | "DELETE";
  payload: Prisma.InputJsonValue;
};

/**
 * Records an authoritative domain mutation in the replication ledger.
 * Call this inside the same transaction as the domain write.
 */
export async function recordSyncChange(
  tx: Prisma.TransactionClient,
  mutation: SyncChangeMutation,
): Promise<number> {
  const latest = await tx.syncChange.findFirst({
    where: {
      clinicId: mutation.clinicId,
      entityType: mutation.entityType,
      entityId: mutation.entityId,
    },
    orderBy: { sequence: "desc" },
    select: { entityVersion: true },
  });

  const entityVersion = (latest?.entityVersion ?? 0) + 1;

  await tx.syncChange.create({
    data: {
      operationId: randomUUID(),
      clinicId: mutation.clinicId,
      entityType: mutation.entityType,
      entityId: mutation.entityId,
      operationType: mutation.operationType,
      payload: mutation.payload,
      entityVersion,
    },
  });

  return entityVersion;
}
