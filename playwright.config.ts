import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Start the dev server yourself (`npm run dev`), or let Playwright do it:
  // webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true },
});
