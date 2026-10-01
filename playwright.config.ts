import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000"
  },
  webServer: {
    command: process.env.CI ? "pnpm start" : "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /hero-3d-no-webgl\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        // Headless Chromium no longer falls back to software WebGL on its own.
        launchOptions: {
          args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
        }
      }
    },
    {
      name: "chromium-no-webgl",
      testMatch: /hero-3d-no-webgl\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { args: ["--disable-webgl", "--disable-3d-apis"] }
      }
    }
  ]
});
