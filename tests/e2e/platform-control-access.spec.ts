import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";

function totp(secret: string, timestamp = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = secret.replace(/\s+/g, "").toUpperCase();
  let bits = "";
  for (const char of normalized) bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  const key = Buffer.alloc(Math.floor(bits.length / 8));
  for (let i = 0; i < key.length; i++) key[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  const counter = Math.floor(timestamp / 1000 / 30);
  const message = Buffer.alloc(8);
  message.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  message.writeUInt32BE(counter >>> 0, 4);
  const digest = createHmac("sha1", key).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

const email = process.env.PLATFORM_ADMIN_EMAIL;
const password = process.env.PLATFORM_ADMIN_PASSWORD;
const mfaSecret = process.env.PLATFORM_ADMIN_MFA_SECRET;

test.describe("Platform Control privileged route access", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!email || !password || !mfaSecret, "Platform E2E credentials are not configured in this environment.");
    await page.goto("/platform/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByLabel("Authenticator code").fill(totp(mfaSecret!));
    await page.getByRole("button", { name: "Sign in to Platform Control" }).click();
    await expect(page).toHaveURL(/\/platform$/);
  });

  test("admin can traverse operational tenant and audit surfaces", async ({ page }) => {
    await page.getByRole("link", { name: /Clinics|Tenants/i }).first().click();
    await expect(page).toHaveURL(/\/platform\/tenants$/);
    await expect(page.getByRole("heading", { name: "Clinics \/ Tenants" })).toBeVisible();

    const detail = page.getByRole("link", { name: "View operations" }).first();
    await expect(detail).toBeVisible();
    await detail.click();
    await expect(page).toHaveURL(/\/platform\/tenants\//);
    await expect(page.getByText("Clinical patient, visit, prescription, dispensing and billing records remain outside this operational surface.")).toBeVisible();

    await page.goto("/platform/audit");
    await expect(page.getByRole("heading", { name: "Security & Audit" })).toBeVisible();
    await expect(page.getByText("Audit entries are not editable from Platform Control.")).toBeVisible();
  });

  test("unauthenticated access to privileged routes redirects to Platform login", async ({ page }) => {
    await page.context().clearCookies();
    for (const path of ["/platform", "/platform/tenants", "/platform/audit"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/platform\/login/);
    }
  });
});
