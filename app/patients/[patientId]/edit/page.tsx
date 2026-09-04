import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import styles from "@/components/dashboard/workspace-page.module.css";
import { PatientEditForm } from "./patient-edit-form";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPatientProfile } from "@/lib/patients/registry";

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
        <div className={styles.pageUtility}>
          <Link href={`/patients/${patient.id}`} className={styles.backLink}>Back to patient profile</Link>
        </div>

        <header className={styles.editHero}>
          <div>
            <p className={styles.eyebrow}>Patient registry</p>
            <h1 className={styles.title}>Edit patient</h1>
            <p className={styles.description}>
              Update registry information for {patient.firstName} {patient.lastName}.
            </p>
            <p className={styles.patientNumber}>Patient No. {patient.patientNo}</p>
          </div>
          <span className={styles.auditBadge}>Changes are audit logged</span>
        </header>

        <section className={styles.section} aria-labelledby="edit-patient-information">
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionKicker}>Registry details</p>
              <h2 id="edit-patient-information" className={styles.sectionTitle}>Patient information</h2>
              <p className={styles.sectionDescription}>
                Keep contact and demographic information current. Visits, prescriptions and billing remain separate records.
              </p>
            </div>
          </div>

          <PatientEditForm
            patientId={patient.id}
            firstName={patient.firstName}
            lastName={patient.lastName}
            dateOfBirth={patient.dateOfBirth?.toISOString().slice(0, 10) ?? ""}
            phone={patient.phone ?? ""}
            email={patient.email ?? ""}
            address={patient.address ?? ""}
            notes={patient.notes ?? ""}
          />
        </section>
      </div>
    </WorkspaceShell>
  );
}
