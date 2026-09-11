import { expect, test } from "@playwright/test";

test.describe("Platform Control access boundary", () => {
  test("unauthenticated users are sent to the dedicated platform login", async ({ page }) => {
    await page.goto("/platform");
    await expect(page).toHaveURL(/\/platform\/login$/);
    await expect(page.getByRole("heading", { name: "Platform Control" })).toBeVisible();
    await expect(page.getByText("Privileged platform operations are isolated from clinic staff accounts.")).toBeVisible();
  });

  test("platform login is a separate authentication surface", async ({ page }) => {
    await page.goto("/platform/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByLabel("Authenticator code")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in to Platform Control" })).toBeVisible();
  });
});
