import { expect, test } from "@playwright/test";

test.describe("Platform tenant control safety", () => {
  test("tenant operational detail does not expose clinical records", async ({ page }) => {
    await page.goto("/platform/tenants");
    await expect(page).toHaveURL(/\/platform\/login$/);
  });

  test("platform control has no implicit clinic-session authority", async ({ page }) => {
    await page.goto("/patients");
    const clinicUrl = page.url();
    await page.goto("/platform/tenants");
    await expect(page).toHaveURL(/\/platform\/login$/);
    expect(clinicUrl).not.toMatch(/\/platform/);
  });
});
