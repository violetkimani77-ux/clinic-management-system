"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createPatient, updatePatient } from "@/lib/patients/registry";

/** Server action for staff patient registration. */
export async function registerPatient(formData: FormData) {
  const context = await requireClinicPermission(PERMISSIONS.PATIENTS_CREATE);
  const dateOfBirthValue = String(formData.get("dateOfBirth") ?? "").trim();
  if (dateOfBirthValue && Number.isNaN(Date.parse(`${dateOfBirthValue}T00:00:00.000Z`))) {
    throw new Error("INVALID_DATE_OF_BIRTH");
  }

  await createPatient(context, {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    dateOfBirth: dateOfBirthValue ? new Date(`${dateOfBirthValue}T00:00:00.000Z`) : null,
    phone: String(formData.get("phone") ?? "") || null,
    email: String(formData.get("email") ?? "") || null,
    address: String(formData.get("address") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
  });

  revalidatePath("/patients");
}

/**
 * Updates patient registry data after a fresh server-side permission and
 * tenant check. A successful save returns the staff member to the patient
 * profile; the profile remains the read-focused source of patient history.
 */
export async function updatePatientRecord(formData: FormData) {
  const context = await requireClinicPermission(PERMISSIONS.PATIENTS_UPDATE);
  const patientId = String(formData.get("patientId") ?? "").trim();
  const dateOfBirthValue = String(formData.get("dateOfBirth") ?? "").trim();

  if (!patientId) throw new Error("PATIENT_ID_REQUIRED");
  if (dateOfBirthValue && Number.isNaN(Date.parse(`${dateOfBirthValue}T00:00:00.000Z`))) {
    throw new Error("INVALID_DATE_OF_BIRTH");
  }

  await updatePatient(context, patientId, {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    dateOfBirth: dateOfBirthValue ? new Date(`${dateOfBirthValue}T00:00:00.000Z`) : null,
    phone: String(formData.get("phone") ?? "") || null,
    email: String(formData.get("email") ?? "") || null,
    address: String(formData.get("address") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
  });

  revalidatePath("/patients");
  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/edit`);
  redirect(`/patients/${patientId}`);
}
