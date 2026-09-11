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

test.describe("Platform tenant provisioning and residency evidence", () => {
  test("shows provisioned, healthy, Kenya-only tenant datastore evidence", async ({ page }) => {
    test.skip(!email || !password || !mfaSecret, "Platform E2E credentials are not configured in this environment.");

    await page.goto("/platform/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByLabel("Authenticator code").fill(totp(mfaSecret!));
    await page.getByRole("button", { name: "Sign in to Platform Control" }).click();
    await expect(page).toHaveURL(/\/platform$/);

    await page.goto("/platform/tenants");
    await expect(page.getByRole("heading", { name: "Clinics \/ Tenants" })).toBeVisible();
    await page.getByRole("link", { name: "View operations" }).first().click();

    await expect(page.getByText("Store status").locator(".." )).toContainText("HEALTHY");
    await expect(page.getByText("Residency policy").locator(".." )).toContainText("KENYA_ONLY");
    await expect(page.getByText("Primary country").locator(".." )).toContainText("KE");
    await expect(page.getByText("Backup country").locator(".." )).toContainText("KE");
    await expect(page.getByText("Provisioned").locator(".." )).not.toContainText("—");
    await expect(page.getByText("Last health check").locator(".." )).not.toContainText("—");
    await expect(page.getByText("Clinical patient, visit, prescription, dispensing and billing records remain outside this operational surface.")).toBeVisible();
  });
});
