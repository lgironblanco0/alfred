import { defineConfig, devices } from "@playwright/test";

/**
 * E2E de ALFRED.
 *
 * `npm run test:e2e` prepara una base temporal y lanza este config.
 * Playwright arranca la API en 3100 y Vite en 5180.
 */

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5180",
    trace: "on-first-retry",
    video: "off",
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      command: "npm run dev",
      url: "http://localhost:3100/health",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        PORT: "3100",
        DATABASE_URL: process.env.DATABASE_URL ?? "",
        LOG_LEVEL: "silent",
      },
    },
    {
      command: "npm --prefix web run dev -- --port 5180 --strictPort",
      url: "http://localhost:5180",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ALFRED_API_URL: "http://localhost:3100",
      },
    },
  ],
});
