import { expect, test } from "@playwright/test";

const staffEmail = process.env.E2E_STAFF_EMAIL;
const staffPassword = process.env.E2E_STAFF_PASSWORD;

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

  test("authenticated staff can enter the patient registry and clinical queue", async ({ page }) => {
    test.skip(!staffEmail || !staffPassword, "Set E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD for authenticated workflow tests.");

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
