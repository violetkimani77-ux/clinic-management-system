import Link from "next/link";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import styles from "@/components/dashboard/workspace-page.module.css";

/** Provides the reporting workspace until report data sources are connected. */
export default async function ReportsPage() {
  const context = await requireClinicPermission(PERMISSIONS.REPORTS_VIEW);

  return (
    <WorkspaceShell context={context} activeHref="/reports">
      <div className={styles.page}>
        <nav aria-label="Page navigation">
          <Link href="/dashboard" className={styles.backLink}>
            ← Back to Dashboard
          </Link>
        </nav>

        <header className={styles.hero}>
          <p className={styles.eyebrow}>Reporting</p>
          <h1 className={styles.title}>Reports</h1>
          <p className={styles.description}>
            Operational and financial reporting built from the clinic's source workflows.
          </p>
        </header>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Reports workspace</h2>
          <p className={styles.sectionDescription}>
            Reports will be added as source workflows become available, so every figure remains
            traceable to the underlying clinic records.
          </p>
          <div className={styles.workflowGrid}>
            <article className={styles.workflowCard}>
              <strong>Daily operations</strong>
              <p>Visits, patient activity and workflow completion for selected dates.</p>
            </article>
            <article className={styles.workflowCard}>
              <strong>Pharmacy</strong>
              <p>Dispensing activity, stock movement, low-stock and expiry reporting.</p>
            </article>
            <article className={styles.workflowCard}>
              <strong>Accounts</strong>
              <p>Collections, outstanding balances, payment methods and financial summaries.</p>
            </article>
            <article className={styles.workflowCard}>
              <strong>Audit</strong>
              <p>Trace sensitive actions without exposing unnecessary patient information.</p>
            </article>
          </div>

          <div className={styles.emptyState}>
            <strong>Reporting data sources are not connected yet.</strong>
            <p>
              We will implement reports after the underlying workflows are operational rather than
              creating a second, duplicated reporting data store.
            </p>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
