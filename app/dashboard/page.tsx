import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import { requireAuth } from "@/lib/auth/guards";
import { getDashboardMetrics } from "@/lib/dashboard/metrics";
import styles from "@/components/dashboard/dashboard-overview.module.css";

/**
 * Displays the authenticated admin workspace and live operational dashboard.
 * Metrics are read from the database during each request rather than stored
 * separately, keeping the dashboard aligned with source records.
 */
export default async function DashboardPage() {
  const context = await requireAuth();
  const metrics = await getDashboardMetrics(context);

  const attentionItems = [
    `${metrics.lowStockMedicines.length} medicine${metrics.lowStockMedicines.length === 1 ? "" : "s"} below reorder level`,
    `${metrics.expiringSoonBatchCount} batch${metrics.expiringSoonBatchCount === 1 ? "" : "es"} expiring within 30 days`,
    `${metrics.expiredBatchCount} expired batch${metrics.expiredBatchCount === 1 ? "" : "es"}`,
    `KES ${metrics.outstandingAmount.toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} outstanding`,
  ];

  return (
    <WorkspaceShell context={context} activeHref="/dashboard">
      <div>
        <p
          style={{
            margin: 0,
            color: "#6b7280",
            fontSize: 13,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {context.roleCode} workspace
        </p>
        <h1 style={{ margin: "8px 0", fontSize: 32 }}>Dashboard</h1>
        <p style={{ margin: 0, color: "#6b7280" }}>
          Clinic activity and operational items that need attention.
        </p>
      </div>

      <div className={styles.cards} aria-label="Clinic overview">
        {[
          ["Patients", String(metrics.activePatientCount)],
          ["Visits today", String(metrics.visitsToday)],
          [
            "Revenue today",
            `KES ${Number(metrics.revenueToday).toLocaleString("en-KE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          ],
          [
            "Outstanding",
            `KES ${metrics.outstandingAmount.toLocaleString("en-KE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          ],
        ].map(([label, value]) => (
          <article key={label} className={styles.card}>
            <p className={styles.cardLabel}>{label}</p>
            <strong className={styles.cardValue}>{value}</strong>
          </article>
        ))}
      </div>

      <section className={styles.attention} aria-labelledby="needs-attention">
        <h2 id="needs-attention" className={styles.attentionTitle}>
          Needs attention
        </h2>
        <ul className={styles.attentionList}>
          <li className={styles.attentionItem}>
            <span className={styles.attentionIndicator}>🔴</span>
            <span>{attentionItems[0]}</span>
          </li>
          <li className={styles.attentionItem}>
            <span className={styles.attentionIndicator}>🟠</span>
            <span>{attentionItems[1]}</span>
          </li>
          <li className={styles.attentionItem}>
            <span className={styles.attentionIndicator}>🔴</span>
            <span>{attentionItems[2]}</span>
          </li>
          <li className={styles.attentionItem}>
            <span className={styles.attentionIndicator}>🟠</span>
            <span>{attentionItems[3]}</span>
          </li>
        </ul>
      </section>
    </WorkspaceShell>
  );
}
