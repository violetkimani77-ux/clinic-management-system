export type SyncPolicy = {
  entityType: string;
  offlineCreate: boolean;
  offlineUpdate: boolean;
  offlineDelete: boolean;
  requiresOnlineVerification: boolean;
};

const POLICIES: SyncPolicy[] = [
  {
    entityType: "Patient",
    offlineCreate: true,
    offlineUpdate: true,
    offlineDelete: false,
    requiresOnlineVerification: false,
  },
  {
    entityType: "Visit",
    offlineCreate: true,
    offlineUpdate: true,
    offlineDelete: false,
    requiresOnlineVerification: false,
  },
  {
    entityType: "Prescription",
    offlineCreate: true,
    offlineUpdate: true,
    offlineDelete: false,
    requiresOnlineVerification: false,
  },
  {
    entityType: "Payment",
    offlineCreate: false,
    offlineUpdate: false,
    offlineDelete: false,
    requiresOnlineVerification: true,
  },
  {
    entityType: "ClinicSubscription",
    offlineCreate: false,
    offlineUpdate: false,
    offlineDelete: false,
    requiresOnlineVerification: true,
  },
  {
    entityType: "Membership",
    offlineCreate: false,
    offlineUpdate: false,
    offlineDelete: false,
    requiresOnlineVerification: true,
  },
];

export function getSyncPolicy(entityType: string): SyncPolicy | null {
  return POLICIES.find((policy) => policy.entityType === entityType) ?? null;
}

export function canApplyOffline(
  entityType: string,
  operationType: "CREATE" | "UPDATE" | "DELETE",
): boolean {
  const policy = getSyncPolicy(entityType);
  if (!policy) return false;
  if (policy.requiresOnlineVerification) return false;
  if (operationType === "CREATE") return policy.offlineCreate;
  if (operationType === "UPDATE") return policy.offlineUpdate;
  return policy.offlineDelete;
}
