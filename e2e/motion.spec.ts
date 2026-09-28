import { gzipSync } from "node:zlib";
import { expect, test, type Page, type Response } from "@playwright/test";

const MOTION_BUDGET_BYTES = 70 * 1024;

async function loadMotion(page: Page) {
  const html = page.locator("html");
  let step = 0;
  await expect(async () => {
    step += 1;
    await page.mouse.move(100 + step * 10, 200);
    await expect(html).toHaveAttribute("data-motion-ready", "", {
      timeout: 500
    });
  }).toPass({ timeout: 10_000 });
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

test("header links smooth-scroll to their section on desktop", async ({
  page
}) => {
  await page.goto("/en");
  await loadMotion(page);
  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Work" })
    .click();
  await expect(page).toHaveURL(/#work$/);
  await expect(page.locator("#work h2")).toBeInViewport();
});

test.describe("navigation", () => {
  test("home → case study → back re-creates the pinned chapters", async ({
    page
  }) => {
    await page.goto("/en");
    await loadMotion(page);
    await expect(page.locator(".pin-spacer")).not.toHaveCount(0);

    await page
      .locator('[data-chapter="swift-performance"]')
      .getByRole("link", { name: /Read case study/ })
      .click();
    await expect(page).toHaveURL(/\/en\/work\/swift-performance$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Swift"
    );

    await page.getByRole("link", { name: /←/ }).click();
    await expect(page).toHaveURL(/\/en#work$/);
    await expect(page.locator("html")).toHaveAttribute("data-motion-ready");
    await expect(page.locator(".pin-spacer")).not.toHaveCount(0);
  });

  test("browser Back from a case study keeps motion working", async ({
    page
  }) => {
    await page.goto("/en");
    await loadMotion(page);
    await page
      .locator('[data-chapter="swift-performance"]')
      .getByRole("link", { name: /Read case study/ })
      .click();
    await expect(page).toHaveURL(/\/work\/swift-performance$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/en(#work)?$/);
    await expect(page.locator(".pin-spacer")).not.toHaveCount(0);
    await page.mouse.wheel(0, 800);
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(0);
  });

  test("switching locale keeps motion and uses the new locale's copy", async ({
    page
  }) => {
    await page.goto("/en");
    await loadMotion(page);
    await page.getByRole("link", { name: /VI/ }).first().click();
    await expect(page).toHaveURL(/\/vi$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
    await expect(page.locator("html")).toHaveAttribute("data-motion-ready");
    await expect(page.locator(".pin-spacer")).not.toHaveCount(0);
    await expect(page.locator("[data-oneloyalty-counter]")).toHaveAttribute(
      "data-counter-template",
      /\{current\}/
    );
  });
});
