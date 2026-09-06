import { describe, expect, it } from "vitest";
import {
  TenantIsolationMode,
  TenantResidencyPolicy,
  TransferAssessmentStatus,
} from "@prisma/client";
import { validateTenantResidency } from "@/lib/platform/residency";

describe("validateTenantResidency", () => {
  it("allows Kenya-only pooled storage in Kenya", () => {
    expect(
      validateTenantResidency({
        isolationMode: TenantIsolationMode.POOL,
        residencyPolicy: TenantResidencyPolicy.KENYA_ONLY,
        country: "KE",
        backupCountry: "KE",
      }),
    ).toEqual({ allowed: true, reason: "KENYA_ONLY" });
  });

  it("rejects pooled storage outside Kenya", () => {
    expect(
      validateTenantResidency({
        isolationMode: TenantIsolationMode.POOL,
        residencyPolicy: TenantResidencyPolicy.KENYA_ONLY,
        country: "US",
        backupCountry: "KE",
      }),
    ).toEqual({ allowed: false, reason: "POOL_MUST_BE_KENYA_HOSTED" });
  });

  it("rejects Kenya-only storage with a foreign backup", () => {
    expect(
      validateTenantResidency({
        isolationMode: TenantIsolationMode.BRIDGE_DATABASE,
        residencyPolicy: TenantResidencyPolicy.KENYA_ONLY,
        country: "KE",
        backupCountry: "US",
      }),
    ).toEqual({ allowed: false, reason: "BACKUP_DATASTORE_OUTSIDE_KENYA" });
  });

  it("fails closed when cross-border transfer approval is missing", () => {
    expect(
      validateTenantResidency({
        isolationMode: TenantIsolationMode.SILO_DATABASE,
        residencyPolicy: TenantResidencyPolicy.KENYA_SERVING_COPY,
        country: "US",
        backupCountry: "KE",
        transferAssessmentStatus: TransferAssessmentStatus.PENDING,
        hasRequiredTransferBasis: true,
        hasProviderSafeguards: true,
        hasRequiredConsent: true,
        hasKenyaServingCopy: true,
      }),
    ).toEqual({ allowed: false, reason: "TRANSFER_ASSESSMENT_NOT_APPROVED" });
  });

  it("requires a Kenya serving copy for approved cross-border storage", () => {
    expect(
      validateTenantResidency({
        isolationMode: TenantIsolationMode.SILO_DATABASE,
        residencyPolicy: TenantResidencyPolicy.KENYA_SERVING_COPY,
        country: "US",
        backupCountry: "KE",
        transferAssessmentStatus: TransferAssessmentStatus.APPROVED,
        hasRequiredTransferBasis: true,
        hasProviderSafeguards: true,
        hasRequiredConsent: true,
        hasKenyaServingCopy: false,
      }),
    ).toEqual({ allowed: false, reason: "KENYA_SERVING_COPY_REQUIRED" });
  });

  it("allows approved cross-border dedicated storage with safeguards", () => {
    expect(
      validateTenantResidency({
        isolationMode: TenantIsolationMode.SILO_DATABASE,
        residencyPolicy: TenantResidencyPolicy.KENYA_SERVING_COPY,
        country: "US",
        backupCountry: "KE",
        transferAssessmentStatus: TransferAssessmentStatus.APPROVED,
        hasRequiredTransferBasis: true,
        hasProviderSafeguards: true,
        hasRequiredConsent: true,
        hasKenyaServingCopy: true,
      }),
    ).toEqual({ allowed: true, reason: "APPROVED_CROSS_BORDER" });
  });
});
