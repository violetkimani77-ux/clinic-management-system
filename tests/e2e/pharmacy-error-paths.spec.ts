import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { dispensePrescription } from "@/lib/pharmacy/registry";
import type { AuthContext } from "@/lib/auth/authorization";

const staffEmail = process.env.E2E_STAFF_EMAIL;
const prisma = new PrismaClient();

function requireStaffCredentials() {
  if (staffEmail) return;
  if (process.env.CI) {
    throw new Error("E2E_STAFF_EMAIL must be configured in CI for pharmacy error-path tests.");
  }
  test.skip(true, "Set E2E_STAFF_EMAIL for pharmacy error-path tests.");
}

async function getStaffContext(): Promise<AuthContext> {
  const clinic = await prisma.clinic.findUniqueOrThrow({
    where: { code: "DEMO-CLINIC" },
    select: { id: true },
  });
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: staffEmail! },
    select: { id: true, name: true },
  });
  const membership = await prisma.membership.findUniqueOrThrow({
    where: { clinicId_userId: { clinicId: clinic.id, userId: user.id } },
    select: { role: { select: { code: true } } },
  });
  return {
    userId: user.id,
    userName: user.name,
    clinicId: clinic.id,
    roleCode: membership.role.code,
    permissions: new Set([PERMISSIONS.PHARMACY_DISPENSE]),
  };
}

test.describe("pharmacy stock rejection paths", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("rejects dispensing when available stock is insufficient and leaves all records unchanged", async () => {
    requireStaffCredentials();
    const context = await getStaffContext();
    const uniqueId = Date.now().toString();

    const medicine = await prisma.medicine.create({
      data: {
        clinicId: context.clinicId,
        name: `E2E Insufficient ${uniqueId}`,
        strength: "500mg",
        form: "Tablet",
        active: true,
      },
      select: { id: true },
    });
    const patient = await prisma.patient.create({
      data: {
        clinicId: context.clinicId,
        patientNo: `E2E-ERR-${uniqueId}`,
        firstName: "Stock",
        lastName: "Shortage",
      },
      select: { id: true },
    });
    const prescription = await prisma.prescription.create({
      data: {
        clinicId: context.clinicId,
        patientId: patient.id,
        status: "SENT_TO_PHARMACY",
        items: { create: { medicineId: medicine.id, quantity: 10 } },
      },
      select: { id: true },
    });
    const batch = await prisma.stockBatch.create({
      data: {
        clinicId: context.clinicId,
        medicineId: medicine.id,
        batchNumber: `E2E-ERR-${uniqueId}`,
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        quantity: 3,
        unitCost: 2,
        sellingPrice: 5,
      },
      select: { id: true },
    });

    await expect(dispensePrescription(context, prescription.id)).rejects.toThrow("INSUFFICIENT_STOCK");

    const [unchangedPrescription, unchangedBatch, dispensing, invoiceItem, movement, audit] = await Promise.all([
      prisma.prescription.findUnique({ where: { id: prescription.id }, select: { status: true } }),
      prisma.stockBatch.findUnique({ where: { id: batch.id }, select: { quantity: true } }),
      prisma.dispensing.findFirst({ where: { prescriptionId: prescription.id }, select: { id: true } }),
      prisma.invoiceItem.findFirst({ where: { description: { contains: prescription.id } }, select: { id: true } }),
      prisma.stockMovement.findFirst({ where: { batchId: batch.id, type: "DISPENSE" }, select: { id: true } }),
      prisma.auditLog.findFirst({ where: { entityId: prescription.id, action: "PRESCRIPTION_DISPENSED" }, select: { id: true } }),
    ]);
    expect(unchangedPrescription?.status).toBe("SENT_TO_PHARMACY");
    expect(unchangedBatch?.quantity).toBe(3);
    expect(dispensing).toBeNull();
    expect(invoiceItem).toBeNull();
    expect(movement).toBeNull();
    expect(audit).toBeNull();
  });

  test("rejects dispensing when the only stock is expired and leaves all records unchanged", async () => {
    requireStaffCredentials();
    const context = await getStaffContext();
    const uniqueId = `${Date.now()}-expired`;

    const medicine = await prisma.medicine.create({
      data: {
        clinicId: context.clinicId,
        name: `E2E Expired ${uniqueId}`,
        strength: "250mg",
        form: "Capsule",
        active: true,
      },
      select: { id: true },
    });
    const patient = await prisma.patient.create({
      data: {
        clinicId: context.clinicId,
        patientNo: `E2E-EXP-${uniqueId}`,
        firstName: "Expired",
        lastName: "Stock",
      },
      select: { id: true },
    });
    const prescription = await prisma.prescription.create({
      data: {
        clinicId: context.clinicId,
        patientId: patient.id,
        status: "SENT_TO_PHARMACY",
        items: { create: { medicineId: medicine.id, quantity: 2 } },
      },
      select: { id: true },
    });
    const batch = await prisma.stockBatch.create({
      data: {
        clinicId: context.clinicId,
        medicineId: medicine.id,
        batchNumber: `E2E-EXP-${uniqueId}`,
        expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        quantity: 20,
        unitCost: 2,
        sellingPrice: 5,
      },
      select: { id: true },
    });

    await expect(dispensePrescription(context, prescription.id)).rejects.toThrow("INSUFFICIENT_STOCK");

    const [unchangedPrescription, unchangedBatch, dispensing, movement] = await Promise.all([
      prisma.prescription.findUnique({ where: { id: prescription.id }, select: { status: true } }),
      prisma.stockBatch.findUnique({ where: { id: batch.id }, select: { quantity: true } }),
      prisma.dispensing.findFirst({ where: { prescriptionId: prescription.id }, select: { id: true } }),
      prisma.stockMovement.findFirst({ where: { batchId: batch.id, type: "DISPENSE" }, select: { id: true } }),
    ]);
    expect(unchangedPrescription?.status).toBe("SENT_TO_PHARMACY");
    expect(unchangedBatch?.quantity).toBe(20);
    expect(dispensing).toBeNull();
    expect(movement).toBeNull();
  });
});
