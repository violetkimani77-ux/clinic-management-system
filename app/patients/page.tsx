import Link from "next/link";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { searchPatients } from "@/lib/patients/registry";
import { registerPatient } from "./actions";

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

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
      <nav aria-label="Page navigation" style={{ marginBottom: 28 }}>
        <Link href="/dashboard">← Dashboard</Link>
      </nav>
      <p style={{ margin: 0, color: "#6b7280", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
        Patient registry
      </p>
      <h1 style={{ margin: "8px 0" }}>Patients</h1>
      <p style={{ color: "#6b7280" }}>Shared patient records for authorized clinic staff.</p>

      <form method="get" style={{ display: "flex", gap: 8, marginTop: 24 }}>
        <input name="q" defaultValue={query} placeholder="Search patient number, name or phone" aria-label="Search patients" style={{ flex: 1, padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8 }} />
        <button type="submit" style={{ padding: "10px 16px" }}>Search</button>
      </form>

      {canCreate ? (
        <details style={{ marginTop: 24, border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, background: "#fff" }}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>Register patient</summary>
          <form action={registerPatient} style={{ display: "grid", gap: 12, marginTop: 16, maxWidth: 620 }}>
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

      <section style={{ marginTop: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: 18, borderBottom: "1px solid #e5e7eb", fontWeight: 700 }}>{query ? `Search results for “${query}”` : "Active patients"}</div>
        {patients.length === 0 ? (
          <p style={{ padding: 20, color: "#6b7280" }}>No patients found.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={{ textAlign: "left", padding: 14 }}>Patient No.</th><th style={{ textAlign: "left", padding: 14 }}>Name</th><th style={{ textAlign: "left", padding: 14 }}>Phone</th><th style={{ textAlign: "left", padding: 14 }}>Date of birth</th></tr></thead>
              <tbody>{patients.map((patient) => <tr key={patient.id}><td style={{ padding: 14 }}>{patient.patientNo}</td><td style={{ padding: 14 }}>{patient.firstName} {patient.lastName}</td><td style={{ padding: 14 }}>{patient.phone ?? "—"}</td><td style={{ padding: 14 }}>{patient.dateOfBirth ? patient.dateOfBirth.toISOString().slice(0, 10) : "—"}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
