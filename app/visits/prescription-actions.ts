"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createPrescription, sendPrescriptionToPharmacy } from "@/lib/prescriptions/registry";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

/** Creates one prescription from the visit workspace. */
export async function createPrescriptionAction(formData: FormData) {
  const context = await requireClinicPermission(PERMISSIONS.PRESCRIPTIONS_CREATE);
  const visitId = text(formData, "visitId");
  const medicineId = text(formData, "medicineId");
  const quantity = Number(text(formData, "quantity"));

  if (!visitId || !medicineId) throw new Error("PRESCRIPTION_FIELDS_REQUIRED");
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("INVALID_PRESCRIPTION_QUANTITY");

  await createPrescription(context, {
    visitId,
    notes: text(formData, "notes") || null,
    items: [{
      medicineId,
      quantity,
      dosage: text(formData, "dosage") || null,
      frequency: text(formData, "frequency") || null,
      duration: text(formData, "duration") || null,
      instructions: text(formData, "instructions") || null,
    }],
  });

  revalidatePath(`/visits/${visitId}`);
  revalidatePath("/pharmacy");
  redirect(`/visits/${visitId}`);
}

/** Explicitly sends a draft prescription into the Pharmacy queue. */
export async function sendPrescriptionToPharmacyAction(formData: FormData) {
  const context = await requireClinicPermission(PERMISSIONS.PRESCRIPTIONS_SEND);
  const prescriptionId = text(formData, "prescriptionId");
  if (!prescriptionId) throw new Error("PRESCRIPTION_ID_REQUIRED");

  const prescription = await sendPrescriptionToPharmacy(context, prescriptionId);
  revalidatePath(`/visits/${prescription.visitId}`);
  revalidatePath("/pharmacy");
  redirect(`/visits/${prescription.visitId}`);
}
