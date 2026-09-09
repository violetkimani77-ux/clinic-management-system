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

  test("does not expose protected patient data to unauthenticated users", async ({ page }) => {
    const response = await page.request.get("/api/patients");
    expect(response.status()).toBeGreaterThanOrEqual(300);
    expect(response.status()).toBeLessThan(500);
  });
});
