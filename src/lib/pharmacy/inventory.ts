import type { AuthContext } from "@/lib/auth/authorization";
import type { StockMovementType } from "@prisma/client";
import { db } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";

export type InventoryMedicine = { id: string; name: string; strength: string | null; form: string | null; reorderLevel: number; totalQuantity: number; batchCount: number; };
export type InventoryBatch = { id: string; medicineId: string; medicineName: string; batchNumber: string; expiryDate: Date; quantity: number; unitCost: number; sellingPrice: number; supplierName: string | null; };
export type InventoryMovement = { id: string; batchId: string; medicineName: string; batchNumber: string; type: StockMovementType; quantity: number; referenceId: string | null; reason: string | null; createdAt: Date; };
export type InventoryOverview = { medicines: InventoryMedicine[]; batches: InventoryBatch[]; };

export async function getInventoryOverview(context: AuthContext): Promise<InventoryOverview> {
  const [medicines, batches] = await Promise.all([
    db.medicine.findMany({ where: { clinicId: context.clinicId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, strength: true, form: true, reorderLevel: true, batches: { select: { quantity: true, expiryDate: true } } } }),
    db.stockBatch.findMany({ where: { clinicId: context.clinicId }, orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }], take: 200, select: { id: true, medicineId: true, batchNumber: true, expiryDate: true, quantity: true, unitCost: true, sellingPrice: true, supplierName: true, medicine: { select: { name: true } } } }),
  ]);
  const now = new Date();
  return { medicines: medicines.map((m) => ({ id: m.id, name: m.name, strength: m.strength, form: m.form, reorderLevel: m.reorderLevel, totalQuantity: m.batches.filter((b) => b.quantity > 0 && b.expiryDate >= now).reduce((s, b) => s + b.quantity, 0), batchCount: m.batches.length })), batches: batches.map((b) => ({ id: b.id, medicineId: b.medicineId, medicineName: b.medicine.name, batchNumber: b.batchNumber, expiryDate: b.expiryDate, quantity: b.quantity, unitCost: Number(b.unitCost), sellingPrice: Number(b.sellingPrice), supplierName: b.supplierName })) };
}

export async function getStockMovements(context: AuthContext, limit = 200): Promise<InventoryMovement[]> {
  const movements = await db.stockMovement.findMany({ where: { clinicId: context.clinicId }, orderBy: { createdAt: "desc" }, take: Math.min(Math.max(limit, 1), 500), select: { id: true, batchId: true, type: true, quantity: true, referenceId: true, reason: true, createdAt: true, batch: { select: { batchNumber: true, medicine: { select: { name: true } } } } } });
  return movements.map((m) => ({ id: m.id, batchId: m.batchId, medicineName: m.batch.medicine.name, batchNumber: m.batch.batchNumber, type: m.type, quantity: m.quantity, referenceId: m.referenceId, reason: m.reason, createdAt: m.createdAt }));
}

export async function createMedicine(context: AuthContext, input: { name: string; strength?: string; form?: string; reorderLevel: number }) {
  const name = input.name.trim(); if (!name) throw new Error("MEDICINE_NAME_REQUIRED"); if (!Number.isInteger(input.reorderLevel) || input.reorderLevel < 0) throw new Error("INVALID_REORDER_LEVEL");
  return db.$transaction(async (tx) => { const medicine = await tx.medicine.create({ data: { clinicId: context.clinicId, name, strength: input.strength?.trim() || null, form: input.form?.trim() || null, reorderLevel: input.reorderLevel } }); await recordAuditEvent(context, { action: "MEDICINE_CREATED", entityType: "Medicine", entityId: medicine.id, metadata: { name: medicine.name } }, tx); return medicine; });
}

export async function receiveStock(context: AuthContext, input: { medicineId: string; batchNumber: string; expiryDate: Date; quantity: number; unitCost: number; sellingPrice: number; supplierName?: string }) {
  const batchNumber = input.batchNumber.trim(); const supplierName = input.supplierName?.trim() || null;
  if (!batchNumber) throw new Error("BATCH_NUMBER_REQUIRED"); if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error("INVALID_STOCK_QUANTITY"); if (!Number.isFinite(input.unitCost) || input.unitCost < 0) throw new Error("INVALID_UNIT_COST"); if (!Number.isFinite(input.sellingPrice) || input.sellingPrice < 0) throw new Error("INVALID_SELLING_PRICE"); if (input.expiryDate.getTime() <= Date.now()) throw new Error("EXPIRY_DATE_MUST_BE_FUTURE");
  return db.$transaction(async (tx) => {
    const medicine = await tx.medicine.findFirst({ where: { id: input.medicineId, clinicId: context.clinicId, active: true }, select: { id: true, name: true } }); if (!medicine) throw new Error("MEDICINE_NOT_FOUND");
    const existing = await tx.stockBatch.findFirst({ where: { clinicId: context.clinicId, medicineId: medicine.id, batchNumber }, select: { id: true, expiryDate: true, unitCost: true, sellingPrice: true, supplierName: true } });
    if (existing && (existing.expiryDate.getTime() !== input.expiryDate.getTime() || Number(existing.unitCost) !== input.unitCost || Number(existing.sellingPrice) !== input.sellingPrice || existing.supplierName !== supplierName)) throw new Error("BATCH_METADATA_MISMATCH");
    const batch = existing ? await tx.stockBatch.update({ where: { id: existing.id }, data: { quantity: { increment: input.quantity } } }) : await tx.stockBatch.create({ data: { clinicId: context.clinicId, medicineId: medicine.id, batchNumber, expiryDate: input.expiryDate, quantity: input.quantity, unitCost: input.unitCost, sellingPrice: input.sellingPrice, supplierName } });
    await tx.stockMovement.create({ data: { clinicId: context.clinicId, batchId: batch.id, type: "PURCHASE", quantity: input.quantity, reason: `Stock received for ${medicine.name}` } }); await recordAuditEvent(context, { action: "STOCK_RECEIVED", entityType: "StockBatch", entityId: batch.id, metadata: { medicineId: medicine.id, quantity: input.quantity, batchNumber } }, tx); return batch;
  });
}

async function removeStock(context: AuthContext, input: { batchId: string; quantity: number; type: Extract<StockMovementType, "RETURN" | "EXPIRY" | "DISPOSAL">; reason: string }) {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error("INVALID_STOCK_QUANTITY"); const reason = input.reason.trim(); if (!reason) throw new Error("STOCK_REMOVAL_REASON_REQUIRED");
  return db.$transaction(async (tx) => {
    const batch = await tx.stockBatch.findFirst({ where: { id: input.batchId, clinicId: context.clinicId }, select: { id: true, quantity: true, expiryDate: true, medicine: { select: { name: true } } } }); if (!batch) throw new Error("STOCK_BATCH_NOT_FOUND"); if (batch.quantity < input.quantity) throw new Error("INSUFFICIENT_STOCK"); if (input.type === "EXPIRY" && batch.expiryDate > new Date()) throw new Error("BATCH_NOT_EXPIRED");
    const updated = await tx.stockBatch.update({ where: { id: batch.id }, data: { quantity: { decrement: input.quantity } } }); await tx.stockMovement.create({ data: { clinicId: context.clinicId, batchId: batch.id, type: input.type, quantity: input.quantity, reason } }); await recordAuditEvent(context, { action: `STOCK_${input.type}`, entityType: "StockBatch", entityId: batch.id, metadata: { medicineName: batch.medicine.name, quantity: input.quantity, reason } }, tx); return updated;
  }, { isolationLevel: "Serializable" });
}
export async function returnStockToSupplier(context: AuthContext, input: { batchId: string; quantity: number; reason: string }) { return removeStock(context, { ...input, type: "RETURN" }); }
export async function disposeExpiredStock(context: AuthContext, input: { batchId: string; quantity: number; reason: string }) { return removeStock(context, { ...input, type: "DISPOSAL" }); }
export async function recordExpiredStock(context: AuthContext, input: { batchId: string; quantity: number; reason: string }) { return removeStock(context, { ...input, type: "EXPIRY" }); }
export async function adjustStock(context: AuthContext, input: { batchId: string; delta: number; reason: string }) {
  if (!Number.isInteger(input.delta) || input.delta === 0) throw new Error("INVALID_STOCK_ADJUSTMENT"); const reason = input.reason.trim(); if (!reason) throw new Error("ADJUSTMENT_REASON_REQUIRED");
  return db.$transaction(async (tx) => { const batch = await tx.stockBatch.findFirst({ where: { id: input.batchId, clinicId: context.clinicId }, select: { id: true, quantity: true, medicine: { select: { name: true } } } }); if (!batch) throw new Error("STOCK_BATCH_NOT_FOUND"); const nextQuantity = batch.quantity + input.delta; if (nextQuantity < 0) throw new Error("STOCK_CANNOT_GO_BELOW_ZERO"); const updated = await tx.stockBatch.update({ where: { id: batch.id }, data: { quantity: nextQuantity } }); await tx.stockMovement.create({ data: { clinicId: context.clinicId, batchId: batch.id, type: "ADJUSTMENT", quantity: input.delta, reason } }); await recordAuditEvent(context, { action: "STOCK_ADJUSTED", entityType: "StockBatch", entityId: batch.id, metadata: { medicineName: batch.medicine.name, delta: input.delta, reason } }, tx); return updated; }, { isolationLevel: "Serializable" });
}