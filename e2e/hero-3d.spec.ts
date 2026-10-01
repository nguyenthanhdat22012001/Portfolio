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
