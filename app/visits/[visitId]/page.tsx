import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import styles from "@/components/dashboard/workspace-page.module.css";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getVisit } from "@/lib/visits/registry";
import { updateVisitRecord } from "../actions";

/**
 * Displays one clinic-scoped visit and its current workflow state.
 * Clinical assessment, diagnosis and prescriptions will attach to this visit
 * as those modules are implemented.
 */
export default async function VisitPage({
  params,
}: {
  params: Promise<{ visitId: string }>;
}) {
  const context = await requireClinicPermission(PERMISSIONS.VISITS_VIEW);
  const { visitId } = await params;
  const visit = await getVisit(context, visitId);

  if (!visit) notFound();

  const canUpdate = context.permissions.has(PERMISSIONS.VISITS_UPDATE);
  const isTerminal = visit.status === "COMPLETED" || visit.status === "CANCELLED";

  return (
    <WorkspaceShell context={context} activeHref="/visits">
      <div className={styles.page}>
        <nav aria-label="Page navigation">
          <Link href={`/patients/${visit.patientId}`} className={styles.backLink}>
            ← Back to Patient
          </Link>
        </nav>

        <header className={styles.hero}>
          <p className={styles.eyebrow}>Clinical visit</p>
          <h1 className={styles.title}>{visit.patientName}</h1>
          <p className={styles.description}>
            {visit.patientNo} · Opened {visit.openedAt.toLocaleDateString("en-KE")} {visit.openedAt.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </header>

        <section className={styles.section} aria-labelledby="visit-status">
          <h2 id="visit-status" className={styles.sectionTitle}>Visit status</h2>
          <p className={styles.permissionHint}>{visit.status.replaceAll("_", " ")}</p>

          {canUpdate && !isTerminal ? (
            <form action={updateVisitRecord} className={styles.patientForm}>
              <input type="hidden" name="visitId" value={visit.id} />
              <label className={styles.field}>
                <span>Update status</span>
                <select name="status" defaultValue={visit.status} className={styles.input}>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Visit notes</span>
                <textarea name="notes" rows={5} defaultValue={visit.notes ?? ""} className={styles.textarea} />
              </label>
              <div className={styles.formActions}>
                <button type="submit" className={styles.primaryButton}>Save visit</button>
              </div>
            </form>
          ) : (
            <div className={styles.emptyState}>
              <strong>{isTerminal ? "This visit is closed." : "View only"}</strong>
              <p>{isTerminal ? "Completed and cancelled visits cannot be reopened in the MVP workflow." : "You do not have permission to update this visit."}</p>
            </div>
          )}
        </section>

        <section className={styles.section} aria-labelledby="next-workflow">
          <h2 id="next-workflow" className={styles.sectionTitle}>Next workflow steps</h2>
          <div className={styles.workflowGrid}>
            <div className={styles.workflowCard}>
              <strong>Clinical assessment</strong>
              <p>Assessment and clinical notes will be connected to this visit next.</p>
            </div>
            <div className={styles.workflowCard}>
              <strong>Prescription</strong>
              <p>Prescriptions will belong to this visit and flow to Pharmacy.</p>
            </div>
            <div className={styles.workflowCard}>
              <strong>Billing</strong>
              <p>Visit-related charges will flow into Accounts without duplicating patient records.</p>
            </div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
