import { expect, test } from "@playwright/test";

test("renders the staff sign-in form", async ({ page }) => {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: "Clinic Management System" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});
