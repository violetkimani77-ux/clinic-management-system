import Link from "next/link";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import styles from "@/components/dashboard/workspace-page.module.css";

/**
 * Provides the pharmacy workspace frame and a truthful empty-state UI until
 * prescription, dispensing, and inventory records are connected to the page.
 */
export default async function PharmacyPage() {
  const context = await requireClinicPermission(PERMISSIONS.PHARMACY_VIEW);

  return (
    <WorkspaceShell context={context} activeHref="/pharmacy">
      <div className={styles.page}>
        <nav aria-label="Page navigation">
          <Link href="/dashboard" className={styles.backLink}>
            ← Back to Dashboard
          </Link>
        </nav>

        <header className={styles.hero}>
          <p className={styles.eyebrow}>Pharmacy workspace</p>
          <h1 className={styles.title}>Pharmacy</h1>
          <p className={styles.description}>
            Manage prescriptions, dispensing, stock and medicine batches from one workspace.
          </p>
        </header>

        <section className={styles.cardGrid} aria-label="Pharmacy overview">
          {[
            ["Prescriptions", "—", "Awaiting workflow data"],
            ["Dispensed today", "—", "Awaiting workflow data"],
            ["Low stock", "—", "Reorder alerts will appear here"],
            ["Expiring soon", "—", "Expiry alerts will appear here"],
          ].map(([label, value, hint]) => (
            <article key={label} className={styles.card}>
              <p className={styles.cardLabel}>{label}</p>
              <p className={styles.cardValue}>{value}</p>
              <p className={styles.cardHint}>{hint}</p>
            </article>
          ))}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Pharmacy workflows</h2>
          <p className={styles.sectionDescription}>
            These are the core workflows we will connect to the shared clinic data next.
          </p>
          <div className={styles.workflowGrid}>
            <article className={styles.workflowCard}>
              <strong>Prescriptions</strong>
              <p>Review prescriptions sent from clinical care and prepare them for dispensing.</p>
            </article>
            <article className={styles.workflowCard}>
              <strong>Dispensing</strong>
              <p>Dispense medicines using the appropriate stock batch and record the transaction.</p>
            </article>
            <article className={styles.workflowCard}>
              <strong>Inventory</strong>
              <p>Track medicine quantities, batches, expiry dates, suppliers and stock movements.</p>
            </article>
            <article className={styles.workflowCard}>
              <strong>Alerts</strong>
              <p>Surface low-stock, expiring and expired batches without creating duplicate data.</p>
            </article>
          </div>

          <div className={styles.emptyState}>
            <strong>Pharmacy data is not connected yet.</strong>
            <p>
              The workspace is intentionally showing no invented numbers. Once the source records are
              implemented, these cards will read directly from the pharmacy and inventory modules.
            </p>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
