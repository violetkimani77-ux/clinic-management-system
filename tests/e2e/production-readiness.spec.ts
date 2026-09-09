import { expect, test } from "@playwright/test";

test.describe("production readiness - public access boundaries", () => {
  test("redirects unauthenticated users away from the dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("keeps the login surface available", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Clinic Management System" })).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("rejects invalid staff credentials without creating a session", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill("nobody@example.invalid");
    await page.getByLabel("Password").fill("definitely-not-valid");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert")).toContainText("Invalid email or password");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("does not expose a protected patient profile to unauthenticated users", async ({ page }) => {
    await page.goto("/patients/not-a-real-patient-id");
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  });
});
