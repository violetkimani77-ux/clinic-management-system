import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
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

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(staffEmail!);
  await page.getByRole("textbox", { name: "Password" }).fill(staffPassword!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function sessionIdForPage(page: Page) {
  const cookie = (await page.context().cookies()).find((item: { name: string }) => item.name === "cms_session");
  expect(cookie?.value).toBeTruthy();
  const tokenHash = createHash("sha256").update(cookie!.value).digest("hex");
  const session = await prisma.authSession.findUnique({ where: { tokenHash }, select: { id: true } });
  expect(session?.id).toBeTruthy();
  return session!.id;
}

test.describe("protected clinical workspace", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("redirects unauthenticated users away from protected clinical routes", async ({ page }) => {
    for (const path of ["/dashboard", "/patients", "/visits", "/pharmacy", "/reports", "/accounts"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    }
  });

  test("does not expose a patient profile without an authenticated tenant context", async ({ page }) => {
    await page.goto("/patients/not-a-real-patient-id");
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  });

  test("authenticated staff can register a patient and open a clinical visit", async ({ page }) => {
    requireStaffCredentials();

    const uniqueId = Date.now().toString();
    const firstName = `E2E${uniqueId}`;
    const lastName = "Patient";

    await signIn(page);

    await page.goto("/patients");
    await expect(page.getByRole("heading", { name: "Patients", exact: true })).toBeVisible();
    await page.getByText("Register a new patient").click();
    await page.getByLabel(/First name/).fill(firstName);
    await page.getByLabel(/Last name/).fill(lastName);
    await page.getByLabel("Phone").fill(`0700${uniqueId.slice(-6)}`);
    await page.getByRole("button", { name: "Register patient" }).click();

    await expect(page.getByText(`${firstName} ${lastName}`)).toBeVisible();
    await page.getByRole("link", { name: `${firstName} ${lastName}` }).click();
    await expect(page.getByRole("heading", { name: `${firstName} ${lastName}` })).toBeVisible();

    await page.getByRole("button", { name: "Start new visit" }).click();
    await expect(page).toHaveURL(/\/visits\/[^/]+$/);
    await expect(page.getByRole("heading", { name: `${firstName} ${lastName}` })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Visit status" })).toBeVisible();
  });

  test("authenticated staff can enter the patient registry and clinical queue", async ({ page }) => {
    requireStaffCredentials();

    await signIn(page);

    await page.goto("/patients");
    await expect(page.getByRole("heading", { name: "Patients", exact: true })).toBeVisible();
    await expect(page.getByLabel("Search patients")).toBeVisible();

    await page.goto("/visits");
    await expect(page.getByRole("heading", { name: "Visits", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Today's visits", exact: true })).toBeVisible();
  });

  test("authenticated staff can create a prescription, send it to Pharmacy, and produce an audit event", async ({ page }) => {
    requireStaffCredentials();

    const uniqueId = Date.now().toString();
    const firstName = `RxE2E${uniqueId}`;
    const medicineName = "E2E Production Paracetamol";
    const clinic = await prisma.clinic.findUnique({ where: { code: "DEMO-CLINIC" }, select: { id: true } });
    expect(clinic?.id).toBeTruthy();

    const existingMedicine = await prisma.medicine.findFirst({
      where: { clinicId: clinic!.id, name: medicineName },
      select: { id: true },
    });
    const medicine = existingMedicine
      ? existingMedicine
      : await prisma.medicine.create({
          data: {
            clinicId: clinic!.id,
            name: medicineName,
            strength: "500mg",
            form: "Tablet",
            active: true,
          },
          select: { id: true },
        });

    await signIn(page);

    await page.goto("/patients");
    await page.getByText("Register a new patient").click();
    await page.getByLabel(/First name/).fill(firstName);
    await page.getByLabel(/Last name/).fill("Prescription");
    await page.getByLabel("Phone").fill(`0711${uniqueId.slice(-6)}`);
    await page.getByRole("button", { name: "Register patient" }).click();
    await page.getByRole("link", { name: `${firstName} Prescription` }).click();
    await page.getByRole("button", { name: "Start new visit" }).click();
    await expect(page).toHaveURL(/\/visits\/[^/]+$/);

    const visitId = new URL(page.url()).pathname.split("/").pop()!;
    await page.getByLabel("Medicine").selectOption(medicine.id);
    await page.getByLabel("Quantity").fill("10");
    await page.getByLabel("Dosage").fill("1 tablet");
    await page.getByLabel("Frequency").fill("twice daily");
    await page.getByLabel("Duration").fill("5 days");
    await page.getByRole("button", { name: "Create Prescription" }).click();

    await expect(page.getByText("CREATED", { exact: true })).toBeVisible();
    const createdPrescription = await prisma.prescription.findFirst({
      where: { clinicId: clinic!.id, visitId },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true },
    });
    expect(createdPrescription?.status).toBe("CREATED");

    await page.getByRole("button", { name: "Send to Pharmacy" }).click();
    await expect(page.getByText("SENT TO PHARMACY", { exact: true })).toBeVisible();

    const prescription = await prisma.prescription.findUnique({
      where: { id: createdPrescription!.id },
      select: { status: true },
    });
    expect(prescription?.status).toBe("SENT_TO_PHARMACY");

    const auditEvent = await prisma.auditLog.findFirst({
      where: {
        clinicId: clinic!.id,
        action: "PRESCRIPTION_SENT_TO_PHARMACY",
        entityType: "Prescription",
        entityId: createdPrescription!.id,
      },
      orderBy: { sequence: "desc" },
      select: { id: true, userId: true, metadata: true },
    });
    expect(auditEvent?.id).toBeTruthy();
    expect(auditEvent?.userId).toBeTruthy();
    expect(auditEvent?.metadata).toEqual({ patientId: expect.any(String), visitId });
  });

  test("rejects an expired session", async ({ page }) => {
    requireStaffCredentials();
    await signIn(page);

    const sessionId = await sessionIdForPage(page);
    await prisma.authSession.update({
      where: { id: sessionId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  });

  test("rejects a revoked session", async ({ page }) => {
    requireStaffCredentials();
    await signIn(page);

    const sessionId = await sessionIdForPage(page);
    await prisma.authSession.delete({ where: { id: sessionId } });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  });
});
