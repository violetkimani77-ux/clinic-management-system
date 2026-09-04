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
          <Link href="/dashboard" className={styles.backLink}>
            ← Back to Dashboard
          </Link>
        </nav>

        <header className={styles.hero}>
          <p className={styles.eyebrow}>Patient registry</p>
          <h1 className={styles.title}>Patients</h1>
          <p className={styles.description}>
            Search, register and update the shared patient record used across clinic workflows.
          </p>
        </header>

        <section className={styles.section} aria-label="Patient search and registration">
          <h2 className={styles.sectionTitle}>Find a patient</h2>
          <p className={styles.sectionDescription}>
            Search by patient number, name or phone number.
          </p>
          <form method="get" style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <input
              name="q"
              defaultValue={query}
              placeholder="Search patient number, name or phone"
              aria-label="Search patients"
              style={{
                flex: 1,
                minWidth: 0,
                padding: "11px 13px",
                border: "1px solid #cbd5e1",
                borderRadius: 9,
                font: "inherit",
              }}
            />
            <button type="submit" style={{ padding: "11px 18px" }}>
              Search
            </button>
          </form>

          {canCreate ? (
            <details style={{ marginTop: 18 }}>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                Register a new patient
              </summary>
              <form
                action={registerPatient}
                style={{ display: "grid", gap: 12, marginTop: 16, maxWidth: 620 }}
              >
                <input name="firstName" placeholder="First name" required aria-label="First name" />
                <input name="lastName" placeholder="Last name" required aria-label="Last name" />
                <input name="dateOfBirth" type="date" aria-label="Date of birth" />
                <input name="phone" type="tel" placeholder="Phone" aria-label="Phone" />
                <input name="email" type="email" placeholder="Email" aria-label="Email" />
                <input name="address" placeholder="Address" aria-label="Address" />
                <textarea name="notes" placeholder="Notes" aria-label="Notes" rows={3} />
                <button type="submit">Save patient</button>
              </form>
            </details>
          ) : null}
        </section>

        <section className={styles.section} aria-label="Patient registry results">
          <h2 className={styles.sectionTitle}>
            {query ? `Search results for “${query}”` : "Active patients"}
          </h2>
          <p className={styles.sectionDescription}>
            {patients.length} {patients.length === 1 ? "record" : "records"} shown.
          </p>

          {patients.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>No patients found.</strong>
              <p>Try another search, or register a new patient if you have permission.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto", marginTop: 18 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
                <thead>
                  <tr>
                    {[
                      "Patient No.",
                      "Name",
                      "Phone",
                      "Date of birth",
                      "Action",
                    ].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        style={{
                          padding: "12px 14px",
                          borderBottom: "1px solid #e2e8f0",
                          textAlign: "left",
                          color: "#64748b",
                          fontSize: 12,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.id}>
                      <td style={{ padding: "14px", borderBottom: "1px solid #f1f5f9" }}>
                        {patient.patientNo}
                      </td>
                      <td style={{ padding: "14px", borderBottom: "1px solid #f1f5f9" }}>
                        <Link href={`/patients/${patient.id}`}>
                          {patient.firstName} {patient.lastName}
                        </Link>
                      </td>
                      <td style={{ padding: "14px", borderBottom: "1px solid #f1f5f9" }}>
                        {patient.phone ?? "—"}
                      </td>
                      <td style={{ padding: "14px", borderBottom: "1px solid #f1f5f9" }}>
                        {patient.dateOfBirth
                          ? patient.dateOfBirth.toISOString().slice(0, 10)
                          : "—"}
                      </td>
                      <td style={{ padding: "14px", borderBottom: "1px solid #f1f5f9" }}>
                        <Link href={`/patients/${patient.id}`}>
                          {canUpdate ? "Edit" : "View"}
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
