import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { returnOrDisposeStock } from "@/lib/pharmacy/inventory";
import type { AuthContext } from "@/lib/auth/authorization";

const staffEmail = process.env.E2E_STAFF_EMAIL;
const prisma = new PrismaClient();

function requireStaffCredentials() {
  if (staffEmail) return;
  if (process.env.CI) throw new Error("E2E_STAFF_EMAIL must be configured in CI for pharmacy return/disposal tests.");
  test.skip(true, "Set E2E_STAFF_EMAIL for pharmacy return/disposal tests.");
}

async function getStaffContext(): Promise<AuthContext> {
  const clinic = await prisma.clinic.findUniqueOrThrow({ where: { code: "DEMO-CLINIC" }, select: { id: true } });
  const user = await prisma.user.findUniqueOrThrow({ where: { email: staffEmail! }, select: { id: true, name: true } });
  const membership = await prisma.membership.findUniqueOrThrow({ where: { clinicId_userId: { clinicId: clinic.id, userId: user.id } }, select: { role: { select: { code: true } } } });
  return { userId: user.id, userName: user.name, clinicId: clinic.id, roleCode: membership.role.code, permissions: new Set([PERMISSIONS.PHARMACY_STOCK_ADJUST]) };
}

test.describe("pharmacy return and disposal", () => {
  test.afterAll(async () => { await prisma.$disconnect(); });

  test("updates stock, movement history and audit records", async () => {
    requireStaffCredentials();
    const context = await getStaffContext();
    const uniqueId = `${Date.now()}-return-disposal`;

    const medicine = await prisma.medicine.create({
      data: { clinicId: context.clinicId, name: `E2E Return ${uniqueId}`, active: true },
      select: { id: true },
    });
    const batch = await prisma.stockBatch.create({
      data: { clinicId: context.clinicId, medicineId: medicine.id, batchNumber: `E2E-RD-${uniqueId}`, expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), quantity: 10, unitCost: 2, sellingPrice: 5 },
      select: { id: true },
    });

    const returned = await returnOrDisposeStock(context, { batchId: batch.id, operation: "RETURN", quantity: 3, reason: "Supplier return reversal" });
    expect(returned.quantity).toBe(13);

    const disposed = await returnOrDisposeStock(context, { batchId: batch.id, operation: "DISPOSAL", quantity: 4, reason: "Damaged packaging" });
    expect(disposed.quantity).toBe(9);

    const [finalBatch, movements, audits] = await Promise.all([
      prisma.stockBatch.findUnique({ where: { id: batch.id }, select: { quantity: true } }),
      prisma.stockMovement.findMany({ where: { batchId: batch.id, type: { in: ["RETURN", "DISPOSAL"] } }, orderBy: { createdAt: "asc" }, select: { type: true, quantity: true, reason: true, referenceId: true } }),
      prisma.auditLog.findMany({ where: { clinicId: context.clinicId, entityType: "StockBatch", entityId: batch.id, action: { in: ["STOCK_RETURNED", "STOCK_DISPOSED"] } }, orderBy: { createdAt: "asc" }, select: { action: true, metadata: true } }),
    ]);

    expect(finalBatch?.quantity).toBe(9);
    expect(movements).toEqual([
      expect.objectContaining({ type: "RETURN", quantity: 3, reason: "Supplier return reversal", referenceId: expect.any(String) }),
      expect.objectContaining({ type: "DISPOSAL", quantity: -4, reason: "Damaged packaging", referenceId: expect.any(String) }),
    ]);
    expect(audits.map((audit) => audit.action)).toEqual(["STOCK_RETURNED", "STOCK_DISPOSED"]);
  });
});
