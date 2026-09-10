import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const staffEmail = process.env.E2E_STAFF_EMAIL;
const staffPassword = process.env.E2E_STAFF_PASSWORD;
const prisma = new PrismaClient();

function requireStaffCredentials() {
  if (staffEmail && staffPassword) return;
  if (process.env.CI) {
    throw new Error("E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD must be configured in CI for session lifecycle tests.");
  }
  test.skip(true, "Set E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD for session lifecycle tests.");
}

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(staffEmail!);
  await page.getByRole("textbox", { name: "Password" }).fill(staffPassword!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function getSessionId(page: Page) {
  const cookie = (await page.context().cookies()).find((item) => item.name === "cms_session");
  expect(cookie?.value).toBeTruthy();
  const tokenHash = createHash("sha256").update(cookie!.value).digest("hex");
  const session = await prisma.authSession.findUnique({ where: { tokenHash }, select: { id: true } });
  expect(session?.id).toBeTruthy();
  return session!.id;
}

test.describe("authentication session lifecycle", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("rejects an expired session before protected data is served", async ({ page }) => {
    requireStaffCredentials();
    await signIn(page);

    const sessionId = await getSessionId(page);
    await prisma.authSession.update({
      where: { id: sessionId },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    expect(await prisma.authSession.findUnique({ where: { id: sessionId } })).toBeNull();
  });

  test("rejects a revoked session before protected data is served", async ({ page }) => {
    requireStaffCredentials();
    await signIn(page);

    const sessionId = await getSessionId(page);
    await prisma.authSession.delete({ where: { id: sessionId } });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    expect(await prisma.authSession.findUnique({ where: { id: sessionId } })).toBeNull();
  });
});
