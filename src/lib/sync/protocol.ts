export const SYNC_PROTOCOL_VERSION = 1 as const;

export type SyncOperationType = "CREATE" | "UPDATE" | "DELETE";
export type SyncOperationStatus =
  | "PENDING"
  | "PROCESSED"
  | "REJECTED"
  | "CONFLICT";

export type SyncOperation = {
  protocolVersion: typeof SYNC_PROTOCOL_VERSION;
  operationId: string;
  clinicId: string;
  deviceId: string;
  userId: string;
  entityType: string;
  entityId: string;
  operationType: SyncOperationType;
  payload: Record<string, unknown>;
  clientCreatedAt: string;
  expectedVersion?: number;
};

export type SyncOperationResult = {
  operationId: string;
  status: Exclude<SyncOperationStatus, "PENDING">;
  entityVersion?: number;
  serverReceivedAt: string;
  errorCode?: string;
};

export type SyncPushRequest = {
  protocolVersion: typeof SYNC_PROTOCOL_VERSION;
  clinicId: string;
  deviceId: string;
  operations: SyncOperation[];
};

export type SyncPushResponse = {
  protocolVersion: typeof SYNC_PROTOCOL_VERSION;
  results: SyncOperationResult[];
};

export type SyncPullRequest = {
  protocolVersion: typeof SYNC_PROTOCOL_VERSION;
  clinicId: string;
  deviceId: string;
  cursor: string;
  limit?: number;
};

export type SyncChange = {
  sequence: string;
  operationId: string;
  clinicId: string;
  entityType: string;
  entityId: string;
  operationType: SyncOperationType;
  payload: Record<string, unknown>;
  serverCreatedAt: string;
  entityVersion: number;
};

export type SyncPullResponse = {
  protocolVersion: typeof SYNC_PROTOCOL_VERSION;
  changes: SyncChange[];
  nextCursor: string;
  hasMore: boolean;
};

export function createEmptyCursor(): string {
  return "0";
}

export function normalizePullLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) return 100;
  return Math.min(Math.max(Math.trunc(limit as number), 1), 500);
}
