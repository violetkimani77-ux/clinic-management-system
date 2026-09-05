import Link from "next/link";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getAccountsSummary, listBillableVisits, listInvoices } from "@/lib/accounts/registry";
import { createInvoiceAction, recordPaymentAction } from "./actions";
import styles from "@/components/dashboard/workspace-page.module.css";

/**
 * Accounts workspace backed by live invoice and payment records.
 *
 * The MVP intentionally keeps billing simple: one invoice line per visit for
 * now, while preserving the database model needed for multiple line items.
 */
export default async function AccountsPage() {
  const context = await requireClinicPermission(PERMISSIONS.ACCOUNTS_VIEW);
  const canInvoice = context.permissions.has(PERMISSIONS.ACCOUNTS_INVOICE);
  const canPay = context.permissions.has(PERMISSIONS.ACCOUNTS_PAYMENT);
  const [summary, invoices, billableVisits] = await Promise.all([
    getAccountsSummary(context),
    listInvoices(context),
    listBillableVisits(context),
  ]);

  return (
    <WorkspaceShell context={context} activeHref="/accounts">
      <div className={styles.page}>
        <nav aria-label="Page navigation">
          <Link href="/dashboard" className={styles.backLink}>← Back to Dashboard</Link>
        </nav>

        <header className={styles.hero}>
          <p className={styles.eyebrow}>Accounts workspace</p>
          <h1 className={styles.title}>Accounts</h1>
          <p className={styles.description}>Manage invoices, payments and outstanding clinic balances.</p>
        </header>

        <section className={styles.cardGrid} aria-label="Accounts overview">
          {[
            ["Collected today", `KES ${summary.collectedToday.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`, "Verified payments received today"],
            ["Outstanding", `KES ${summary.outstanding.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`, "Current unpaid invoice balance"],
            ["Invoices", String(summary.invoiceCount), "Issued and paid invoices"],
            ["M-Pesa today", "—", "Payment channel detail comes next"],
          ].map(([label, value, hint]) => (
            <article key={label} className={styles.card}>
              <p className={styles.cardLabel}>{label}</p>
              <p className={styles.cardValue}>{value}</p>
              <p className={styles.cardHint}>{hint}</p>
            </article>
          ))}
        </section>

        {canInvoice && billableVisits.length > 0 ? (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Create invoice</h2>
            <p className={styles.sectionDescription}>Select a visit and record the charge to issue an invoice.</p>
            <form action={createInvoiceAction} className={styles.patientForm}>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Visit</span>
                  <select name="visitId" required>
                    {billableVisits.map((visit) => (
                      <option key={visit.id} value={visit.id}>
                        {visit.patientNo} — {visit.patientName} — {visit.status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Description</span>
                  <input name="description" required placeholder="Consultation" />
                </label>
                <label className={styles.field}>
                  <span>Quantity</span>
                  <input name="quantity" type="number" min="1" step="1" defaultValue="1" required />
                </label>
                <label className={styles.field}>
                  <span>Unit price (KES)</span>
                  <input name="unitPrice" type="number" min="0.01" step="0.01" required />
                </label>
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.primaryButton}>Issue Invoice</button>
              </div>
            </form>
          </section>
        ) : null}

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Invoices</h2>
              <p className={styles.sectionDescription}>Current financial obligations and payment status.</p>
            </div>
          </div>

          {invoices.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>No invoices yet.</strong>
              <p>Invoices created from completed clinic workflows will appear here.</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Invoice</th><th>Patient</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Payment</th></tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>{invoice.invoiceNo}</td>
                      <td>{invoice.patientNo} — {invoice.patientName}</td>
                      <td>KES {invoice.total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td>
                      <td>KES {invoice.amountPaid.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td>
                      <td>KES {invoice.balance.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td>
                      <td>{invoice.status}</td>
                      <td>
                        {canPay && invoice.balance > 0 ? (
                          <form action={recordPaymentAction} className={styles.formActions}>
                            <input type="hidden" name="invoiceId" value={invoice.id} />
                            <input name="amount" type="number" min="0.01" max={invoice.balance} step="0.01" defaultValue={invoice.balance.toFixed(2)} aria-label={`Payment amount for ${invoice.invoiceNo}`} required />
                            <select name="method" defaultValue="CASH" aria-label={`Payment method for ${invoice.invoiceNo}`}>
                              <option value="CASH">Cash</option>
                              <option value="MPESA">M-Pesa</option>
                              <option value="CARD">Card</option>
                              <option value="BANK">Bank</option>
                              <option value="OTHER">Other</option>
                            </select>
                            <input name="externalRef" placeholder="M-Pesa ref (if applicable)" aria-label={`External payment reference for ${invoice.invoiceNo}`} />
                            <button type="submit" className={styles.secondaryButton}>Record Payment</button>
                          </form>
                        ) : invoice.balance > 0 ? "View only" : "Paid"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
