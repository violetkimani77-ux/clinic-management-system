import { expect, test } from "@playwright/test";

test.describe("Public Heri CMS site", () => {
  test("renders branded landing content, navigation and metadata", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Heri CMS | Clinic Management System");
    await expect(page.getByRole("heading", { name: "One secure platform for your clinic operations" })).toBeVisible();
    await expect(page.getByRole("link", { name: "CMS Portal Sign in" })).toHaveAttribute("href", "/login");
    await expect(page.getByRole("link", { name: /Start Your 14-Day Free Trial/i })).toHaveAttribute("href", "/trial");

    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute("content");
    const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute("content");
    expect(ogTitle).toBe("Heri CMS | Clinic Management System");
    expect(twitterCard).toBe("summary_large_image");
  });

  test("serves baseline security headers", async ({ request }) => {
    const response = await request.get("/");
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["x-frame-options"]).toBe("DENY");
    expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(response.headers()["permissions-policy"]).toContain("camera=()");
  });

  test("keeps public internal links resolvable", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = await page.locator("a[href]").evaluateAll((links) =>
      Array.from(new Set(links.map((link) => link.getAttribute("href"))))
        .filter((href): href is string => Boolean(href?.startsWith("/")))
        .filter((href) => !href.startsWith("/#")),
    );

    for (const href of hrefs) {
      const response = await request.get(href);
      expect(response.status(), `${href} returned ${response.status()}`).toBeLessThan(400);
    }
  });

  test("keeps the landing page within the viewport on narrow screens", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
    await expect(page.getByRole("heading", { name: "One secure platform for your clinic operations" })).toBeVisible();
  });
});
