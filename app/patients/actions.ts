"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createPatient, updatePatient } from "@/lib/patients/registry";

/** State returned to the patient edit form for expected user-correctable errors. */
export type PatientEditState = {
  message: string;
  success: boolean;
};

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
 * tenant check. Expected validation errors are returned to the form instead
 * of throwing, while successful mutations revalidate and redirect.
 */
export async function updatePatientRecord(
  _previousState: PatientEditState,
  formData: FormData,
): Promise<PatientEditState> {
  const context = await requireClinicPermission(PERMISSIONS.PATIENTS_UPDATE);
  const patientId = String(formData.get("patientId") ?? "").trim();
  const dateOfBirthValue = String(formData.get("dateOfBirth") ?? "").trim();

  if (!patientId) {
    return { message: "The patient record could not be identified.", success: false };
  }

  if (
    dateOfBirthValue &&
    Number.isNaN(Date.parse(`${dateOfBirthValue}T00:00:00.000Z`))
  ) {
    return { message: "Please enter a valid date of birth.", success: false };
  }

  try {
    await updatePatient(context, patientId, {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      dateOfBirth: dateOfBirthValue
        ? new Date(`${dateOfBirthValue}T00:00:00.000Z`)
        : null,
      phone: String(formData.get("phone") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      address: String(formData.get("address") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PATIENT_NAME_REQUIRED") {
      return { message: "First name and last name are required.", success: false };
    }

    if (error instanceof Error && error.message === "PATIENT_NOT_FOUND") {
      return { message: "This patient record is no longer available.", success: false };
    }

    throw error;
  }

  revalidatePath("/patients");
  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/edit`);
  redirect(`/patients/${patientId}`);
}
