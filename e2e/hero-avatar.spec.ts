import { expect, test, type Page } from "@playwright/test";
import {
  collectConsoleProblems,
  gzipBytes,
  splitAvatarChunks,
  trackScripts
} from "./helpers/scripts";

// Measured 22.8 KB (2 files) + 3 KB (CLAUDE.md, design doc D2).
const AVATAR_BUDGET_BYTES = 26 * 1024;

const graph = (page: Page) => page.locator("[data-hero-graph]");
const pose = (page: Page, name: "wave" | "idle") =>
  page.locator(`#hero-canvas-slot [data-avatar-pose="${name}"]`);
const isGlb = (url: string) => url.endsWith("/models/avatar.glb");

function trackGlb(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (request) => {
    if (isGlb(request.url())) urls.push(request.url());
  });
  return urls;
}

test.describe("avatar fallback without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("shows the idle image", async ({ page }) => {
    await page.goto("/en");
    await expect(pose(page, "idle")).toBeVisible();
    await expect(pose(page, "wave")).toBeHidden();
  });
});

test.describe("avatar fallback with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("never requests avatar.glb and shows the static idle image", async ({
    page
  }) => {
    const glb = trackGlb(page);
    await page.goto("/en");
    await expect(graph(page)).toHaveAttribute("data-gate", "fallback");
    await expect(pose(page, "idle")).toBeVisible();
    await expect(pose(page, "wave")).toBeHidden();
    await page.waitForTimeout(3000);
    await expect(pose(page, "idle")).toBeVisible();
    expect(glb).toEqual([]);
  });
});

test.describe("avatar fallback on mobile (Low tier)", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });

  test("never downloads avatar.glb; waves, then idles", async ({ page }) => {
    const glb = trackGlb(page);
    await page.goto("/en");
    await expect(pose(page, "wave")).toBeVisible();
    await expect(pose(page, "idle")).toBeHidden();
    await page.evaluate(() => window.scrollBy(0, 40));
    await expect(graph(page)).toHaveAttribute("data-gate", "live", {
      timeout: 15_000
    });
    await expect(pose(page, "idle")).toBeVisible({ timeout: 4_000 });
    await expect(pose(page, "wave")).toBeHidden();
    await page.waitForTimeout(1000);
    expect(glb).toEqual([]);
  });

  test("the fallback image is smaller than the h1", async ({ page }) => {
    await page.goto("/en");
    const area = (selector: string) =>
      page.locator(selector).evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.width * r.height;
      });
    const h1 = await area("#hero-title");
    expect(
      await area('#hero-canvas-slot [data-avatar-pose="wave"]')
    ).toBeLessThan(h1);
    expect(
      await area('#hero-canvas-slot [data-avatar-pose="idle"]')
    ).toBeLessThan(h1);
  });
});

test.describe("avatar fallback on desktop", () => {
  test("is not shown while the 3D avatar can stand there", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator(".hero-avatar-fallback")).toBeHidden();
    await expect(graph(page)).toHaveAttribute("data-gate", "live", {
      timeout: 15_000
    });
    await expect(page.locator(".hero-avatar-fallback")).toBeHidden();
  });
});

test.describe("avatar 3D on desktop", () => {
  test("loads avatar.glb exactly once, after the canvas is live", async ({
    page
  }) => {
    const glb = trackGlb(page);
    const problems = collectConsoleProblems(page);
    const loaded = page.waitForResponse((r) => isGlb(r.url()), {
      timeout: 20_000
    });
    await page.goto("/en");
    await expect(graph(page)).toHaveAttribute("data-gate", "live", {
      timeout: 15_000
    });
    await loaded;
    await page.waitForTimeout(1000);
    expect(glb).toHaveLength(1);
    await expect(graph(page)).toHaveAttribute("data-tier", /^(high|medium)$/);
    expect(problems).toEqual([]);
  });

  test("the avatar chunk stays under its cap", async ({ page }) => {
    const scripts = trackScripts(page);
    const loaded = page.waitForResponse((r) => isGlb(r.url()), {
      timeout: 20_000
    });
    await scripts.goto("/en");
    await loaded;
    const { avatar } = await splitAvatarChunks(scripts.lazy());
    const bytes = await gzipBytes(avatar);
    console.log(
      `avatar chunk: ${(bytes / 1024).toFixed(1)} KB gzip (${avatar.length} file(s))`
    );
    expect(avatar.length).toBeGreaterThan(0);
    expect(bytes).toBeLessThanOrEqual(AVATAR_BUDGET_BYTES);
  });

  // Review Focus 1
  test("a failed avatar.glb leaves the graph live and shows the idle image", async ({
    page
  }) => {
    await page.route("**/models/avatar.glb", (route) =>
      route.fulfill({ status: 404 })
    );
    await page.goto("/en");
    await expect(graph(page)).toHaveAttribute("data-gate", "live", {
      timeout: 15_000
    });
    await expect(page.locator("#hero-canvas-slot")).toHaveAttribute(
      "data-avatar-failed",
      "",
      { timeout: 15_000 }
    );
    await expect(pose(page, "idle")).toBeVisible();
    await expect(pose(page, "wave")).toBeHidden();
    await page.waitForTimeout(1000);
    await expect(graph(page)).toHaveAttribute("data-gate", "live");
    await expect(page.locator("#hero-canvas-slot canvas")).toHaveCount(1);
  });
});
