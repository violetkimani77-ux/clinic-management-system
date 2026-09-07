"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { dispensePartialPrescription } from "@/lib/pharmacy/partial";

export async function dispensePartialPrescriptionAction(formData: FormData) {
  const context = await requireClinicPermission(PERMISSIONS.PHARMACY_DISPENSE);
  const prescriptionId = String(formData.get("prescriptionId") ?? "").trim();
  if (!prescriptionId) throw new Error("PRESCRIPTION_ID_REQUIRED");
  const requested: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("quantity_")) continue;
    const itemId = key.slice("quantity_".length);
    const quantity = Number(value);
    if (!Number.isInteger(quantity) || quantity < 0) throw new Error("INVALID_DISPENSING_QUANTITY");
    requested[itemId] = quantity;
  }
  await dispensePartialPrescription(context, prescriptionId, requested);
  revalidatePath("/pharmacy");
  revalidatePath("/dashboard");
  redirect("/pharmacy");
}
