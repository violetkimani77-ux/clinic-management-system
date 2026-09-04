import Link from "next/link";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import styles from "@/components/dashboard/workspace-page.module.css";

/**
 * Provides the accounts workspace frame and truthful financial placeholders
 * until invoice and payment records are connected to the page.
 */
export default async function AccountsPage() {
  const context = await requireClinicPermission(PERMISSIONS.ACCOUNTS_VIEW);

  return (
    <WorkspaceShell context={context} activeHref="/accounts">
      <div className={styles.page}>
        <nav aria-label="Page navigation">
          <Link href="/dashboard" className={styles.backLink}>
            ← Back to Dashboard
          </Link>
        </nav>

        <header className={styles.hero}>
          <p className={styles.eyebrow}>Accounts workspace</p>
          <h1 className={styles.title}>Accounts</h1>
          <p className={styles.description}>
            Manage invoices, payments, receivables and financial reporting for the clinic.
          </p>
        </header>

        <section className={styles.cardGrid} aria-label="Accounts overview">
          {[
            ["Collected today", "—", "Verified payments will appear here"],
            ["Outstanding", "—", "Open invoice balance"],
            ["Invoices", "—", "Issued invoices will appear here"],
            ["M-Pesa today", "—", "Verified M-Pesa payments"],
          ].map(([label, value, hint]) => (
            <article key={label} className={styles.card}>
              <p className={styles.cardLabel}>{label}</p>
              <p className={styles.cardValue}>{value}</p>
              <p className={styles.cardHint}>{hint}</p>
            </article>
          ))}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Accounts workflows</h2>
          <p className={styles.sectionDescription}>
            Financial actions will remain traceable and tied to their source records.
          </p>
          <div className={styles.workflowGrid}>
            <article className={styles.workflowCard}>
              <strong>Invoices</strong>
              <p>Create and manage charges without duplicating the clinical or pharmacy source data.</p>
            </article>
            <article className={styles.workflowCard}>
              <strong>Payments</strong>
              <p>Record verified cash, card, bank and M-Pesa payments with idempotent references.</p>
            </article>
            <article className={styles.workflowCard}>
              <strong>Receivables</strong>
              <p>Keep outstanding balances tied to issued invoices and their payment history.</p>
            </article>
            <article className={styles.workflowCard}>
              <strong>Reports</strong>
              <p>Build daily and period summaries from the financial source records.</p>
            </article>
          </div>

          <div className={styles.emptyState}>
            <strong>Accounts data is not connected yet.</strong>
            <p>
              No financial figures are fabricated here. Once billing and payment workflows are live,
              these cards will use verified records from the accounts module.
            </p>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
