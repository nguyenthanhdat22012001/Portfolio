import { defineConfig, devices } from "@playwright/test";

// WebGL specs run on desktop Chromium only (SwiftShader); the no-WebGL spec
// has its own project.
const WEBGL_SPECS =
  /\/(hero-3d|hero-3d-visual|about-avatar|about-avatar-visual)\.spec\.ts$/;
const NO_WEBGL_SPEC = /hero-3d-no-webgl\.spec\.ts$/;
const NOT_WEBGL = [WEBGL_SPECS, NO_WEBGL_SPEC];
// Run one at a time (chromium-webgl): parallel SwiftShader renders starve the
// CPU, the avatar's PerformanceMonitor drops to Low and it falls back mid-intro.
const SERIAL_WEBGL_SPECS = /\/(hero-3d|about-avatar)\.spec\.ts$/;
// Snapshot baselines are platform-specific (darwin only), so CI skips them.
const LOCAL_ONLY_SPECS = /\/(hero-3d|about-avatar)-visual\.spec\.ts$/;

// Optional: run against a deployment (e.g. a Vercel preview) instead of a
// local build. The bypass header goes with every request, third-party
// included; the secret only opens previews of a public site. The toolbar
// header keeps Vercel's preview toolbar (its own scripts and requests) out.
const remote = process.env.PLAYWRIGHT_BASE_URL;
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

const swiftshader = {
  // Headless Chromium no longer falls back to software WebGL on its own.
  launchOptions: {
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
  }
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: remote ?? "http://localhost:3000",
    ...(remote && bypass
      ? {
          extraHTTPHeaders: {
            "x-vercel-protection-bypass": bypass,
            "x-vercel-skip-toolbar": "1"
          }
        }
      : {})
  },
  webServer: remote
    ? undefined
    : {
        command: process.env.CI ? "pnpm start" : "pnpm build && pnpm start",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        // Builds the Umami markup e2e checks; data-domains never matches
        // outside a Vercel production build, so nothing is sent.
        env: {
          NEXT_PUBLIC_UMAMI_ID: process.env.NEXT_PUBLIC_UMAMI_ID ?? "ci-dummy"
        }
      },
  projects: [
    {
      name: "chromium",
      testIgnore: [
        NO_WEBGL_SPEC,
        SERIAL_WEBGL_SPECS,
        ...(process.env.CI ? [LOCAL_ONLY_SPECS] : [])
      ],
      use: { ...devices["Desktop Chrome"], ...swiftshader }
    },
    {
      name: "chromium-webgl",
      testMatch: SERIAL_WEBGL_SPECS,
      workers: 1,
      use: { ...devices["Desktop Chrome"], ...swiftshader }
    },
    {
      name: "chromium-no-webgl",
      testMatch: NO_WEBGL_SPEC,
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { args: ["--disable-webgl", "--disable-3d-apis"] }
      }
    },
    {
      name: "firefox",
      testIgnore: NOT_WEBGL,
      grepInvert: /@webgl/,
      use: devices["Desktop Firefox"]
    },
    {
      name: "webkit",
      testIgnore: NOT_WEBGL,
      grepInvert: /@webgl/,
      use: devices["Desktop Safari"]
    },
    {
      name: "iphone-13",
      testIgnore: NOT_WEBGL,
      grepInvert: /@webgl|@desktop/,
      use: devices["iPhone 13"]
    },
    {
      name: "pixel-7",
      testIgnore: NOT_WEBGL,
      grepInvert: /@webgl|@desktop/,
      use: devices["Pixel 7"]
    },
    {
      name: "chromium-reduced-motion",
      testIgnore: NOT_WEBGL,
      grepInvert: /@webgl|@motion/,
      use: { ...devices["Desktop Chrome"], reducedMotion: "reduce" }
    }
  ]
});
