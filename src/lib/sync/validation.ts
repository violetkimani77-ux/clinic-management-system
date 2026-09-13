import {
  SYNC_PROTOCOL_VERSION,
  type SyncOperation,
  type SyncPushRequest,
} from "./protocol";

const OPERATION_TYPES = new Set(["CREATE", "UPDATE", "DELETE"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`SYNC_INVALID_${field.toUpperCase()}`);
  }
}

export function validateSyncOperation(
  operation: SyncOperation,
  requestClinicId: string,
  requestDeviceId: string,
): void {
  if (operation.protocolVersion !== SYNC_PROTOCOL_VERSION) {
    throw new Error("SYNC_PROTOCOL_VERSION_UNSUPPORTED");
  }
  requireNonEmptyString(operation.operationId, "operation_id");
  requireNonEmptyString(operation.clinicId, "clinic_id");
  requireNonEmptyString(operation.deviceId, "device_id");
  requireNonEmptyString(operation.userId, "user_id");
  requireNonEmptyString(operation.entityType, "entity_type");
  requireNonEmptyString(operation.entityId, "entity_id");
  requireNonEmptyString(operation.clientCreatedAt, "client_created_at");

  if (operation.clinicId !== requestClinicId) {
    throw new Error("TENANT_ACCESS_DENIED");
  }
  if (operation.deviceId !== requestDeviceId) {
    throw new Error("SYNC_DEVICE_MISMATCH");
  }
  if (!OPERATION_TYPES.has(operation.operationType)) {
    throw new Error("SYNC_INVALID_OPERATION_TYPE");
  }
  if (!isRecord(operation.payload)) {
    throw new Error("SYNC_INVALID_PAYLOAD");
  }
  if (
    operation.expectedVersion !== undefined &&
    (!Number.isInteger(operation.expectedVersion) || operation.expectedVersion < 0)
  ) {
    throw new Error("SYNC_INVALID_EXPECTED_VERSION");
  }
}

export function validateSyncPushRequest(request: SyncPushRequest): void {
  if (request.protocolVersion !== SYNC_PROTOCOL_VERSION) {
    throw new Error("SYNC_PROTOCOL_VERSION_UNSUPPORTED");
  }
  requireNonEmptyString(request.clinicId, "clinic_id");
  requireNonEmptyString(request.deviceId, "device_id");
  if (!Array.isArray(request.operations) || request.operations.length === 0) {
    throw new Error("SYNC_OPERATIONS_REQUIRED");
  }
  if (request.operations.length > 100) {
    throw new Error("SYNC_BATCH_TOO_LARGE");
  }
  for (const operation of request.operations) {
    validateSyncOperation(operation, request.clinicId, request.deviceId);
  }
}
