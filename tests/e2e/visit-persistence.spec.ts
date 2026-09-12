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

test("authenticated staff can open a visit and verify database persistence", async ({ page }) => {
  requireStaffCredentials();

  const uniqueId = Date.now().toString();
  const firstName = `Visit${uniqueId}`;
  const lastName = "Patient";
  const phone = `0733${uniqueId.slice(-6)}`;

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
    await page.getByRole("link", { name: `${firstName} ${lastName}` }).click();
    await expect(page.getByRole("heading", { name: `${firstName} ${lastName}` })).toBeVisible();

    await page.getByRole("button", { name: "Start new visit" }).click();
    await expect(page).toHaveURL(/\/visits\/[^/]+$/);
    await expect(page.getByRole("heading", { name: `${firstName} ${lastName}` })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Visit status" })).toBeVisible();
    await expect(page.getByText("OPEN", { exact: true })).toBeVisible();

    const clinic = await prisma.clinic.findUnique({
      where: { code: "DEMO-CLINIC" },
      select: { id: true },
    });
    expect(clinic?.id).toBeTruthy();

    const patient = await prisma.patient.findFirst({
      where: { clinicId: clinic!.id, firstName, lastName, phone },
      select: { id: true },
    });
    expect(patient?.id).toBeTruthy();

    const visitId = new URL(page.url()).pathname.split("/").pop()!;
    const visit = await prisma.visit.findFirst({
      where: { id: visitId, clinicId: clinic!.id, patientId: patient!.id },
      select: { id: true, clinicId: true, patientId: true, status: true, openedAt: true, closedAt: true },
    });

    expect(visit).toEqual({
      id: visitId,
      clinicId: clinic!.id,
      patientId: patient!.id,
      status: "OPEN",
      openedAt: expect.any(Date),
      closedAt: null,
    });

    const auditEvent = await prisma.auditLog.findFirst({
      where: {
        clinicId: clinic!.id,
        action: "VISIT_CREATED",
        entityType: "Visit",
        entityId: visitId,
      },
      orderBy: { sequence: "desc" },
      select: { id: true, userId: true, metadata: true },
    });

    expect(auditEvent?.id).toBeTruthy();
    expect(auditEvent?.userId).toBeTruthy();
    expect(auditEvent?.metadata).toEqual({ patientId: patient!.id });
  } finally {
    await prisma.$disconnect();
  }
});
