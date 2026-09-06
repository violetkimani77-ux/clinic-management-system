import "server-only";

import { db } from "@/lib/db";
import { TenantDataStoreStatus, TenantIsolationMode } from "@prisma/client";

export async function getTenantDataStore(clinicId: string) {
  return db.tenantDataStore.findUnique({ where: { clinicId } });
}

/**
 * Resolves the registered tenant datastore contract.
 *
 * POOL is served by the shared Prisma client today. BRIDGE_DATABASE and
 * SILO_DATABASE are deliberately fail-closed until infrastructure provisioning
 * supplies a valid secret-manager connection reference and a dedicated runtime
 * connection factory. This prevents silently treating a promised isolated store
 * as if it were pooled data.
 */
export async function requireHealthyTenantDataStore(clinicId: string) {
  const store = await getTenantDataStore(clinicId);

  if (!store || store.status !== TenantDataStoreStatus.HEALTHY) {
    throw new Error("TENANT_DATASTORE_UNAVAILABLE");
  }

  if (store.isolationMode === TenantIsolationMode.POOL) {
    return { mode: store.isolationMode, client: db } as const;
  }

  if (!store.connectionRef) {
    throw new Error("TENANT_DEDICATED_DATASTORE_NOT_CONFIGURED");
  }

  throw new Error("TENANT_DEDICATED_DATASTORE_RUNTIME_PENDING");
}
