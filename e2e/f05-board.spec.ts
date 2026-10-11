import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

function guard(page: import("@playwright/test").Page) {
  page.on("console", (m) => {
    if (m.type() === "error") throw new Error("console error: " + m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 500) throw new Error(`${r.status()} on ${r.url()}`);
  });
}

test.describe("F05 daily trading loop", () => {
  test.beforeEach(({ page }) => guard(page));

  test("F05-H1 board ranks bullish, then switches to bearish", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: /the board/i })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Bullish" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("meter").first()).toBeVisible();
    await page.getByRole("tab", { name: "Bearish" }).click();
    await expect(page.getByRole("tab", { name: "Bearish" })).toHaveAttribute("aria-selected", "true");
  });

  test("F05-E1 renders at mobile width with a bottom tab bar", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 812 });
    await page.goto("/app");
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("F05-E4 axe accessibility scan is clean", async ({ page }) => {
    await page.goto("/app");
    const a11y = await new AxeBuilder({ page }).analyze();
    expect(a11y.violations).toEqual([]);
  });
});
