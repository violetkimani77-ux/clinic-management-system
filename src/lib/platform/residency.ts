import "server-only";

import {
  TenantDataStoreStatus,
  TenantIsolationMode,
  TenantResidencyPolicy,
  TransferAssessmentStatus,
} from "@prisma/client";

export type ResidencyRequest = {
  isolationMode: TenantIsolationMode;
  residencyPolicy?: TenantResidencyPolicy;
  country: string;
  region?: string | null;
  backupCountry?: string;
  backupRegion?: string | null;
  transferAssessmentStatus?: TransferAssessmentStatus;
  hasRequiredTransferBasis?: boolean;
  hasProviderSafeguards?: boolean;
  hasRequiredConsent?: boolean;
  hasKenyaServingCopy?: boolean;
};

export type ResidencyDecision =
  | { allowed: true; reason: "KENYA_ONLY" | "APPROVED_CROSS_BORDER" }
  | { allowed: false; reason: string };

const KENYA = "KE";

export function validateTenantResidency(request: ResidencyRequest): ResidencyDecision {
  const policy = request.residencyPolicy ?? TenantResidencyPolicy.KENYA_ONLY;
  const country = request.country.toUpperCase();
  const backupCountry = (request.backupCountry ?? KENYA).toUpperCase();

  if (request.isolationMode === TenantIsolationMode.POOL && country !== KENYA) {
    return { allowed: false, reason: "POOL_MUST_BE_KENYA_HOSTED" };
  }

  if (policy === TenantResidencyPolicy.KENYA_ONLY) {
    if (country !== KENYA) return { allowed: false, reason: "PRIMARY_DATASTORE_OUTSIDE_KENYA" };
    if (backupCountry !== KENYA) return { allowed: false, reason: "BACKUP_DATASTORE_OUTSIDE_KENYA" };
    return { allowed: true, reason: "KENYA_ONLY" };
  }

  if (request.isolationMode === TenantIsolationMode.POOL) {
    return { allowed: false, reason: "CROSS_BORDER_POOL_NOT_SUPPORTED" };
  }

  if (request.transferAssessmentStatus !== TransferAssessmentStatus.APPROVED) {
    return { allowed: false, reason: "TRANSFER_ASSESSMENT_NOT_APPROVED" };
  }
  if (!request.hasRequiredTransferBasis) {
    return { allowed: false, reason: "TRANSFER_BASIS_NOT_CONFIRMED" };
  }
  if (!request.hasProviderSafeguards) {
    return { allowed: false, reason: "PROVIDER_SAFEGUARDS_NOT_CONFIRMED" };
  }
  if (!request.hasRequiredConsent) {
    return { allowed: false, reason: "REQUIRED_TRANSFER_CONSENT_NOT_CONFIRMED" };
  }
  if (!request.hasKenyaServingCopy) {
    return { allowed: false, reason: "KENYA_SERVING_COPY_REQUIRED" };
  }

  return { allowed: true, reason: "APPROVED_CROSS_BORDER" };
}

export function assertTenantResidencyEligible(request: ResidencyRequest) {
  const decision = validateTenantResidency(request);

  if (!decision.allowed) {
    throw new Error(`TENANT_RESIDENCY_PROVISIONING_BLOCKED:${decision.reason}`);
  }

  return decision;
}

export function isResidencyHealthy(store: {
  status: TenantDataStoreStatus;
  residencyPolicy: TenantResidencyPolicy;
  country: string;
  backupCountry: string;
  transferAssessmentStatus: TransferAssessmentStatus;
}) {
  if (store.status !== TenantDataStoreStatus.HEALTHY) return false;
  if (store.residencyPolicy === TenantResidencyPolicy.KENYA_ONLY) {
    return store.country === KENYA && store.backupCountry === KENYA;
  }
  return store.transferAssessmentStatus === TransferAssessmentStatus.APPROVED;
}
