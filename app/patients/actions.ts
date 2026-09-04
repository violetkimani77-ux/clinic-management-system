"use server";

import { revalidatePath } from "next/cache";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createPatient } from "@/lib/patients/registry";

/**
 * Server action for staff patient registration.
 *
 * Authorization is enforced on the server; the browser is never trusted to
 * decide which clinic or permissions apply to this operation.
 */
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
