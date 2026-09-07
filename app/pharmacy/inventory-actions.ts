"use server";

import { revalidatePath } from "next/cache";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { adjustStock, createMedicine, disposeExpiredStock, receiveStock, recordExpiredStock, returnStockToSupplier } from "@/lib/pharmacy/inventory";

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

function parsePositiveInteger(value: FormDataEntryValue | null) {
  const amount = Number(String(value ?? "").trim());
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("INVALID_STOCK_QUANTITY");
  return amount;
}

function parseReason(value: FormDataEntryValue | null) {
  const reason = String(value ?? "").trim();
  if (!reason) throw new Error("STOCK_REMOVAL_REASON_REQUIRED");
  return reason;
}

export async function createMedicineAction(formData: FormData) {
  const context = await requireClinicPermission(PERMISSIONS.PHARMACY_STOCK_ADJUST);
  await createMedicine(context, { name: String(formData.get("name") ?? ""), strength: String(formData.get("strength") ?? ""), form: String(formData.get("form") ?? ""), reorderLevel: Number(String(formData.get("reorderLevel") ?? "0")) });
  revalidatePath("/pharmacy"); revalidatePath("/pharmacy/inventory");
}

export async function receiveStockAction(formData: FormData) {
  const context = await requireClinicPermission(PERMISSIONS.PHARMACY_STOCK_ADJUST);
  await receiveStock(context, { medicineId: String(formData.get("medicineId") ?? "").trim(), batchNumber: String(formData.get("batchNumber") ?? ""), expiryDate: parseFutureDate(formData.get("expiryDate")), quantity: Number(String(formData.get("quantity") ?? "0")), unitCost: parseMoney(formData.get("unitCost")), sellingPrice: parseMoney(formData.get("sellingPrice")), supplierName: String(formData.get("supplierName") ?? "") });
  revalidatePath("/pharmacy"); revalidatePath("/pharmacy/inventory"); revalidatePath("/dashboard");
}

export async function adjustStockAction(formData: FormData) {
  const context = await requireClinicPermission(PERMISSIONS.PHARMACY_STOCK_ADJUST);
  await adjustStock(context, { batchId: String(formData.get("batchId") ?? "").trim(), delta: Number(String(formData.get("delta") ?? "0")), reason: String(formData.get("reason") ?? "") });
  revalidatePath("/pharmacy"); revalidatePath("/pharmacy/inventory"); revalidatePath("/dashboard");
}

export async function returnStockToSupplierAction(formData: FormData) {
  const context = await requireClinicPermission(PERMISSIONS.PHARMACY_STOCK_ADJUST);
  await returnStockToSupplier(context, { batchId: String(formData.get("batchId") ?? "").trim(), quantity: parsePositiveInteger(formData.get("quantity")), reason: parseReason(formData.get("reason")) });
  revalidatePath("/pharmacy"); revalidatePath("/pharmacy/inventory"); revalidatePath("/dashboard");
}

export async function recordExpiredStockAction(formData: FormData) {
  const context = await requireClinicPermission(PERMISSIONS.PHARMACY_STOCK_ADJUST);
  await recordExpiredStock(context, { batchId: String(formData.get("batchId") ?? "").trim(), quantity: parsePositiveInteger(formData.get("quantity")), reason: parseReason(formData.get("reason")) });
  revalidatePath("/pharmacy"); revalidatePath("/pharmacy/inventory"); revalidatePath("/dashboard");
}

export async function disposeExpiredStockAction(formData: FormData) {
  const context = await requireClinicPermission(PERMISSIONS.PHARMACY_STOCK_ADJUST);
  await disposeExpiredStock(context, { batchId: String(formData.get("batchId") ?? "").trim(), quantity: parsePositiveInteger(formData.get("quantity")), reason: parseReason(formData.get("reason")) });
  revalidatePath("/pharmacy"); revalidatePath("/pharmacy/inventory"); revalidatePath("/dashboard");
}
