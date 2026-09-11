import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { dispensePrescription } from "@/lib/pharmacy/registry";
import type { AuthContext } from "@/lib/auth/authorization";

const staffEmail = process.env.E2E_STAFF_EMAIL;
const prisma = new PrismaClient();

function requireStaffCredentials() {
  if (staffEmail) return;
  if (process.env.CI) throw new Error("E2E_STAFF_EMAIL must be configured in CI for pharmacy partial-dispensing tests.");
  test.skip(true, "Set E2E_STAFF_EMAIL for pharmacy partial-dispensing tests.");
}

async function getStaffContext(): Promise<AuthContext> {
  const clinic = await prisma.clinic.findUniqueOrThrow({ where: { code: "DEMO-CLINIC" }, select: { id: true } });
  const user = await prisma.user.findUniqueOrThrow({ where: { email: staffEmail! }, select: { id: true, name: true } });
  const membership = await prisma.membership.findUniqueOrThrow({ where: { clinicId_userId: { clinicId: clinic.id, userId: user.id } }, select: { role: { select: { code: true } } } });
  return { userId: user.id, userName: user.name, clinicId: clinic.id, roleCode: membership.role.code, permissions: new Set([PERMISSIONS.PHARMACY_DISPENSE]) };
}

test.describe("pharmacy partial dispensing", () => {
  test.afterAll(async () => { await prisma.$disconnect(); });

  test("preserves remaining quantity and completes on a later dispensing", async () => {
    requireStaffCredentials();
    const context = await getStaffContext();
    const uniqueId = `${Date.now()}-partial`;

    const medicine = await prisma.medicine.create({
      data: { clinicId: context.clinicId, name: `E2E Partial ${uniqueId}`, strength: "500mg", form: "Tablet", active: true },
      select: { id: true },
    });
    const patient = await prisma.patient.create({
      data: { clinicId: context.clinicId, patientNo: `E2E-PART-${uniqueId}`, firstName: "Partial", lastName: "Dispensing" },
      select: { id: true },
    });
    const prescription = await prisma.prescription.create({
      data: { clinicId: context.clinicId, patientId: patient.id, status: "SENT_TO_PHARMACY", items: { create: { medicineId: medicine.id, quantity: 10 } } },
      select: { id: true },
    });
    const batch = await prisma.stockBatch.create({
      data: { clinicId: context.clinicId, medicineId: medicine.id, batchNumber: `E2E-PART-${uniqueId}`, expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), quantity: 10, unitCost: 2, sellingPrice: 5 },
      select: { id: true },
    });

    const first = await dispensePrescription(context, prescription.id, { [medicine.id]: 4 });
    expect(first.status).toBe("PARTIALLY_DISPENSED");

    const [partialPrescription, partialBatch, firstItems] = await Promise.all([
      prisma.prescription.findUnique({ where: { id: prescription.id }, select: { status: true, items: { select: { quantity: true } } } }),
      prisma.stockBatch.findUnique({ where: { id: batch.id }, select: { quantity: true } }),
      prisma.dispensingItem.findMany({ where: { dispensingId: first.dispensingId }, select: { quantity: true } }),
    ]);
    expect(partialPrescription?.status).toBe("PARTIALLY_DISPENSED");
    expect(partialPrescription?.items[0]?.quantity).toBe(10);
    expect(partialBatch?.quantity).toBe(6);
    expect(firstItems.reduce((sum, item) => sum + item.quantity, 0)).toBe(4);

    const second = await dispensePrescription(context, prescription.id);
    expect(second.status).toBe("DISPENSED");

    const [completedPrescription, completedBatch, allItems, movements, invoiceItems] = await Promise.all([
      prisma.prescription.findUnique({ where: { id: prescription.id }, select: { status: true } }),
      prisma.stockBatch.findUnique({ where: { id: batch.id }, select: { quantity: true } }),
      prisma.dispensingItem.findMany({ where: { dispensing: { prescriptionId: prescription.id } }, select: { quantity: true } }),
      prisma.stockMovement.findMany({ where: { batchId: batch.id, type: "DISPENSE", referenceId: { not: null } }, select: { quantity: true } }),
      prisma.invoiceItem.findMany({ where: { dispensing: { prescriptionId: prescription.id } }, select: { total: true } }),
    ]);
    expect(completedPrescription?.status).toBe("DISPENSED");
    expect(completedBatch?.quantity).toBe(0);
    expect(allItems.reduce((sum, item) => sum + item.quantity, 0)).toBe(10);
    expect(movements.reduce((sum, movement) => sum + movement.quantity, 0)).toBe(10);
    expect(invoiceItems).toHaveLength(2);
  });
});
