import Link from "next/link";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import styles from "@/components/dashboard/workspace-page.module.css";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listVisits } from "@/lib/visits/registry";

/**
 * Displays the clinic visit queue/history. Clinical documentation will be
 * added to individual visit pages as the care workflow is implemented.
 */
export default async function VisitsPage() {
  const context = await requireClinicPermission(PERMISSIONS.VISITS_VIEW);
  const visits = await listVisits(context, { todayOnly: true });
  const canUpdate = context.permissions.has(PERMISSIONS.VISITS_UPDATE);

  return (
    <WorkspaceShell context={context} activeHref="/visits">
      <div className={styles.page}>
        <nav aria-label="Page navigation">
          <Link href="/dashboard" className={styles.backLink}>← Back to Dashboard</Link>
        </nav>

        <header className={styles.hero}>
          <p className={styles.eyebrow}>Clinical workflow</p>
          <h1 className={styles.title}>Visits</h1>
          <p className={styles.description}>
            Open and track today&apos;s patient encounters before prescriptions, billing and payment workflows are completed.
          </p>
        </header>

        <section className={styles.section} aria-labelledby="today-visits">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="today-visits" className={styles.sectionTitle}>Today&apos;s visits</h2>
              <p className={styles.sectionDescription}>
                {visits.length} {visits.length === 1 ? "visit" : "visits"} opened today.
              </p>
            </div>
          </div>

          {visits.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>No visits today yet.</strong>
              <p>Open a visit from an active patient record to begin the clinical workflow.</p>
              <Link href="/patients" className={styles.primaryButton}>Find a patient</Link>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className={styles.srOnly}>Today&apos;s clinic visits</caption>
                <thead>
                  <tr>
                    <th scope="col">Patient</th>
                    <th scope="col">Patient No.</th>
                    <th scope="col">Opened</th>
                    <th scope="col">Status</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((visit) => (
                    <tr key={visit.id}>
                      <td>
                        <Link href={`/patients/${visit.patientId}`} className={styles.patientLink}>
                          {visit.patientName}
                        </Link>
                      </td>
                      <td className={styles.patientNumber}>{visit.patientNo}</td>
                      <td>{visit.openedAt.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td>{visit.status.replaceAll("_", " ")}</td>
                      <td>
                        <Link href={`/visits/${visit.id}`} className={styles.tableAction}>
                          {canUpdate ? "Open" : "View"} <span aria-hidden="true">→</span>
                        </Link>
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
