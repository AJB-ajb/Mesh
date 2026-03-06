import { defineConfig, devices } from "@playwright/test";
import path from "path";
import dotenv from "dotenv";

// Load .env for test utilities (supabase client, seed helpers, etc.)
dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // Login once, save cookies
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    // Authed layout tests — reuse saved session
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.TEST_USER_PASSWORD
          ? { storageState: "tests/.auth/user.json" }
          : {}),
      },
      dependencies: ["setup"],
      testMatch: /e2e\/layout\.spec\.ts/,
    },
    // Public pages — no auth, no interference, run in parallel
    {
      name: "public",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /e2e\/(home|navigation)\.spec\.ts/,
    },
    // Auth-flow tests (login/logout UI) — must run after layout tests
    // because the logout test invalidates the Supabase session server-side.
    {
      name: "auth-flow",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["chromium"],
      testMatch: /e2e\/auth-feature\.spec\.ts/,
    },
    // Self-authenticating tests — use the authenticated fixture which
    // creates/cleans up its own users via Supabase Admin API.
    {
      name: "authenticated",
      use: { ...devices["Desktop Chrome"] },
      testMatch:
        /e2e\/(posting-creation|application-flow|discover-filtering)\.spec\.ts/,
    },
    // Full multi-user lifecycle tests — opt-in, not run by default.
    // Run with: pnpm test:e2e:full
    {
      name: "e2e-full",
      use: { ...devices["Desktop Chrome"] },
      testDir: "./tests/e2e-full",
      timeout: 60_000,
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
