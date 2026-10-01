import { expect, test, type Page } from "@playwright/test";
import { collectConsoleProblems, gzipBytes, trackScripts } from "./helpers/scripts";

const graph = (page: Page) => page.locator("[data-hero-graph]");
const svg = (page: Page, state: "chaos" | "layered") =>
  page.locator(`#hero-canvas-slot [data-graph-state="${state}"]`);
const caption = (page: Page, state: "chaos" | "layered") =>
  page.locator(`[data-caption-line="${state}"]`);

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("shows the layered graph and the layered caption", async ({ page }) => {
    await page.goto("/en");
    await expect(svg(page, "layered")).toBeVisible();
    await expect(svg(page, "chaos")).toBeHidden();
    await expect(caption(page, "layered")).toBeVisible();
    await expect(caption(page, "chaos")).toBeHidden();
    await expect(page.getByText("app", { exact: true })).toBeVisible();
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("shows the layered graph from the first paint", async ({ page }) => {
    await page.goto("/en");
    await expect(svg(page, "layered")).toBeVisible();
    await expect(caption(page, "layered")).toBeVisible();
  });
});

test.describe("with JS and motion allowed (placeholder)", () => {
  // Narrow touch viewport keeps the gate pending without interaction, so the
  // tangle placeholder state is deterministic.
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("the tangle is the placeholder", async ({ page }) => {
    await page.goto("/en");
    await expect(graph(page)).toHaveAttribute("data-gate", "pending");
    await expect(graph(page)).toHaveAttribute("data-morph", "chaos");
    await expect(svg(page, "chaos")).toBeVisible();
    await expect(caption(page, "chaos")).toBeVisible();
  });
});

const CANVAS_BUDGET_BYTES = 250 * 1024;
const INITIAL_BUDGET_BYTES = 150 * 1024;
const canvas = (page: Page) => page.locator("#hero-canvas-slot canvas");

test.describe("desktop", () => {
  test("mounts the canvas after load + idle with no console problems", async ({ page }) => {
    const problems = collectConsoleProblems(page);
    await page.goto("/en");
    await expect(graph(page)).toHaveAttribute("data-gate", "live", { timeout: 15_000 });
    await expect(canvas(page)).toHaveCount(1);
    await expect(graph(page)).toHaveAttribute("data-tier", /^(high|medium)$/);
    expect(problems).toEqual([]);
  });

  test("the 3D chunk stays under 250 KB gzip and initial JS under 150 KB", async ({ page }) => {
    const scripts = trackScripts(page);
    await scripts.goto("/en");
    await expect(graph(page)).toHaveAttribute("data-gate", "live", { timeout: 15_000 });
    const lazyBytes = await gzipBytes(scripts.lazy());
    const initialBytes = await gzipBytes(scripts.initial());
    console.log(`3D chunk: ${(lazyBytes / 1024).toFixed(1)} KB gzip; initial: ${(initialBytes / 1024).toFixed(1)} KB gzip`);
    expect(scripts.lazy().length).toBeGreaterThan(0);
    expect(lazyBytes).toBeLessThanOrEqual(CANVAS_BUDGET_BYTES);
    expect(initialBytes).toBeLessThanOrEqual(INITIAL_BUDGET_BYTES);
  });
});

test.describe("reduced motion (gate)", () => {
  test.use({ reducedMotion: "reduce" });

  test("never requests the 3D chunk", async ({ page }) => {
    const scripts = trackScripts(page);
    await scripts.goto("/en");
    await expect(graph(page)).toHaveAttribute("data-gate", "fallback");
    await page.waitForTimeout(3000);
    expect(scripts.lazy()).toEqual([]);
    await expect(canvas(page)).toHaveCount(0);
  });
});

test.describe("mobile (Lighthouse-like)", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });

  test("loads no 3D code until the first interaction, then mounts Low", async ({ page }) => {
    const scripts = trackScripts(page);
    await scripts.goto("/en");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    expect(scripts.lazy()).toEqual([]);
    await expect(graph(page)).toHaveAttribute("data-gate", "pending");

    await page.evaluate(() => window.scrollBy(0, 40));
    await expect(graph(page)).toHaveAttribute("data-gate", "live", { timeout: 15_000 });
    await expect(graph(page)).toHaveAttribute("data-tier", "low");
  });
});

async function waitLive(page: Page) {
  await expect(graph(page)).toHaveAttribute("data-gate", "live", { timeout: 15_000 });
}

test.describe("desktop scene", () => {
  test("draws in at most 6 draw calls", async ({ page }) => {
    await page.goto("/en");
    await waitLive(page);
    await expect.poll(async () => Number(await graph(page).getAttribute("data-gl-calls"))).toBeGreaterThan(0);
    const calls = Number(await graph(page).getAttribute("data-gl-calls"));
    expect(calls).toBeLessThanOrEqual(6);
  });

  test("scrolling past the hero switches the caption to layered and back", async ({ page }) => {
    await page.goto("/en");
    await waitLive(page);
    await page.mouse.move(200, 200);
    await expect(page.locator("html")).toHaveAttribute("data-motion-ready", "", { timeout: 10_000 });
    const heroHeight = await page.locator("#top").evaluate((el) => el.getBoundingClientRect().height);
    await page.mouse.wheel(0, heroHeight);
    await expect(caption(page, "layered")).toBeVisible();
    await page.mouse.wheel(0, -heroHeight);
    await expect(caption(page, "chaos")).toBeVisible();
  });

  test("the theme toggle recolors without remounting the canvas", async ({ page }) => {
    const problems = collectConsoleProblems(page);
    await page.goto("/en");
    await waitLive(page);
    const before = await canvas(page).elementHandle();
    await page.getByRole("button", { name: "Dark theme" }).click();
    expect(await before?.evaluate((el) => el.isConnected)).toBe(true);
    await expect(canvas(page)).toHaveCount(1);
    expect(problems).toEqual([]);
  });

  // Review Focus 1
  test("resizing the window keeps the canvas matched to the slot", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en");
    await waitLive(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect.poll(async () => {
      const slot = await page.locator("#hero-canvas-slot").boundingBox();
      const box = await canvas(page).boundingBox();
      return Math.abs((slot?.width ?? 0) - (box?.width ?? -100));
    }).toBeLessThan(2);
  });

  // Review Focus 4
  test("a reload part-way down the hero restores the matching caption", async ({ page }) => {
    await page.goto("/en");
    const heroHeight = await page.locator("#top").evaluate((el) => el.getBoundingClientRect().height);
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(heroHeight * 0.8));
    await page.reload();
    await page.mouse.move(200, 200);
    await expect(page.locator("html")).toHaveAttribute("data-motion-ready", "", { timeout: 10_000 });
    await expect(caption(page, "layered")).toBeVisible();
  });
});

test.describe("desktop scene (follow-up)", () => {
  test("stays live well past the PerformanceMonitor sampling windows", async ({ page }) => {
    await page.goto("/en");
    await waitLive(page);
    await page.waitForTimeout(12_000);
    await expect(graph(page)).toHaveAttribute("data-gate", "live");
    await expect(canvas(page)).toHaveCount(1);
  });

  test("the graph geometry follows the morph while the slot is still on screen", async ({ page }) => {
    await page.goto("/en");
    await waitLive(page);
    await page.mouse.move(200, 200);
    await expect(page.locator("html")).toHaveAttribute("data-motion-ready", "", { timeout: 10_000 });
    await expect.poll(async () => Number(await graph(page).getAttribute("data-gl-calls"))).toBe(3);
    const distance = await page.evaluate(() => {
      const r = document.querySelector("#hero-canvas-slot")!.getBoundingClientRect();
      const header = document.querySelector("header")!.getBoundingClientRect().bottom;
      return Math.max(100, (r.top + r.height / 2 - header - 170) / 0.9);
    });
    await page.mouse.wheel(0, Math.round(distance * 0.92));
    await expect.poll(async () => Number(await graph(page).getAttribute("data-gl-calls")), { timeout: 10_000 }).toBe(2);
    const { centre, header } = await page.evaluate(() => {
      const r = document.querySelector("#hero-canvas-slot")!.getBoundingClientRect();
      return { centre: r.top + r.height / 2, header: document.querySelector("header")!.getBoundingClientRect().bottom };
    });
    expect(centre).toBeGreaterThanOrEqual(header + 80);
    expect(centre).toBeLessThan(page.viewportSize()!.height);
  });
});

test.describe("mobile scene", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });

  test("the geometry morphs while the slot is still below the header", async ({ page }) => {
    await page.goto("/en");
    await page.evaluate(() => window.scrollBy(0, 5));
    await waitLive(page);
    await expect(page.locator("html")).toHaveAttribute("data-motion-ready", "", { timeout: 10_000 });
    await page.evaluate(() => window.scrollTo(0, 90));
    await expect.poll(async () => Number(await graph(page).getAttribute("data-gl-calls")), { timeout: 10_000 }).toBe(2);
    const { centre, header } = await page.evaluate(() => {
      const r = document.querySelector("#hero-canvas-slot")!.getBoundingClientRect();
      return { centre: r.top + r.height / 2, header: document.querySelector("header")!.getBoundingClientRect().bottom };
    });
    expect(centre).toBeGreaterThanOrEqual(header + 80);
  });
});
