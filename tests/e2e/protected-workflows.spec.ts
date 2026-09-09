import { expect, test } from "@playwright/test";

const staffEmail = process.env.E2E_STAFF_EMAIL;
const staffPassword = process.env.E2E_STAFF_PASSWORD;

function requireStaffCredentials() {
  if (staffEmail && staffPassword) return;
  if (process.env.CI) {
    throw new Error("E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD must be configured in CI for authenticated readiness tests.");
  }
  test.skip(true, "Set E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD for authenticated workflow tests.");
}

test.describe("protected clinical workspace", () => {
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

    await page.goto("/login");
    await page.getByLabel("Email address").fill(staffEmail!);
    await page.getByLabel("Password").fill(staffPassword!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/patients");
    await expect(page.getByRole("heading", { name: "Patients" })).toBeVisible();
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

    await page.goto("/login");
    await page.getByLabel("Email address").fill(staffEmail!);
    await page.getByLabel("Password").fill(staffPassword!);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/patients");
    await expect(page.getByRole("heading", { name: "Patients" })).toBeVisible();
    await expect(page.getByRole("search", { name: "Search patients" })).toBeVisible();

    await page.goto("/visits");
    await expect(page.getByRole("heading", { name: "Visits" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Today's visits" })).toBeVisible();
  });
});
