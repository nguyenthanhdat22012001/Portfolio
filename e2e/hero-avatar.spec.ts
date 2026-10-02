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
  test("never downloads the fallback images it doesn't show", async ({
    page
  }) => {
    const webp: string[] = [];
    page.on("request", (request) => {
      if (/\/images\/avatar-(wave|idle)\.webp$/.test(request.url()))
        webp.push(request.url());
    });
    await page.goto("/en");
    await expect(graph(page)).toHaveAttribute("data-gate", "live", {
      timeout: 15_000
    });
    await page.waitForTimeout(1000);
    expect(webp).toEqual([]);
  });

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

const slot = (page: Page) => page.locator("#hero-canvas-slot");

// Records every data-avatar-phase value, in order, for each document.
async function recordPhases(page: Page) {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __avatarPhases: string[] }).__avatarPhases = seen;
    new MutationObserver(() => {
      const phase =
        document.getElementById("hero-canvas-slot")?.dataset.avatarPhase;
      if (phase && seen.at(-1) !== phase) seen.push(phase);
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-avatar-phase"]
    });
  });
  return () =>
    page.evaluate(
      () => (window as unknown as { __avatarPhases: string[] }).__avatarPhases
    );
}

test.describe("avatar intro on desktop", () => {
  test("walks, waves, then idles within 6 s of the model loading", async ({
    page
  }) => {
    const problems = collectConsoleProblems(page);
    const phases = await recordPhases(page);
    const loaded = page.waitForResponse((r) => isGlb(r.url()), {
      timeout: 20_000
    });
    await page.goto("/en");
    await (await loaded).finished();
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 6_000
    });
    expect(await phases()).toEqual(["enter", "walk", "wave", "idle"]);
    expect(problems).toEqual([]);
  });

  test("a reload in the same session only waves", async ({ page }) => {
    const phases = await recordPhases(page);
    await page.goto("/en");
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    await page.reload();
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    expect(await phases()).toEqual(["wave", "idle"]);
  });

  // Review Focus 2
  test("runs the full intro when sessionStorage throws", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "sessionStorage", {
        get() {
          throw new DOMException("blocked", "SecurityError");
        }
      });
    });
    const phases = await recordPhases(page);
    await page.goto("/en");
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    expect((await phases())[0]).toBe("enter");
  });

  // Review Focus 3
  test("switching locale keeps one canvas and only waves on the new page", async ({
    page
  }) => {
    const phases = await recordPhases(page);
    await page.goto("/en");
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    // A client navigation keeps `window`, so the recorder spans both pages;
    // only look at what happened after the switch.
    const before = (await phases()).length;
    await page.locator('a[hreflang="vi"]').first().click();
    await expect(page).toHaveURL(/\/vi/);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    await expect(page.locator("canvas")).toHaveCount(1);
    expect((await phases()).slice(before)).not.toContain("walk");
  });

  // Review Focus 4
  test("the theme toggle neither remounts the canvas nor replays the intro", async ({
    page
  }) => {
    await page.goto("/en");
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    const before = await page
      .locator("#hero-canvas-slot canvas")
      .elementHandle();
    await page.getByRole("button", { name: "Dark theme" }).click();
    await page.waitForTimeout(500);
    expect(await before?.evaluate((el) => el.isConnected)).toBe(true);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle");
  });
});

test.describe("avatar and scroll", () => {
  test("recedes and hides by morph 0.5, returns on scroll up, never replays", async ({
    page
  }) => {
    const phases = await recordPhases(page);
    await page.goto("/en");
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    await page.mouse.move(200, 200);
    await expect(page.locator("html")).toHaveAttribute(
      "data-motion-ready",
      "",
      { timeout: 10_000 }
    );
    const heroHeight = await page
      .locator("#top")
      .evaluate((el) => el.getBoundingClientRect().height);
    await page.mouse.wheel(0, heroHeight);
    await expect(slot(page)).toHaveAttribute("data-avatar-hidden", "", {
      timeout: 10_000
    });
    await page.mouse.wheel(0, -heroHeight);
    await expect(slot(page)).not.toHaveAttribute("data-avatar-hidden", "", {
      timeout: 10_000
    });
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle");
    expect((await phases()).filter((p) => p === "walk")).toHaveLength(1);
  });
});

test.describe("avatar interaction", () => {
  test("clicking the avatar in idle waves again; the cursor reacts on hover", async ({
    page
  }) => {
    const phases = await recordPhases(page);
    await page.goto("/en");
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    // The avatar's body: horizontally at --avatar-left-md, vertically mid-figure.
    const target = await slot(page).evaluate((el) => {
      const r = el.getBoundingClientRect();
      const left = parseFloat(
        getComputedStyle(
          el.querySelector(".hero-avatar-fallback")!
        ).getPropertyValue("--avatar-left-md")
      );
      return { x: r.left + (r.width * left) / 100, y: r.top + r.height * 0.5 };
    });
    await page.mouse.move(target.x, target.y, { steps: 4 });
    await expect(slot(page)).toHaveAttribute("data-avatar-hover", "");
    const before = (await phases()).length;
    await page.mouse.click(target.x, target.y);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "wave");
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 5_000
    });
    expect((await phases()).slice(before)).toEqual(["wave", "idle"]);
    await page.mouse.move(5, 5, { steps: 4 });
    await expect(slot(page)).not.toHaveAttribute("data-avatar-hover", "");
  });
});
