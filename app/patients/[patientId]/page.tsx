import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import styles from "@/components/dashboard/workspace-page.module.css";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPatientProfile } from "@/lib/patients/registry";
import { listVisits } from "@/lib/visits/registry";
import { openVisit } from "../../visits/actions";

/**
 * Displays the read-focused patient record and its clinical workflow history.
 * Editing registry fields is intentionally a separate route.
 */
export default async function PatientProfilePage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const context = await requireClinicPermission(PERMISSIONS.PATIENTS_VIEW);
  const { patientId } = await params;
  const patient = await getPatientProfile(context, patientId);

  if (!patient) notFound();

  const visits = await listVisits(context, { patientId });
  const canUpdate = context.permissions.has(PERMISSIONS.PATIENTS_UPDATE);
  const canOpenVisit = context.permissions.has(PERMISSIONS.VISITS_CREATE);

  return (
    <WorkspaceShell context={context} activeHref="/patients">
      <div className={styles.page}>
        <nav aria-label="Page navigation">
          <Link href="/patients" className={styles.backLink}>← Back to Patients</Link>
        </nav>

        <header className={styles.hero}>
          <p className={styles.eyebrow}>Patient profile</p>
          <h1 className={styles.title}>{patient.firstName} {patient.lastName}</h1>
          <p className={styles.description}>Patient No. {patient.patientNo}</p>
          <div className={styles.formActions}>
            {canUpdate ? (
              <Link href={`/patients/${patient.id}/edit`} className={styles.primaryButton}>Edit patient</Link>
            ) : null}
            {canOpenVisit ? (
              <form action={openVisit}>
                <input type="hidden" name="patientId" value={patient.id} />
                <button type="submit" className={styles.secondaryButton}>Start new visit</button>
              </form>
            ) : null}
          </div>
        </header>

        <section className={styles.section} aria-labelledby="patient-summary">
          <h2 id="patient-summary" className={styles.sectionTitle}>Patient information</h2>
          <dl className={styles.details}>
            <div><dt>First name</dt><dd>{patient.firstName}</dd></div>
            <div><dt>Last name</dt><dd>{patient.lastName}</dd></div>
            <div><dt>Date of birth</dt><dd>{patient.dateOfBirth?.toISOString().slice(0, 10) ?? "—"}</dd></div>
            <div><dt>Phone</dt><dd>{patient.phone ?? "—"}</dd></div>
            <div><dt>Email</dt><dd>{patient.email ?? "—"}</dd></div>
            <div><dt>Address</dt><dd>{patient.address ?? "—"}</dd></div>
            <div className={styles.fieldWide}><dt>Notes</dt><dd>{patient.notes ?? "—"}</dd></div>
          </dl>
        </section>

        <section className={styles.section} aria-labelledby="clinical-workflow">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="clinical-workflow" className={styles.sectionTitle}>Clinical workflow</h2>
              <p className={styles.sectionDescription}>Review this patient&apos;s existing visits and continue the care workflow.</p>
            </div>
          </div>

          {!canOpenVisit ? (
            <p className={styles.permissionHint}>You can view visits, but you do not have permission to open a new one.</p>
          ) : null}

          {visits.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>No visits recorded.</strong>
              <p>Start a new visit when the patient is ready to be seen.</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className={styles.srOnly}>Patient visit history</caption>
                <thead>
                  <tr>
                    <th scope="col">Opened</th>
                    <th scope="col">Status</th>
                    <th scope="col">Notes</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((visit) => (
                    <tr key={visit.id}>
                      <td>{visit.openedAt.toLocaleDateString("en-KE")} {visit.openedAt.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td>{visit.status.replaceAll("_", " ")}</td>
                      <td>{visit.notes ?? "—"}</td>
                      <td>
                        <Link href={`/visits/${visit.id}`} className={styles.tableAction}>Open <span aria-hidden="true">→</span></Link>
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
