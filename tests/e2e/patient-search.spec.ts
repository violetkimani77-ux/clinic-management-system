import { expect, test, type Page } from "@playwright/test";

const staffEmail = process.env.E2E_STAFF_EMAIL;
const staffPassword = process.env.E2E_STAFF_PASSWORD;

function requireStaffCredentials() {
  if (staffEmail && staffPassword) return;
  if (process.env.CI) {
    throw new Error("E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD must be configured in CI for patient search tests.");
  }
  test.skip(true, "Set E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD for patient search tests.");
}

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(staffEmail!);
  await page.getByRole("textbox", { name: "Password" }).fill(staffPassword!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("staff can find a patient from the registry search and open the profile", async ({ page }) => {
  requireStaffCredentials();

  const uniqueId = Date.now().toString();
  const firstName = `Search${uniqueId}`;
  const lastName = "Patient";
  const phone = `0722${uniqueId.slice(-6)}`;

  await signIn(page);

  await page.goto("/patients");
  await expect(page.getByRole("heading", { name: "Patients", exact: true })).toBeVisible();
  await page.getByText("Register a new patient").click();
  await page.getByLabel(/First name/).fill(firstName);
  await page.getByLabel(/Last name/).fill(lastName);
  await page.getByLabel("Phone").fill(phone);
  await page.getByRole("button", { name: "Register patient" }).click();

  await expect(page.getByText(`${firstName} ${lastName}`)).toBeVisible();

  await page.getByLabel("Search patients").fill(phone);
  await page.getByRole("button", { name: "Search" }).click();

  await expect(page).toHaveURL(new RegExp(`[?&]q=${phone}`));
  await expect(page.getByRole("heading", { name: `Search results for “${phone}”` })).toBeVisible();
  await expect(page.getByText(`${firstName} ${lastName}`)).toBeVisible();

  await page.getByRole("link", { name: `${firstName} ${lastName}` }).click();

  await expect(page).toHaveURL(/\/patients\/[^/]+$/);
  await expect(page.getByRole("heading", { name: `${firstName} ${lastName}` })).toBeVisible();
  await expect(page.getByText(phone, { exact: true })).toBeVisible();
});
