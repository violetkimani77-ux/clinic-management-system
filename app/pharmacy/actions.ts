"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { dispensePrescription } from "@/lib/pharmacy/registry";

/**
 * Dispenses one complete prescription after a fresh pharmacy permission check.
 * Stock allocation, dispensing records, audit logging and prescription status
 * changes are performed atomically by the pharmacy domain transaction.
 */
export async function dispensePrescriptionAction(formData: FormData) {
  const context = await requireClinicPermission(PERMISSIONS.PHARMACY_DISPENSE);
  const prescriptionId = String(formData.get("prescriptionId") ?? "").trim();

  if (!prescriptionId) throw new Error("PRESCRIPTION_ID_REQUIRED");

  await dispensePrescription(context, prescriptionId);

  revalidatePath("/pharmacy");
  revalidatePath("/dashboard");
  redirect("/pharmacy");
}
