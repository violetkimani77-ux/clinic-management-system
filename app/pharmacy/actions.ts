"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { dispensePrescription } from "@/lib/pharmacy/registry";

export async function dispensePrescriptionAction(formData: FormData) {
  const context = await requireClinicPermission(PERMISSIONS.PHARMACY_DISPENSE);
  const prescriptionId = String(formData.get("prescriptionId") ?? "").trim();
  const requestedQuantity = String(formData.get("requestedQuantity") ?? "").trim();

  if (!prescriptionId) throw new Error("PRESCRIPTION_ID_REQUIRED");

  try {
    const quantities = requestedQuantity ? Number(requestedQuantity) : undefined;
    if (quantities !== undefined && (!Number.isInteger(quantities) || quantities <= 0)) throw new Error("INVALID_DISPENSING_QUANTITY");
    await dispensePrescription(context, prescriptionId, quantities === undefined ? undefined : { [String(formData.get("medicineId") ?? "")]: quantities });
  } catch (error) {
    console.error("Pharmacy dispensing failed", {
      clinicId: context.clinicId,
      userId: context.userId,
      prescriptionId,
      error,
    });
    throw error;
  }

  revalidatePath("/pharmacy");
  revalidatePath("/dashboard");
  redirect("/pharmacy");
}
