export type SyncConflictInput = {
  expectedVersion?: number;
  actualVersion: number;
};

export function isVersionConflict(input: SyncConflictInput): boolean {
  return (
    input.expectedVersion !== undefined &&
    input.expectedVersion !== input.actualVersion
  );
}

export function conflictErrorCode(): "SYNC_CONFLICT" {
  return "SYNC_CONFLICT";
}

/**
 * Optimistic concurrency is the default conflict boundary. Domain-specific
 * merge policies can be layered on top without weakening the version check.
 */
export function assertExpectedVersion(input: SyncConflictInput): void {
  if (isVersionConflict(input)) {
    throw new Error(conflictErrorCode());
  }
}
