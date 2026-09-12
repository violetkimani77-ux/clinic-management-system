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
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, "0");
}

const email = process.env.PLATFORM_ADMIN_EMAIL;
const password = process.env.PLATFORM_ADMIN_PASSWORD;
const mfaSecret = process.env.PLATFORM_ADMIN_MFA_SECRET;

test.describe("Platform Control authentication", () => {
  test("accepts valid platform credentials and MFA", async ({ page }) => {
    test.skip(!email || !password || !mfaSecret, "Platform E2E credentials are not configured in this environment.");

    await page.goto("/platform/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByLabel("Authenticator code").fill(totp(mfaSecret!));
    await page.getByRole("button", { name: "Sign in to Platform Control" }).click();

    await expect(page).toHaveURL(/\/platform$/);
    await expect(page.getByText("Platform Control")).toBeVisible();
  });

  test("rejects an invalid MFA code", async ({ page }) => {
    test.skip(!email || !password || !mfaSecret, "Platform E2E credentials are not configured in this environment.");

    await page.goto("/platform/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByLabel("Authenticator code").fill("000000");
    await page.getByRole("button", { name: "Sign in to Platform Control" }).click();

    await expect(page).toHaveURL(/\/platform\/login\?error=invalid$/);
    await expect(page.getByRole("alert")).toContainText("Sign-in failed");
  });
});
