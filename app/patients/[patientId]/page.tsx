import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPatientProfile } from "@/lib/patients/registry";
import { updatePatient } from "../actions";

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
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
      <nav aria-label="Page navigation" style={{ marginBottom: 28 }}>
        <Link href="/patients">← Patients</Link>
      </nav>
      <p style={{ margin: 0, color: "#6b7280", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
        Patient profile
      </p>
      <h1 style={{ margin: "8px 0" }}>{patient.firstName} {patient.lastName}</h1>
      <p style={{ color: "#6b7280" }}>{patient.patientNo}</p>

      {canUpdate ? (
        <form action={updatePatient} style={{ display: "grid", gap: 14, marginTop: 28, maxWidth: 620 }}>
          <input type="hidden" name="patientId" value={patient.id} />
          <label>First name<input name="firstName" defaultValue={patient.firstName} required /></label>
          <label>Last name<input name="lastName" defaultValue={patient.lastName} required /></label>
          <label>Date of birth<input name="dateOfBirth" type="date" defaultValue={patient.dateOfBirth?.toISOString().slice(0, 10) ?? ""} /></label>
          <label>Phone<input name="phone" type="tel" defaultValue={patient.phone ?? ""} /></label>
          <label>Email<input name="email" type="email" defaultValue={patient.email ?? ""} /></label>
          <label>Address<input name="address" defaultValue={patient.address ?? ""} /></label>
          <label>Notes<textarea name="notes" rows={4} defaultValue={patient.notes ?? ""} /></label>
          <button type="submit">Save changes</button>
        </form>
      ) : (
        <section style={{ marginTop: 28, display: "grid", gap: 12 }}>
          <p><strong>Date of birth:</strong> {patient.dateOfBirth?.toISOString().slice(0, 10) ?? "—"}</p>
          <p><strong>Phone:</strong> {patient.phone ?? "—"}</p>
          <p><strong>Email:</strong> {patient.email ?? "—"}</p>
          <p><strong>Address:</strong> {patient.address ?? "—"}</p>
        </section>
      )}
    </main>
  );
}
