import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { updatePatient } from "@/lib/patients/registry";
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

test.describe("tenant isolation", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("denies cross-tenant patient reads and mutation surfaces", async ({ page }) => {
    requireStaffCredentials();

    const primaryClinic = await prisma.clinic.findUniqueOrThrow({
      where: { code: "DEMO-CLINIC" },
      select: { id: true },
    });

    const primaryUser = await prisma.user.findUniqueOrThrow({
      where: { email: staffEmail! },
      select: { id: true, name: true },
    });

    const primaryMembership = await prisma.membership.findUniqueOrThrow({
      where: {
        clinicId_userId: {
          clinicId: primaryClinic.id,
          userId: primaryUser.id,
        },
      },
      select: { role: { select: { code: true } } },
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
    });

    await signIn(page);

    const profileResponse = await page.goto(`/patients/${otherTenantPatient.id}`);
    expect(profileResponse?.status()).toBe(404);
    await expect(page).toHaveURL(`/patients/${otherTenantPatient.id}`);
    await expect(page.getByText("Other Tenant")).not.toBeVisible();

    const editResponse = await page.goto(`/patients/${otherTenantPatient.id}/edit`);
    expect(editResponse?.status()).toBe(404);
    await expect(page).toHaveURL(`/patients/${otherTenantPatient.id}/edit`);
    await expect(page.getByRole("heading", { name: "Edit patient" })).not.toBeVisible();

    const primaryContext: AuthContext = {
      userId: primaryUser.id,
      userName: primaryUser.name,
      clinicId: primaryClinic.id,
      roleCode: primaryMembership.role.code,
      permissions: new Set([PERMISSIONS.PATIENTS_UPDATE]),
    };

    // Exercise the server-side mutation boundary directly. The authenticated
    // clinic comes from the primary session context, while the target ID is a
    // patient owned by the secondary clinic. A foreign ID must be rejected
    // before any update occurs; a UI-only 404 is not sufficient evidence.
    await expect(
      updatePatient(primaryContext, otherTenantPatient.id, {
        firstName: "Tampered",
        lastName: "Tenant",
        phone: "0799999999",
      }),
    ).rejects.toThrow("PATIENT_NOT_FOUND");

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
  });
});
