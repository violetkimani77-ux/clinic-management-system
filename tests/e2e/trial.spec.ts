import { expect, test } from "@playwright/test";

test("renders the self-service trial form", async ({ page }) => {
  await page.goto("/trial");

  await expect(page.getByRole("heading", { name: "Start your 14-day free trial." })).toBeVisible();
  await expect(page.getByLabel("Clinic name")).toBeVisible();
  await expect(page.getByLabel("Administrator name")).toBeVisible();
  await expect(page.getByLabel("Administrator email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Trial Workspace" })).toBeVisible();
});

test("rejects an invalid trial form without creating a workspace", async ({ page }) => {
  await page.goto("/trial");
  await page.getByRole("button", { name: "Create Trial Workspace" }).click();
  await expect(page).toHaveURL(/\/trial$/);
});
