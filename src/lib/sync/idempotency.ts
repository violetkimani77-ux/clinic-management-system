import type { SyncOperationResult } from "./protocol";

export type SyncIdempotencyRecord = {
  operationId: string;
  status: SyncOperationResult["status"];
  entityVersion?: number;
  serverReceivedAt: string;
  errorCode?: string;
};

/**
 * Selects the persisted result for an already-seen operation. The database
 * unique constraint on SyncOperation.operationId is the authoritative guard;
 * this helper keeps the application response deterministic after retries.
 */
export function replaySyncOperation(
  record: SyncIdempotencyRecord,
): SyncOperationResult {
  return {
    operationId: record.operationId,
    status: record.status,
    entityVersion: record.entityVersion,
    serverReceivedAt: record.serverReceivedAt,
    errorCode: record.errorCode,
  };
}
