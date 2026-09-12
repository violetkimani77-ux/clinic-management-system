import {
  validateSyncOperation,
  validateSyncPushRequest,
} from "@/lib/sync/validation";
import { assertExpectedVersion, isVersionConflict } from "@/lib/sync/conflicts";
import type { SyncOperation } from "@/lib/sync/protocol";

const operation = (overrides: Partial<SyncOperation> = {}): SyncOperation => ({
  protocolVersion: 1,
  operationId: "op-1",
  clinicId: "clinic-1",
  deviceId: "device-1",
  userId: "user-1",
  entityType: "Patient",
  entityId: "patient-1",
  operationType: "CREATE",
  payload: { firstName: "Amina" },
  clientCreatedAt: "2026-09-08T10:00:00.000Z",
  ...overrides,
});

describe("sync validation", () => {
  it("accepts a tenant-matched operation", () => {
    expect(() => validateSyncOperation(operation(), "clinic-1", "device-1")).not.toThrow();
  });

  it("rejects cross-tenant operations", () => {
    expect(() => validateSyncOperation(operation(), "clinic-2", "device-1")).toThrow(
      "TENANT_ACCESS_DENIED",
    );
  });

  it("rejects device mismatch, invalid timestamps, and oversized batches", () => {
    expect(() => validateSyncOperation(operation(), "clinic-1", "device-2")).toThrow(
      "SYNC_DEVICE_MISMATCH",
    );
    expect(() =>
      validateSyncOperation(
        operation({ clientCreatedAt: "not-a-timestamp" }),
        "clinic-1",
        "device-1",
      ),
    ).toThrow("SYNC_INVALID_CLIENT_CREATED_AT");

    const operations = Array.from({ length: 101 }, (_, index) =>
      operation({ operationId: `op-${index}` }),
    );
    expect(() =>
      validateSyncPushRequest({
        protocolVersion: 1,
        clinicId: "clinic-1",
        deviceId: "device-1",
        operations,
      }),
    ).toThrow("SYNC_BATCH_TOO_LARGE");
  });
});

describe("sync optimistic concurrency", () => {
  it("detects a stale expected version", () => {
    expect(isVersionConflict({ expectedVersion: 2, actualVersion: 3 })).toBe(true);
    expect(isVersionConflict({ expectedVersion: 3, actualVersion: 3 })).toBe(false);
    expect(() => assertExpectedVersion({ expectedVersion: 2, actualVersion: 3 })).toThrow(
      "SYNC_CONFLICT",
    );
  });
});
