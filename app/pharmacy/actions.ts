"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { dispensePrescription } from "@/lib/pharmacy/registry";

export async function dispensePrescriptionAction(formData: FormData) {
  const context = await requireClinicPermission(PERMISSIONS.PHARMACY_DISPENSE);
  const prescriptionId = String(formData.get("prescriptionId") ?? "").trim();
  const partial = formData.get("partial") === "true";
  if (!prescriptionId) throw new Error("PRESCRIPTION_ID_REQUIRED");

  try {
    let requestedQuantities: Record<string, number> | undefined;
    if (partial) {
      requestedQuantities = {};
      for (const [key, value] of formData.entries()) {
        if (!key.startsWith("quantity_")) continue;
        const medicineId = key.slice("quantity_".length);
        const quantity = Number(String(value).trim());
        if (!medicineId || !Number.isInteger(quantity) || quantity < 0) throw new Error("INVALID_DISPENSING_QUANTITY");
        requestedQuantities[medicineId] = quantity;
      }
    }
    await dispensePrescription(context, prescriptionId, requestedQuantities);
  } catch (error) {
    console.error("Pharmacy dispensing failed", { clinicId: context.clinicId, userId: context.userId, prescriptionId, error });
    throw error;
  }

  revalidatePath("/pharmacy");
  revalidatePath("/dashboard");
  redirect("/pharmacy");
}
