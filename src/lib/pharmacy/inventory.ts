import type { AuthContext } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { StockMovementType } from "@prisma/client";
import { recordAuditEvent } from "@/lib/audit";

/**
 * Owns clinic-scoped medicine catalog and stock-batch operations.
 *
 * Inventory quantities live on StockBatch. Every receiving or adjustment also
 * writes a StockMovement so the stock balance remains traceable.
 */

export type InventoryMedicine = {
  id: string;
  name: string;
  strength: string | null;
  form: string | null;
  reorderLevel: number;
  totalQuantity: number;
  batchCount: number;
};

export type InventoryBatch = {
  id: string;
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;
  unitCost: number;
  sellingPrice: number;
  supplierName: string | null;
};

export type InventoryOverview = {
  medicines: InventoryMedicine[];
  batches: InventoryBatch[];
};

export async function getInventoryOverview(context: AuthContext): Promise<InventoryOverview> {
  const [medicines, batches] = await Promise.all([
    db.medicine.findMany({
      where: { clinicId: context.clinicId, active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        strength: true,
        form: true,
        reorderLevel: true,
        batches: { select: { quantity: true } },
      },
    }),
    db.stockBatch.findMany({
      where: { clinicId: context.clinicId },
      orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }],
      take: 200,
      select: {
        id: true,
        medicineId: true,
        batchNumber: true,
        expiryDate: true,
        quantity: true,
        unitCost: true,
        sellingPrice: true,
        supplierName: true,
        medicine: { select: { name: true } },
      },
    }),
  ]);

  return {
    medicines: medicines.map((medicine) => ({
      id: medicine.id,
      name: medicine.name,
      strength: medicine.strength,
      form: medicine.form,
      reorderLevel: medicine.reorderLevel,
      totalQuantity: medicine.batches.reduce((sum, batch) => sum + batch.quantity, 0),
      batchCount: medicine.batches.length,
    })),
    batches: batches.map((batch) => ({
      id: batch.id,
      medicineId: batch.medicineId,
      medicineName: batch.medicine.name,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      quantity: batch.quantity,
      unitCost: Number(batch.unitCost),
      sellingPrice: Number(batch.sellingPrice),
      supplierName: batch.supplierName,
    })),
  };
}

export async function createMedicine(
  context: AuthContext,
  input: { name: string; strength?: string; form?: string; reorderLevel: number },
) {
  const name = input.name.trim();
  if (!name) throw new Error("MEDICINE_NAME_REQUIRED");
  if (!Number.isInteger(input.reorderLevel) || input.reorderLevel < 0) {
    throw new Error("INVALID_REORDER_LEVEL");
  }

  return db.$transaction(async (tx) => {
    const medicine = await tx.medicine.create({
      data: {
        clinicId: context.clinicId,
        name,
        strength: input.strength?.trim() || null,
        form: input.form?.trim() || null,
        reorderLevel: input.reorderLevel,
      },
    });

    await recordAuditEvent(context, {
      action: "MEDICINE_CREATED",
      entityType: "Medicine",
      entityId: medicine.id,
      metadata: { name: medicine.name },
    }, tx);

    return medicine;
  });
}

export async function receiveStock(
  context: AuthContext,
  input: {
    medicineId: string;
    batchNumber: string;
    expiryDate: Date;
    quantity: number;
    unitCost: number;
    sellingPrice: number;
    supplierName?: string;
  },
) {
  const batchNumber = input.batchNumber.trim();
  if (!batchNumber) throw new Error("BATCH_NUMBER_REQUIRED");
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error("INVALID_STOCK_QUANTITY");
  if (!Number.isFinite(input.unitCost) || input.unitCost < 0) throw new Error("INVALID_UNIT_COST");
  if (!Number.isFinite(input.sellingPrice) || input.sellingPrice < 0) throw new Error("INVALID_SELLING_PRICE");
  if (input.expiryDate.getTime() <= Date.now()) throw new Error("EXPIRY_DATE_MUST_BE_FUTURE");

  return db.$transaction(async (tx) => {
    const medicine = await tx.medicine.findFirst({
      where: { id: input.medicineId, clinicId: context.clinicId, active: true },
      select: { id: true, name: true },
    });
    if (!medicine) throw new Error("MEDICINE_NOT_FOUND");

    const existing = await tx.stockBatch.findFirst({
      where: { clinicId: context.clinicId, medicineId: medicine.id, batchNumber },
      select: { id: true },
    });

    const batch = existing
      ? await tx.stockBatch.update({
          where: { id: existing.id },
          data: {
            quantity: { increment: input.quantity },
            unitCost: input.unitCost,
            sellingPrice: input.sellingPrice,
            expiryDate: input.expiryDate,
            supplierName: input.supplierName?.trim() || null,
          },
        })
      : await tx.stockBatch.create({
          data: {
            clinicId: context.clinicId,
            medicineId: medicine.id,
            batchNumber,
            expiryDate: input.expiryDate,
            quantity: input.quantity,
            unitCost: input.unitCost,
            sellingPrice: input.sellingPrice,
            supplierName: input.supplierName?.trim() || null,
          },
        });

    await tx.stockMovement.create({
      data: {
        clinicId: context.clinicId,
        batchId: batch.id,
        type: StockMovementType.PURCHASE,
        quantity: input.quantity,
        reason: `Stock received for ${medicine.name}`,
      },
    });

    await recordAuditEvent(context, {
      action: "STOCK_RECEIVED",
      entityType: "StockBatch",
      entityId: batch.id,
      metadata: { medicineId: medicine.id, quantity: input.quantity, batchNumber },
    }, tx);

    return batch;
  });
}

export async function adjustStock(
  context: AuthContext,
  input: { batchId: string; delta: number; reason: string },
) {
  if (!Number.isInteger(input.delta) || input.delta === 0) throw new Error("INVALID_STOCK_ADJUSTMENT");
  const reason = input.reason.trim();
  if (!reason) throw new Error("ADJUSTMENT_REASON_REQUIRED");

  return db.$transaction(async (tx) => {
    const batch = await tx.stockBatch.findFirst({
      where: { id: input.batchId, clinicId: context.clinicId },
      select: { id: true, quantity: true, medicine: { select: { name: true } } },
    });
    if (!batch) throw new Error("STOCK_BATCH_NOT_FOUND");

    const nextQuantity = batch.quantity + input.delta;
    if (nextQuantity < 0) throw new Error("STOCK_CANNOT_GO_BELOW_ZERO");

    const updated = await tx.stockBatch.update({
      where: { id: batch.id },
      data: { quantity: nextQuantity },
    });

    await tx.stockMovement.create({
      data: {
        clinicId: context.clinicId,
        batchId: batch.id,
        type: StockMovementType.ADJUSTMENT,
        quantity: input.delta,
        reason,
      },
    });

    await recordAuditEvent(context, {
      action: "STOCK_ADJUSTED",
      entityType: "StockBatch",
      entityId: batch.id,
      metadata: { medicineName: batch.medicine.name, delta: input.delta, reason },
    }, tx);

    return updated;
  });
}

export async function returnOrDisposeStock(
  context: AuthContext,
  input: { batchId: string; operation: "RETURN" | "DISPOSAL"; quantity: number; reason: string },
) {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) throw new Error("INVALID_STOCK_QUANTITY");
  const reason = input.reason.trim();
  if (!reason) throw new Error("STOCK_OPERATION_REASON_REQUIRED");

  return db.$transaction(async (tx) => {
    const batch = await tx.stockBatch.findFirst({
      where: { id: input.batchId, clinicId: context.clinicId },
      select: { id: true, quantity: true, medicine: { select: { name: true } } },
    });
    if (!batch) throw new Error("STOCK_BATCH_NOT_FOUND");

    const delta = input.operation === "RETURN" ? input.quantity : -input.quantity;
    const nextQuantity = batch.quantity + delta;
    if (nextQuantity < 0) throw new Error("INSUFFICIENT_STOCK_FOR_DISPOSAL");

    const updated = await tx.stockBatch.update({
      where: { id: batch.id },
      data: { quantity: nextQuantity },
    });
    const referenceId = crypto.randomUUID();

    await tx.stockMovement.create({
      data: {
        clinicId: context.clinicId,
        batchId: batch.id,
        type: input.operation === "RETURN" ? StockMovementType.RETURN : StockMovementType.DISPOSAL,
        quantity: delta,
        referenceId,
        reason,
      },
    });

    await recordAuditEvent(context, {
      action: input.operation === "RETURN" ? "STOCK_RETURNED" : "STOCK_DISPOSED",
      entityType: "StockBatch",
      entityId: batch.id,
      metadata: { medicineName: batch.medicine.name, quantity: input.quantity, reason, referenceId },
    }, tx);

    return { ...updated, referenceId };
  });
}
