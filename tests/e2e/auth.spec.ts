import { expect, test } from "@playwright/test";

test("renders the staff sign-in form and Heri CMS navigation", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Clinic Management System" })).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Start Your Free trial today/i })).toHaveAttribute("href", "/trial");

  const brand = page.getByRole("link", { name: "Heri CMS — Clinic Management System" });
  await expect(brand).toBeVisible();
  await expect(brand.locator(".auth-brand-heri")).toHaveText("Heri");
  await expect(brand.locator(".auth-brand-cms")).toHaveText(" CMS");
});
