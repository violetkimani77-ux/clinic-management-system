import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const staffEmail = process.env.E2E_STAFF_EMAIL;
const staffPassword = process.env.E2E_STAFF_PASSWORD;
const prisma = new PrismaClient();

function requireStaffCredentials() {
  if (staffEmail && staffPassword) return;
  if (process.env.CI) {
    throw new Error("E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD must be configured in CI for authenticated readiness tests.");
  }
  test.skip(true, "Set E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD for authenticated workflow tests.");
}

test("authenticated staff can create a patient and verify database persistence", async ({ page }) => {
  requireStaffCredentials();

  const uniqueId = Date.now().toString();
  const firstName = `Persist${uniqueId}`;
  const lastName = "Patient";
  const phone = `0722${uniqueId.slice(-6)}`;

  try {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(staffEmail!);
    await page.getByRole("textbox", { name: "Password" }).fill(staffPassword!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/patients");
    await page.getByText("Register a new patient").click();
    await page.getByLabel(/First name/).fill(firstName);
    await page.getByLabel(/Last name/).fill(lastName);
    await page.getByLabel("Phone").fill(phone);
    await page.getByRole("button", { name: "Register patient" }).click();

    await expect(page.getByText(`${firstName} ${lastName}`)).toBeVisible();

    const clinic = await prisma.clinic.findUnique({
      where: { code: "DEMO-CLINIC" },
      select: { id: true },
    });
    expect(clinic?.id).toBeTruthy();

    const patient = await prisma.patient.findFirst({
      where: {
        clinicId: clinic!.id,
        firstName,
        lastName,
        phone,
      },
      select: { id: true, firstName: true, lastName: true, phone: true, clinicId: true },
    });

    expect(patient).toEqual({
      id: expect.any(String),
      firstName,
      lastName,
      phone,
      clinicId: clinic!.id,
    });
  } finally {
    await prisma.$disconnect();
  }
});
