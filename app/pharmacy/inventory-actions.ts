"use server";

import { revalidatePath } from "next/cache";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { adjustStock, createMedicine, receiveStock, returnOrDisposeStock } from "@/lib/pharmacy/inventory";

function parseMoney(value: FormDataEntryValue | null) {
  const amount = Number(String(value ?? "").trim());
  if (!Number.isFinite(amount) || amount < 0) throw new Error("INVALID_MONEY");
  return amount;
}

function parseFutureDate(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (!raw || Number.isNaN(date.getTime())) throw new Error("INVALID_EXPIRY_DATE");
  return date;
}

export async function createMedicineAction(formData: FormData) {
  const context = await requireClinicPermission(PERMISSIONS.PHARMACY_STOCK_ADJUST);

  await createMedicine(context, {
    name: String(formData.get("name") ?? ""),
    strength: String(formData.get("strength") ?? ""),
    form: String(formData.get("form") ?? ""),
    reorderLevel: Number(String(formData.get("reorderLevel") ?? "0")),
  });

  revalidatePath("/pharmacy");
  revalidatePath("/pharmacy/inventory");
}

export async function receiveStockAction(formData: FormData) {
  const context = await requireClinicPermission(PERMISSIONS.PHARMACY_STOCK_ADJUST);

  await receiveStock(context, {
    medicineId: String(formData.get("medicineId") ?? "").trim(),
    batchNumber: String(formData.get("batchNumber") ?? ""),
    expiryDate: parseFutureDate(formData.get("expiryDate")),
    quantity: Number(String(formData.get("quantity") ?? "0")),
    unitCost: parseMoney(formData.get("unitCost")),
    sellingPrice: parseMoney(formData.get("sellingPrice")),
    supplierName: String(formData.get("supplierName") ?? ""),
  });

  revalidatePath("/pharmacy");
  revalidatePath("/pharmacy/inventory");
  revalidatePath("/dashboard");
}

export async function adjustStockAction(formData: FormData) {
  const context = await requireClinicPermission(PERMISSIONS.PHARMACY_STOCK_ADJUST);

  await adjustStock(context, {
    batchId: String(formData.get("batchId") ?? "").trim(),
    delta: Number(String(formData.get("delta") ?? "0")),
    reason: String(formData.get("reason") ?? ""),
  });

  revalidatePath("/pharmacy");
  revalidatePath("/pharmacy/inventory");
  revalidatePath("/dashboard");
}

export async function returnOrDisposeStockAction(formData: FormData) {
  const context = await requireClinicPermission(PERMISSIONS.PHARMACY_STOCK_ADJUST);
  const operation = String(formData.get("operation") ?? "").trim();
  if (operation !== "RETURN" && operation !== "DISPOSAL") throw new Error("INVALID_STOCK_OPERATION");

  await returnOrDisposeStock(context, {
    batchId: String(formData.get("batchId") ?? "").trim(),
    operation,
    quantity: Number(String(formData.get("quantity") ?? "0")),
    reason: String(formData.get("reason") ?? ""),
  });

  revalidatePath("/pharmacy");
  revalidatePath("/pharmacy/inventory");
  revalidatePath("/dashboard");
}
