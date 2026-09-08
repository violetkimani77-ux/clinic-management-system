import {
  TenantDataStoreStatus,
  TenantIsolationMode,
  TenantResidencyPolicy,
} from "@prisma/client";
import {
  assertTenantDataStoreUsable,
  TENANT_DATASTORE_FAILURE,
  type TenantDataStoreSnapshot,
} from "@/lib/tenant/datastore";

const healthyStore = (): TenantDataStoreSnapshot => ({
  clinicId: "clinic-1",
  isolationMode: TenantIsolationMode.POOL,
  status: TenantDataStoreStatus.HEALTHY,
  residencyPolicy: TenantResidencyPolicy.KENYA_ONLY,
  country: "KE",
  backupCountry: "KE",
  provisionedAt: new Date("2026-09-08T08:00:00.000Z"),
  lastHealthCheckAt: new Date("2026-09-08T08:05:00.000Z"),
});

describe("tenant datastore guard", () => {
  it("allows a healthy pooled Kenya-only datastore", () => {
    expect(() => assertTenantDataStoreUsable(healthyStore())).not.toThrow();
  });

  it("fails closed when the datastore record is missing", () => {
    expect(() => assertTenantDataStoreUsable(null)).toThrow(
      TENANT_DATASTORE_FAILURE,
    );
  });

  it.each([
    ["unhealthy status", { status: TenantDataStoreStatus.DEGRADED }],
    ["bridge isolation", { isolationMode: TenantIsolationMode.BRIDGE }],
    ["silo isolation", { isolationMode: TenantIsolationMode.SILO }],
    ["non-Kenya primary", { country: "UG" }],
    ["non-Kenya backup", { backupCountry: "UG" }],
    ["missing provisioning timestamp", { provisionedAt: null }],
    ["missing health-check timestamp", { lastHealthCheckAt: null }],
  ])("rejects %s", (_label, override) => {
    expect(() =>
      assertTenantDataStoreUsable({ ...healthyStore(), ...override }),
    ).toThrow(TENANT_DATASTORE_FAILURE);
  });
});
