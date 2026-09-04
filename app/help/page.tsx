import Link from "next/link";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import { requireAuth } from "@/lib/auth/guards";
import styles from "@/components/dashboard/workspace-page.module.css";

const quickGuides = [
  ["Register a patient", "Add a patient to the shared clinic registry, then open their profile."],
  ["Start a visit", "Open a new visit from the patient profile and continue the care workflow."],
  ["Create and send a prescription", "Add prescription items during a visit and explicitly send the prescription to Pharmacy."],
  ["Dispense medicines", "Review the Pharmacy queue and dispense against available stock using the configured workflow."],
  ["Manage stock and batches", "Review medicine quantities, batch expiry dates and stock alerts."],
  ["Create an invoice", "Record charges against the relevant patient visit and review the outstanding balance."],
  ["Record a payment", "Record verified payments against an invoice and review the updated balance."],
  ["Use the dashboard", "Use today's operational, collection and attention metrics to see what needs action."],
];

const documentation = [
  ["Roles and permissions", "Understand what Admin, Pharmacy and Accounts staff can view and change."],
  ["Pharmacy procedures", "Follow the prescription, dispensing, stock and expiry workflow."],
  ["Accounts procedures", "Understand invoices, payments, outstanding balances and payment methods."],
  ["Reports and audit history", "Understand operational reporting and why important actions are recorded."],
  ["Security and session timeout", "Keep staff accounts secure and understand automatic session expiry."],
  ["Frequently asked questions", "Common questions about using the Clinic Management System."],
];

/**
 * Provides a staff-only support centre. The Help page contains operational
 * guidance and support information; it deliberately does not expose patient
 * data to an assistant or provide medical diagnosis, prescribing or treatment
 * advice.
 */
export default async function HelpPage() {
  const context = await requireAuth();

  return (
    <WorkspaceShell context={context} activeHref="/help">
      <div className={styles.page}>
        <nav aria-label="Page navigation">
          <Link href="/dashboard" className={styles.backLink}>
            ← Back to Dashboard
          </Link>
        </nav>

        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Staff support centre</p>
            <h1 className={styles.title}>Help</h1>
            <p className={styles.description}>
              Quick guides, documentation and support for using the Clinic Management System.
            </p>
          </div>
        </header>

        <section className={styles.section} aria-labelledby="quick-guides-title">
          <h2 id="quick-guides-title" className={styles.sectionTitle}>Quick Guides</h2>
          <p className={styles.sectionDescription}>
            Short instructions for the workflows staff use most often.
          </p>
          <div className={styles.workflowGrid}>
            {quickGuides.map(([title, description]) => (
              <article key={title} className={styles.workflowCard}>
                <strong>{title}</strong>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="documentation-title">
          <h2 id="documentation-title" className={styles.sectionTitle}>Documentation</h2>
          <p className={styles.sectionDescription}>
            Reference material for roles, procedures, reporting and security.
          </p>
          <div className={styles.workflowGrid}>
            {documentation.map(([title, description]) => (
              <article key={title} className={styles.workflowCard}>
                <strong>{title}</strong>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="support-title">
          <h2 id="support-title" className={styles.sectionTitle}>Contact Support</h2>
          <p className={styles.sectionDescription}>
            For system issues, account problems or questions that are not covered in the guides, contact support.
          </p>
          <div className={styles.workflowGrid}>
            <article className={styles.workflowCard}>
              <strong>Email Support</strong>
              <p>
                <a href="mailto:invest@investit.click" className={styles.patientLink}>
                  invest@investit.click
                </a>
              </p>
            </article>
            <article className={styles.workflowCard}>
              <strong>CMS Assistant</strong>
              <p>
                Ask how to use the Clinic Management System. The assistant is designed for system guidance,
                not clinical diagnosis, prescribing or treatment advice.
              </p>
            </article>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
