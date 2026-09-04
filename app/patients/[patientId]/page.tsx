import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPatientProfile } from "@/lib/patients/registry";
import { updatePatientRecord } from "../actions";

/**
 * Displays a single clinic-scoped patient record and its editable registry
 * fields. Clinical history will be added here as those workflows are built.
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

  const canUpdate = context.permissions.has(PERMISSIONS.PATIENTS_UPDATE);

  return (
    <WorkspaceShell context={context} activeHref="/patients">
      <nav aria-label="Page navigation" style={{ marginBottom: 28 }}>
        <Link href="/dashboard">← Back to Dashboard</Link>
      </nav>

      <section style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "24px 26px", marginBottom: 24 }}>
        <p style={{ margin: 0, color: "#6b7280", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
          Patient profile
        </p>
        <h1 style={{ margin: "8px 0 4px", fontSize: 30 }}>{patient.firstName} {patient.lastName}</h1>
        <p style={{ margin: 0, color: "#6b7280" }}>Patient No. {patient.patientNo}</p>
      </section>

      <section style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 26, maxWidth: 760 }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 20 }}>Patient information</h2>

        {canUpdate ? (
          <form action={updatePatientRecord} style={{ display: "grid", gap: 16 }}>
            <input type="hidden" name="patientId" value={patient.id} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <label style={{ display: "grid", gap: 6, fontWeight: 600 }}>
                First name
                <input name="firstName" defaultValue={patient.firstName} required />
              </label>
              <label style={{ display: "grid", gap: 6, fontWeight: 600 }}>
                Last name
                <input name="lastName" defaultValue={patient.lastName} required />
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <label style={{ display: "grid", gap: 6, fontWeight: 600 }}>
                Date of birth
                <input name="dateOfBirth" type="date" defaultValue={patient.dateOfBirth?.toISOString().slice(0, 10) ?? ""} />
              </label>
              <label style={{ display: "grid", gap: 6, fontWeight: 600 }}>
                Phone
                <input name="phone" type="tel" defaultValue={patient.phone ?? ""} />
              </label>
            </div>
            <label style={{ display: "grid", gap: 6, fontWeight: 600 }}>
              Email
              <input name="email" type="email" defaultValue={patient.email ?? ""} />
            </label>
            <label style={{ display: "grid", gap: 6, fontWeight: 600 }}>
              Address
              <input name="address" defaultValue={patient.address ?? ""} />
            </label>
            <label style={{ display: "grid", gap: 6, fontWeight: 600 }}>
              Notes
              <textarea name="notes" rows={4} defaultValue={patient.notes ?? ""} />
            </label>
            <div>
              <button type="submit" style={{ padding: "10px 18px" }}>Save changes</button>
            </div>
          </form>
        ) : (
          <dl style={{ display: "grid", gap: 14, margin: 0 }}>
            <div><dt style={{ fontWeight: 700 }}>Date of birth</dt><dd style={{ margin: "3px 0 0" }}>{patient.dateOfBirth?.toISOString().slice(0, 10) ?? "—"}</dd></div>
            <div><dt style={{ fontWeight: 700 }}>Phone</dt><dd style={{ margin: "3px 0 0" }}>{patient.phone ?? "—"}</dd></div>
            <div><dt style={{ fontWeight: 700 }}>Email</dt><dd style={{ margin: "3px 0 0" }}>{patient.email ?? "—"}</dd></div>
            <div><dt style={{ fontWeight: 700 }}>Address</dt><dd style={{ margin: "3px 0 0" }}>{patient.address ?? "—"}</dd></div>
          </dl>
        )}
      </section>
    </WorkspaceShell>
  );
}
