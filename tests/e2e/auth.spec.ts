import { expect, test } from "@playwright/test";

test("renders the staff sign-in form and Heri CMS navigation", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Clinic Management System" })).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Start a Free trial today/i })).toHaveAttribute("href", "/trial");

  const brand = page.getByLabel("Heri CMS");
  await expect(brand).toBeVisible();
  await expect(brand.locator(".brand-heri")).toHaveText("Heri");
  await expect(brand.locator(".brand-cms")).toHaveText(" CMS");
});
