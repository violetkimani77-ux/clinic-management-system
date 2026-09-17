import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getPlatformAuthContext } from "@/lib/platform/session";
import { PLATFORM_ACTIONS, requirePlatformAction } from "@/lib/platform/authorization";
import { PlatformShell } from "@/components/platform/platform-shell";
import styles from "@/components/platform/platform-content.module.css";

export const dynamic = "force-dynamic";

export default async function PlatformTenantsPage() {
  const auth = await getPlatformAuthContext();
  if (!auth) redirect("/platform/login");
  await requirePlatformAction(auth, PLATFORM_ACTIONS.VIEW_TENANTS);

  const clinics = await db.clinic.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      createdAt: true,
      tenantDataStore: { select: { status: true, isolationMode: true, residencyPolicy: true, country: true, backupCountry: true, lastHealthCheckAt: true } },
      subscriptions: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, currentPeriodEnd: true } },
    },
  });


  return (
  <PlatformShell context={auth} activeHref="/platform/tenants">
    <div className={styles.pageHeader}>
      <p className={styles.eyebrow}>Heri CMS</p>
      <h1 className={styles.pageTitle}>Clinics / Tenants</h1>
      <p className={styles.pageSubtitle}>Operational tenant inventory without exposing clinical records.</p>
    </div>

    <div className={styles.panel}>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Clinic</th><th>Store</th><th>Isolation</th><th>Residency</th><th>Backup</th><th>Subscription</th><th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {clinics.map((clinic) => {
              const store = clinic.tenantDataStore;
              const subscription = clinic.subscriptions[0];
              return (
                <tr key={clinic.id}>
                  <td>
                    <div className={styles.tableClinicName}>{clinic.name}</div>
                    <div className={styles.tableClinicCode}>{clinic.code}</div>
                  </td>
                  <td>{store?.status ?? "—"}</td>
                  <td>{store?.isolationMode ?? "—"}</td>
                  <td>{store ? `${store.residencyPolicy} · ${store.country}` : "—"}</td>
                  <td>{store?.backupCountry ?? "—"}</td>
                  <td>{subscription?.status ?? "—"}</td>
                  <td><Link href={`/platform/tenants/${clinic.id}`} className={styles.tableLink}>View operations</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </PlatformShell>
);
}