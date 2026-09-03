export default function PatientsPage() {
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
      <p style={{ margin: 0, color: "#6b7280", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
        Patient registry
      </p>
      <h1 style={{ margin: "8px 0" }}>Patients</h1>
      <p style={{ color: "#6b7280" }}>
        The shared patient record will be managed here and used by pharmacy and accounts according to their permissions.
      </p>
      <section style={{ marginTop: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24 }}>
        <strong>Registry ready for implementation</strong>
        <p style={{ marginBottom: 0, color: "#6b7280" }}>
          Search, registration, patient details and history will be connected to PostgreSQL through the server layer next.
        </p>
      </section>
    </main>
  );
}
