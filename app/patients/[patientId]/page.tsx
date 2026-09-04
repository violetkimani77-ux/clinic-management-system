import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import styles from "@/components/dashboard/workspace-page.module.css";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPatientProfile } from "@/lib/patients/registry";
import { listVisits } from "@/lib/visits/registry";
import { openVisit } from "../../../visits/actions";

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
        <div className={styles.pageUtility}>
          <Link href="/patients" className={styles.backLink}>Back to Patients</Link>
        </div>

        <header className={styles.patientHero}>
          <div>
            <p className={styles.eyebrow}>Patient profile</p>
            <div className={styles.patientTitleRow}>
              <h1 className={styles.title}>{patient.firstName} {patient.lastName}</h1>
              <span className={styles.statusBadge}>Active</span>
            </div>
            <p className={styles.patientNumber}>Patient No. {patient.patientNo}</p>
          </div>

          <div className={styles.profileActions} aria-label="Patient actions">
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
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionKicker}>Registry</p>
              <h2 id="patient-summary" className={styles.sectionTitle}>Patient information</h2>
              <p className={styles.sectionDescription}>Basic registry information for this patient.</p>
            </div>
          </div>

          <dl className={styles.profileDetails}>
            <div><dt>First name</dt><dd>{patient.firstName}</dd></div>
            <div><dt>Last name</dt><dd>{patient.lastName}</dd></div>
            <div><dt>Date of birth</dt><dd>{patient.dateOfBirth?.toISOString().slice(0, 10) ?? "Not provided"}</dd></div>
            <div><dt>Phone</dt><dd>{patient.phone ?? "Not provided"}</dd></div>
            <div><dt>Email</dt><dd>{patient.email ?? "Not provided"}</dd></div>
            <div><dt>Address</dt><dd>{patient.address ?? "Not provided"}</dd></div>
            <div className={styles.profileDetailWide}><dt>Notes</dt><dd>{patient.notes ?? "No notes recorded"}</dd></div>
          </dl>
        </section>

        <section className={styles.section} aria-labelledby="clinical-workflow">
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionKicker}>Care history</p>
              <h2 id="clinical-workflow" className={styles.sectionTitle}>Clinical workflow</h2>
              <p className={styles.sectionDescription}>Review existing visits and continue the care workflow.</p>
            </div>
            {!canOpenVisit ? (
              <span className={styles.permissionHint}>View-only visit access</span>
            ) : null}
          </div>

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
                      <td><span className={styles.visitStatus}>{visit.status.replaceAll("_", " ")}</span></td>
                      <td>{visit.notes ?? "—"}</td>
                      <td>
                        <Link href={`/visits/${visit.id}`} className={styles.tableAction}>Open visit</Link>
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
