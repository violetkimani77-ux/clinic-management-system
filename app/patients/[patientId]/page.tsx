import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import styles from "@/components/dashboard/workspace-page.module.css";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPatientProfile } from "@/lib/patients/registry";
import { listVisits } from "@/lib/visits/registry";
import { openVisit } from "@/app/visits/actions";
import { updatePatientRecord } from "../actions";

/**
 * Displays a clinic-scoped patient record and its editable registry fields.
 * Visit history is shown here as the first shared clinical workflow surface.
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
          <Link href="/dashboard" className={styles.backLink}>← Back to Dashboard</Link>
        </nav>

        <header className={styles.hero}>
          <p className={styles.eyebrow}>Patient profile</p>
          <h1 className={styles.title}>{patient.firstName} {patient.lastName}</h1>
          <p className={styles.description}>Patient No. {patient.patientNo}</p>
        </header>

        <section className={styles.section} aria-labelledby="patient-actions">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="patient-actions" className={styles.sectionTitle}>Clinical workflow</h2>
              <p className={styles.sectionDescription}>Start a new encounter or review this patient&apos;s existing visits.</p>
            </div>
          </div>
          {canOpenVisit ? (
            <form action={openVisit} className={styles.formActions}>
              <input type="hidden" name="patientId" value={patient.id} />
              <button type="submit" className={styles.primaryButton}>Start new visit</button>
            </form>
          ) : (
            <p className={styles.permissionHint}>You can view visits, but you do not have permission to open a new one.</p>
          )}

          {visits.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>No visits recorded.</strong>
              <p>The patient has no visit history yet.</p>
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

        <section className={styles.section} aria-labelledby="patient-information">
          <h2 id="patient-information" className={styles.sectionTitle}>Patient information</h2>
          {canUpdate ? (
            <form action={updatePatientRecord} className={styles.patientForm}>
              <input type="hidden" name="patientId" value={patient.id} />
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>First name <span aria-hidden="true">*</span></span>
                  <input name="firstName" defaultValue={patient.firstName} required className={styles.input} />
                </label>
                <label className={styles.field}>
                  <span>Last name <span aria-hidden="true">*</span></span>
                  <input name="lastName" defaultValue={patient.lastName} required className={styles.input} />
                </label>
                <label className={styles.field}>
                  <span>Date of birth</span>
                  <input name="dateOfBirth" type="date" defaultValue={patient.dateOfBirth?.toISOString().slice(0, 10) ?? ""} className={styles.input} />
                </label>
                <label className={styles.field}>
                  <span>Phone</span>
                  <input name="phone" type="tel" defaultValue={patient.phone ?? ""} className={styles.input} />
                </label>
                <label className={styles.field}>
                  <span>Email</span>
                  <input name="email" type="email" defaultValue={patient.email ?? ""} className={styles.input} />
                </label>
                <label className={styles.field}>
                  <span>Address</span>
                  <input name="address" defaultValue={patient.address ?? ""} className={styles.input} />
                </label>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span>Notes</span>
                  <textarea name="notes" rows={4} defaultValue={patient.notes ?? ""} className={styles.textarea} />
                </label>
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.primaryButton}>Save changes</button>
              </div>
            </form>
          ) : (
            <dl className={styles.details}>
              <div><dt>First name</dt><dd>{patient.firstName}</dd></div>
              <div><dt>Last name</dt><dd>{patient.lastName}</dd></div>
              <div><dt>Date of birth</dt><dd>{patient.dateOfBirth?.toISOString().slice(0, 10) ?? "—"}</dd></div>
              <div><dt>Phone</dt><dd>{patient.phone ?? "—"}</dd></div>
              <div><dt>Email</dt><dd>{patient.email ?? "—"}</dd></div>
              <div><dt>Address</dt><dd>{patient.address ?? "—"}</dd></div>
            </dl>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
