import { test, expect } from "@playwright/test";

test.describe("F02 free tool is gated when signed out", () => {
  test("F02-H1 Meter shows the sign-in gate over the board shell", async ({ page }) => {
    await page.goto("/meter");
    await expect(page.getByRole("heading", { name: /sign in to use meter/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /sign up/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
  });
});
