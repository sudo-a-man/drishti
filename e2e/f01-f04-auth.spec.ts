import { test, expect } from "@playwright/test";

test.describe("F04 login (demo) and F01 buy navigation", () => {
  test("F04-H1 demo login shows the configure-keys message", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("secret123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert")).toContainText(/demo mode/i);
  });

  test("F01-H1 landing → pricing → signup", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /see pricing/i }).click();
    await expect(page).toHaveURL(/\/pricing/);
    await page.getByRole("link", { name: /get started/i }).first().click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test("F01-E1 checkout returns 503 when payments are unconfigured (demo)", async ({ request }) => {
    const res = await request.post("/api/checkout", { data: { product: "genie", planYears: 1 } });
    // In demo mode (no Razorpay keys) the route refuses with 503. With keys set
    // and no session this becomes 401 — update this assertion then.
    expect(res.status()).toBe(503);
  });
});
