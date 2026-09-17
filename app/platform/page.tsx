import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getPlatformAuthContext, clearPlatformSession } from "@/lib/platform/session";
import { PlatformShell } from "@/components/platform/platform-shell";
import styles from "@/components/platform/platform-content.module.css";

export const dynamic = "force-dynamic";

export default async function PlatformControlPage() {
  const auth = await getPlatformAuthContext();
  if (!auth) redirect("/platform/login");

  const [clinicCount, stores, subscriptions, clinics, recentAudit] = await Promise.all([
    db.clinic.count(),
    db.tenantDataStore.groupBy({ by: ["status"], _count: { _all: true } }),
    db.clinicSubscription.groupBy({ by: ["status"], _count: { _all: true } }),
    db.clinic.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        createdAt: true,
        tenantDataStore: {
          select: { status: true, isolationMode: true, residencyPolicy: true, country: true, backupCountry: true, lastHealthCheckAt: true },
        },
        subscriptions: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, currentPeriodEnd: true } },
      },
    }),
    db.platformAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, action: true, entityType: true, entityId: true, createdAt: true },
    }),
  ]);

  const storeSummary = Object.fromEntries(stores.map((item) => [item.status, item._count._all]));
  const subscriptionSummary = Object.fromEntries(subscriptions.map((item) => [item.status, item._count._all]));
  const degradedOrFailed = (storeSummary.DEGRADED ?? 0) + (storeSummary.FAILED ?? 0);

  async function logout() {
    "use server";
    await clearPlatformSession();
    redirect("/platform/login");
  }

  return (
    <PlatformShell context={auth} activeHref="/platform">
      <div className={styles.pageHeader}>
        <p className={styles.eyebrow}>Heri CMS</p>
        <h1 className={styles.pageTitle}>Platform Control</h1>
        <p className={styles.pageSubtitle}>Privileged, read-only operational overview for {auth.name}.</p>
      </div>

      {degradedOrFailed > 0 ? (
        <div role="status" className={styles.alertBanner}>
          {degradedOrFailed} datastore{degradedOrFailed === 1 ? "" : "s"} require operational attention. This release only
          reports the condition; remediation controls are intentionally disabled.
        </div>
      ) : null}

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Clinics / tenants</p>
          <p className={styles.metricValue}>{clinicCount}</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Healthy data stores</p>
          <p className={styles.metricValue}>{storeSummary.HEALTHY ?? 0}</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Degraded stores</p>
          <p className={styles.metricValue}>{storeSummary.DEGRADED ?? 0}</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Failed stores</p>
          <p className={styles.metricValue}>{storeSummary.FAILED ?? 0}</p>
        </div>
      </div>

      <div className={styles.panelGrid}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Tenant data stores</h2>
          {[
            ["Setup", storeSummary.SETUP],
            ["Provisioning", storeSummary.PROVISIONING],
            ["Migrating", storeSummary.MIGRATING],
            ["Healthy", storeSummary.HEALTHY],
            ["Degraded", storeSummary.DEGRADED],
            ["Failed", storeSummary.FAILED],
          ].map(([label, value]) => (
            <div key={label as string} className={styles.summaryRow}>
              <span className={styles.summaryLabel}>{label}</span>
              <span className={styles.summaryValue}>{(value as number) ?? 0}</span>
            </div>
          ))}
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Subscriptions</h2>
          {[
            ["Trial", subscriptionSummary.TRIAL],
            ["Active", subscriptionSummary.ACTIVE],
            ["Past due", subscriptionSummary.PAST_DUE],
            ["Canceled", subscriptionSummary.CANCELED],
            ["Expired", subscriptionSummary.EXPIRED],
          ].map(([label, value]) => (
            <div key={label as string} className={styles.summaryRow}>
              <span className={styles.summaryLabel}>{label}</span>
              <span className={styles.summaryValue}>{(value as number) ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>Clinics / tenants</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Clinic</th><th>Store</th><th>Isolation</th><th>Residency</th><th>Backup</th><th>Subscription</th><th>Health check</th>
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
                    <td className={styles.tableMono}>{store?.lastHealthCheckAt?.toISOString() ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>Privileged audit trail</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Time</th><th>Action</th><th>Entity</th><th>ID</th></tr>
            </thead>
            <tbody>
              {recentAudit.map((entry) => (
                <tr key={entry.id}>
                  <td className={styles.tableMono}>{entry.createdAt.toISOString()}</td>
                  <td className={styles.tableClinicName}>{entry.action}</td>
                  <td>{entry.entityType}</td>
                  <td className={styles.tableMono}>{entry.entityId ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <form action={logout}>
        <button type="submit" className={styles.backLink} style={{ cursor: "pointer", border: "none", background: "none" }}>
          Sign out
        </button>
      </form>
    </PlatformShell>
  );
}
