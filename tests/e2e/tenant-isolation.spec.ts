import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

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

async function signIn(page: Parameters<typeof test>[0] extends never ? never : any) {
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
