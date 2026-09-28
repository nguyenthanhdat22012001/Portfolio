import { gzipSync } from "node:zlib";
import { expect, test, type Page, type Response } from "@playwright/test";

const MOTION_BUDGET_BYTES = 70 * 1024;

async function loadMotion(page: Page) {
  await page.mouse.move(200, 200);
  await expect(page.locator("html")).toHaveAttribute("data-motion-ready");
}

test.describe("motion loading", () => {
  test("ships no motion code until the first interaction", async ({ page }) => {
    await page.goto("/en");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).not.toHaveAttribute("data-motion-ready");
    await loadMotion(page);
  });

  test("the lazily loaded motion code stays under 70 KB gzip", async ({
    page
  }) => {
    const lazyScripts: Response[] = [];
    let armed = false;
    page.on("response", (response) => {
      if (
        armed &&
        response.request().resourceType() === "script" &&
        response.url().includes("/_next/static/")
      ) {
        lazyScripts.push(response);
      }
    });

    await page.goto("/en");
    await page.waitForLoadState("networkidle");
    armed = true;
    await loadMotion(page);

    const bodies = await Promise.all(lazyScripts.map((r) => r.body()));
    const gzipBytes = bodies.reduce(
      (sum, body) => sum + gzipSync(body).length,
      0
    );
    console.log(`motion chunk: ${(gzipBytes / 1024).toFixed(1)} KB gzip`);
    expect(lazyScripts.length).toBeGreaterThan(0);
    expect(gzipBytes).toBeLessThanOrEqual(MOTION_BUDGET_BYTES);
  });
});
