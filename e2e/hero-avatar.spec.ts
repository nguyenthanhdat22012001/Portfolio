import { expect, test, type Page } from "@playwright/test";

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
