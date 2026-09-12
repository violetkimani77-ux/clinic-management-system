import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { updatePatient } from "@/lib/patients/registry";
import { getVisit, updateVisit } from "@/lib/visits/registry";
import { dispensePrescription, listPharmacyPrescriptions } from "@/lib/pharmacy/registry";
import type { AuthContext } from "@/lib/auth/authorization";

const staffEmail = process.env.E2E_STAFF_EMAIL;
const staffPassword = process.env.E2E_STAFF_PASSWORD;
const prisma = new PrismaClient();

function requireStaffCredentials() {
  if (staffEmail && staffPassword) return;
  if (process.env.CI) {
    throw new Error("E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD must be configured in CI for tenant-isolation tests.");
  }
  test.skip(true, "Set E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD for tenant-isolation tests.");
}

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(staffEmail!);
  await page.getByRole("textbox", { name: "Password" }).fill(staffPassword!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function getPrimaryContext(): Promise<AuthContext> {
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
    permissions: new Set([PERMISSIONS.PATIENTS_UPDATE, PERMISSIONS.PHARMACY_DISPENSE]),
  };
}

test.describe("tenant isolation", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("allows access to records belonging to the authenticated clinic", async ({ page }) => {
    requireStaffCredentials();

    const primaryClinic = await prisma.clinic.findUniqueOrThrow({
      where: { code: "DEMO-CLINIC" },
      select: { id: true },
    });

    const ownTenantPatient = await prisma.patient.upsert({
      where: {
        clinicId_patientNo: {
          clinicId: primaryClinic.id,
          patientNo: "E2E-OWN-TENANT-001",
        },
      },
      update: {
        firstName: "Own",
        lastName: "Tenant",
        phone: "0700111000",
        archivedAt: null,
      },
      create: {
        clinicId: primaryClinic.id,
        patientNo: "E2E-OWN-TENANT-001",
        firstName: "Own",
        lastName: "Tenant",
        phone: "0700111000",
      },
      select: { id: true },
    });

    await signIn(page);

    const profileResponse = await page.goto(`/patients/${ownTenantPatient.id}`);
    expect(profileResponse?.status()).toBe(200);
    await expect(page).toHaveURL(`/patients/${ownTenantPatient.id}`);
    await expect(page.getByRole("heading", { name: "Own Tenant" })).toBeVisible();
    await expect(page.getByText("0700111000")).toBeVisible();
  });

  test("denies cross-tenant patient, visit, and pharmacy reads and mutations", async ({ page }) => {
    requireStaffCredentials();

    const primaryClinic = await prisma.clinic.findUniqueOrThrow({
      where: { code: "DEMO-CLINIC" },
      select: { id: true },
    });
    const secondaryClinic = await prisma.clinic.upsert({
      where: { code: "E2E-ISOLATION-CLINIC" },
      update: { name: "E2E Isolation Clinic" },
      create: { code: "E2E-ISOLATION-CLINIC", name: "E2E Isolation Clinic" },
    });

    const now = new Date();
    await prisma.tenantDataStore.upsert({
      where: { clinicId: secondaryClinic.id },
      update: {
        status: "HEALTHY",
        isolationMode: "POOL",
        residencyPolicy: "KENYA_ONLY",
        transferAssessmentStatus: "NOT_REQUIRED",
        country: "KE",
        backupCountry: "KE",
        provisionedAt: now,
        lastHealthCheckAt: now,
      },
      create: {
        clinicId: secondaryClinic.id,
        status: "HEALTHY",
        isolationMode: "POOL",
        residencyPolicy: "KENYA_ONLY",
        transferAssessmentStatus: "NOT_REQUIRED",
        country: "KE",
        backupCountry: "KE",
        provisionedAt: now,
        lastHealthCheckAt: now,
      },
    });

    const otherTenantPatient = await prisma.patient.upsert({
      where: {
        clinicId_patientNo: {
          clinicId: secondaryClinic.id,
          patientNo: "E2E-ISOLATION-001",
        },
      },
      update: {
        firstName: "Other",
        lastName: "Tenant",
        phone: "0711000001",
      },
      create: {
        clinicId: secondaryClinic.id,
        patientNo: "E2E-ISOLATION-001",
        firstName: "Other",
        lastName: "Tenant",
        phone: "0711000001",
      },
      select: { id: true },
    });

    const otherTenantVisit = await prisma.visit.create({
      data: {
        clinicId: secondaryClinic.id,
        patientId: otherTenantPatient.id,
        status: "OPEN",
        notes: "E2E cross-tenant visit",
      },
      select: { id: true },
    });

    const otherTenantMedicine = await prisma.medicine.create({
      data: {
        clinicId: secondaryClinic.id,
        name: `E2E Isolation Medicine ${Date.now()}`,
        strength: "500mg",
        form: "Tablet",
        active: true,
      },
      select: { id: true },
    });
    const otherTenantPrescription = await prisma.prescription.create({
      data: {
        clinicId: secondaryClinic.id,
        patientId: otherTenantPatient.id,
        visitId: otherTenantVisit.id,
        status: "SENT_TO_PHARMACY",
        items: { create: { medicineId: otherTenantMedicine.id, quantity: 1 } },
      },
      select: { id: true },
    });

    const primaryContext = await getPrimaryContext();

    await signIn(page);

    const profileResponse = await page.goto(`/patients/${otherTenantPatient.id}`);
    expect(profileResponse?.status()).toBe(404);
    await expect(page).toHaveURL(`/patients/${otherTenantPatient.id}`);
    await expect(page.getByText("Other Tenant")).not.toBeVisible();

    const editResponse = await page.goto(`/patients/${otherTenantPatient.id}/edit`);
    expect(editResponse?.status()).toBe(404);
    await expect(page).toHaveURL(`/patients/${otherTenantPatient.id}/edit`);
    await expect(page.getByRole("heading", { name: "Edit patient" })).not.toBeVisible();

    expect(await getVisit(primaryContext, otherTenantVisit.id)).toBeNull();
    expect(await listPharmacyPrescriptions(primaryContext)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ patientId: otherTenantPatient.id })]),
    );

    await expect(
      updatePatient(primaryContext, otherTenantPatient.id, {
        firstName: "Tampered",
        lastName: "Tenant",
        phone: "0799999999",
      }),
    ).rejects.toThrow("PATIENT_NOT_FOUND");

    await expect(
      updateVisit(primaryContext, {
        visitId: otherTenantVisit.id,
        status: "IN_PROGRESS",
        notes: "Tampered visit",
      }),
    ).rejects.toThrow("VISIT_NOT_FOUND");

    await expect(dispensePrescription(primaryContext, otherTenantPrescription.id)).rejects.toThrow(
      "PRESCRIPTION_NOT_FOUND",
    );

    const unchanged = await prisma.patient.findUnique({
      where: { id: otherTenantPatient.id },
      select: { clinicId: true, firstName: true, lastName: true, phone: true },
    });
    expect(unchanged).toEqual({
      clinicId: secondaryClinic.id,
      firstName: "Other",
      lastName: "Tenant",
      phone: "0711000001",
    });

    const unchangedVisit = await prisma.visit.findUnique({
      where: { id: otherTenantVisit.id },
      select: { clinicId: true, status: true, notes: true },
    });
    expect(unchangedVisit).toEqual({
      clinicId: secondaryClinic.id,
      status: "OPEN",
      notes: "E2E cross-tenant visit",
    });

    const unchangedPrescription = await prisma.prescription.findUnique({
      where: { id: otherTenantPrescription.id },
      select: { clinicId: true, status: true },
    });
    expect(unchangedPrescription).toEqual({
      clinicId: secondaryClinic.id,
      status: "SENT_TO_PHARMACY",
    });

    expect(primaryClinic.id).not.toBe(secondaryClinic.id);
  });
});
