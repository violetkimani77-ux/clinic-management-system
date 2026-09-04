import Link from "next/link";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { searchPatients } from "@/lib/patients/registry";
import { registerPatient } from "./actions";
import styles from "@/components/dashboard/workspace-page.module.css";

/**
 * Displays the shared patient registry. Patient data stays tenant-scoped in
 * the server-side registry layer; this page is responsible only for the UI.
 */
export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const context = await requireClinicPermission(PERMISSIONS.PATIENTS_VIEW);
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const patients = await searchPatients(context, query);
  const canCreate = context.permissions.has(PERMISSIONS.PATIENTS_CREATE);
  const canUpdate = context.permissions.has(PERMISSIONS.PATIENTS_UPDATE);

  return (
    <WorkspaceShell context={context} activeHref="/patients">
      <div className={styles.page}>
        <nav aria-label="Page navigation">
          <Link href="/dashboard" className={styles.backLink}>← Back to Dashboard</Link>
        </nav>

        <header className={styles.hero}>
          <p className={styles.eyebrow}>Patient registry</p>
          <h1 className={styles.title}>Patients</h1>
          <p className={styles.description}>
            Search, register and update the shared patient record used across clinic workflows.
          </p>
        </header>

        <section className={styles.section} aria-labelledby="patient-search">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="patient-search" className={styles.sectionTitle}>Find a patient</h2>
              <p className={styles.sectionDescription}>Search by patient number, name or phone number.</p>
            </div>
            {canCreate ? <span className={styles.permissionHint}>Registration enabled</span> : null}
          </div>

          <form method="get" className={styles.searchForm} role="search">
            <label htmlFor="patient-search-input" className={styles.srOnly}>Search patients</label>
            <input id="patient-search-input" name="q" defaultValue={query} placeholder="Search patient number, name or phone" autoComplete="off" className={styles.input} />
            <button type="submit" className={styles.primaryButton}>Search</button>
            {query ? <Link href="/patients" className={styles.secondaryButton}>Clear</Link> : null}
          </form>

          {canCreate ? (
            <details className={styles.details}>
              <summary className={styles.detailsSummary}>Register a new patient</summary>
              <p className={styles.formHint}>Only the patient registry is created here. Visits, prescriptions and billing remain separate workflows.</p>
              <form action={registerPatient} className={styles.patientForm}>
                <div className={styles.formGrid}>
                  <label className={styles.field}><span>First name <span aria-hidden="true">*</span></span><input name="firstName" required className={styles.input} /></label>
                  <label className={styles.field}><span>Last name <span aria-hidden="true">*</span></span><input name="lastName" required className={styles.input} /></label>
                  <label className={styles.field}><span>Date of birth</span><input name="dateOfBirth" type="date" className={styles.input} /></label>
                  <label className={styles.field}><span>Phone</span><input name="phone" type="tel" inputMode="tel" autoComplete="tel" className={styles.input} /></label>
                  <label className={styles.field}><span>Email</span><input name="email" type="email" autoComplete="email" className={styles.input} /></label>
                  <label className={styles.field}><span>Address</span><input name="address" autoComplete="street-address" className={styles.input} /></label>
                  <label className={`${styles.field} ${styles.fieldWide}`}><span>Notes</span><textarea name="notes" rows={3} className={styles.textarea} /></label>
                </div>
                <div className={styles.formActions}><button type="submit" className={styles.primaryButton}>Register patient</button></div>
              </form>
            </details>
          ) : null}
        </section>

        <section className={styles.section} aria-labelledby="patient-results">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="patient-results" className={styles.sectionTitle}>{query ? `Search results for “${query}”` : "Active patients"}</h2>
              <p className={styles.sectionDescription}>{patients.length} {patients.length === 1 ? "record" : "records"} shown{patients.length === 50 ? " (maximum 50)" : ""}.</p>
            </div>
          </div>

          {patients.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>{query ? "No patients found." : "No active patients yet."}</strong>
              <p>{query ? "Try another patient number, name or phone number." : canCreate ? "Register the first patient to begin building the clinic registry." : "No active patient records are available to this workspace."}</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className={styles.srOnly}>Active patient registry</caption>
                <thead><tr><th scope="col">Patient No.</th><th scope="col">Name</th><th scope="col">Phone</th><th scope="col">Date of birth</th><th scope="col">Actions</th></tr></thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.id}>
                      <td className={styles.patientNumber}>{patient.patientNo}</td>
                      <td><Link href={`/patients/${patient.id}`} className={styles.patientLink}>{patient.firstName} {patient.lastName}</Link></td>
                      <td>{patient.phone ?? "—"}</td>
                      <td>{patient.dateOfBirth ? patient.dateOfBirth.toISOString().slice(0, 10) : "—"}</td>
                      <td>
                        <div className={styles.profileActions}>
                          <Link href={`/patients/${patient.id}`} className={styles.secondaryButton}>View</Link>
                          {canUpdate ? <Link href={`/patients/${patient.id}/edit`} className={styles.primaryButton}>Edit</Link> : null}
                        </div>
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
