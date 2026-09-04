import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import styles from "@/components/dashboard/workspace-page.module.css";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPatientProfile } from "@/lib/patients/registry";
import { updatePatientRecord } from "../../actions";

/**
 * Provides a focused edit surface for patient registry fields.
 * Clinical history stays on the read-focused patient profile page.
 */
export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const context = await requireClinicPermission(PERMISSIONS.PATIENTS_UPDATE);
  const { patientId } = await params;
  const patient = await getPatientProfile(context, patientId);

  if (!patient) notFound();

  return (
    <WorkspaceShell context={context} activeHref="/patients">
      <div className={styles.page}>
        <nav aria-label="Page navigation">
          <Link href={`/patients/${patient.id}`} className={styles.backLink}>
            ← Back to patient
          </Link>
        </nav>

        <header className={styles.hero}>
          <p className={styles.eyebrow}>Patient registry</p>
          <h1 className={styles.title}>Edit patient</h1>
          <p className={styles.description}>
            Update registry information for {patient.firstName} {patient.lastName}. Patient No. {patient.patientNo} stays unchanged.
          </p>
        </header>

        <section className={styles.section} aria-labelledby="edit-patient-information">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="edit-patient-information" className={styles.sectionTitle}>Patient information</h2>
              <p className={styles.sectionDescription}>
                Changes are recorded in the audit log. Visits, prescriptions and billing are separate clinical and financial records.
              </p>
            </div>
          </div>

          <form action={updatePatientRecord} className={styles.patientForm}>
            <input type="hidden" name="patientId" value={patient.id} />
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>First name <span aria-hidden="true">*</span></span>
                <input name="firstName" defaultValue={patient.firstName} required className={styles.input} autoComplete="given-name" />
              </label>
              <label className={styles.field}>
                <span>Last name <span aria-hidden="true">*</span></span>
                <input name="lastName" defaultValue={patient.lastName} required className={styles.input} autoComplete="family-name" />
              </label>
              <label className={styles.field}>
                <span>Date of birth</span>
                <input name="dateOfBirth" type="date" defaultValue={patient.dateOfBirth?.toISOString().slice(0, 10) ?? ""} className={styles.input} />
              </label>
              <label className={styles.field}>
                <span>Phone</span>
                <input name="phone" type="tel" inputMode="tel" defaultValue={patient.phone ?? ""} className={styles.input} autoComplete="tel" />
              </label>
              <label className={styles.field}>
                <span>Email</span>
                <input name="email" type="email" defaultValue={patient.email ?? ""} className={styles.input} autoComplete="email" />
              </label>
              <label className={styles.field}>
                <span>Address</span>
                <input name="address" defaultValue={patient.address ?? ""} className={styles.input} autoComplete="street-address" />
              </label>
              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span>Notes</span>
                <textarea name="notes" rows={5} defaultValue={patient.notes ?? ""} className={styles.textarea} />
              </label>
            </div>

            <div className={styles.formActions}>
              <Link href={`/patients/${patient.id}`} className={styles.secondaryButton}>Cancel</Link>
              <button type="submit" className={styles.primaryButton}>Save changes</button>
            </div>
          </form>
        </section>
      </div>
    </WorkspaceShell>
  );
}
