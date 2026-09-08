import "server-only";

import {
  TenantDataStoreStatus,
  TenantIsolationMode,
  TenantResidencyPolicy,
  type Prisma,
} from "@prisma/client";
import { db } from "@/lib/db";

export const TENANT_DATASTORE_FAILURE = "TENANT_DATASTORE_UNAVAILABLE";

export type TenantDataStoreClient = Prisma.TransactionClient | typeof db;

export type TenantDataStoreSnapshot = {
  clinicId: string;
  isolationMode: TenantIsolationMode;
  status: TenantDataStoreStatus;
  residencyPolicy: TenantResidencyPolicy;
  country: string;
  backupCountry: string;
  provisionedAt: Date | null;
  lastHealthCheckAt: Date | null;
};

/** Reads the authoritative datastore lifecycle record for a clinic. */
export async function getTenantDataStore(
  clinicId: string,
  client: TenantDataStoreClient = db,
): Promise<TenantDataStoreSnapshot | null> {
  return client.tenantDataStore.findUnique({
    where: { clinicId },
    select: {
      clinicId: true,
      isolationMode: true,
      status: true,
      residencyPolicy: true,
      country: true,
      backupCountry: true,
      provisionedAt: true,
      lastHealthCheckAt: true,
    },
  });
}

/**
 * Fail-closed runtime gate for clinic data access.
 *
 * The current Heri CMS runtime supports POOL isolation. Bridge and silo
 * records remain lifecycle states until dedicated routing is implemented.
 */
export function assertTenantDataStoreUsable(
  store: TenantDataStoreSnapshot | null,
): asserts store is TenantDataStoreSnapshot {
  if (!store) throw new Error(TENANT_DATASTORE_FAILURE);
  if (store.status !== TenantDataStoreStatus.HEALTHY) {
    throw new Error(TENANT_DATASTORE_FAILURE);
  }
  if (store.isolationMode !== TenantIsolationMode.POOL) {
    throw new Error(TENANT_DATASTORE_FAILURE);
  }
  if (store.residencyPolicy === TenantResidencyPolicy.KENYA_ONLY) {
    if (store.country !== "KE" || store.backupCountry !== "KE") {
      throw new Error(TENANT_DATASTORE_FAILURE);
    }
  }
  if (!store.provisionedAt || !store.lastHealthCheckAt) {
    throw new Error(TENANT_DATASTORE_FAILURE);
  }
}

/**
 * Resolves and validates a clinic datastore. Call this before protected
 * tenant data access; never choose a datastore from request input.
 */
export async function requireTenantDataStore(
  clinicId: string,
  client: TenantDataStoreClient = db,
): Promise<TenantDataStoreSnapshot> {
  const store = await getTenantDataStore(clinicId, client);
  assertTenantDataStoreUsable(store);
  return store;
}
