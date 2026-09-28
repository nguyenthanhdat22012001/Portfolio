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

  test("switching locale reloads motion on the next interaction", async ({
    page
  }) => {
    await page.goto("/en");
    await loadMotion(page);
    await page.getByRole("link", { name: /VI/ }).first().click();
    await expect(page).toHaveURL(/\/vi$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
    // Each locale has its own root layout, so switching locale unmounts and
    // remounts it as a new document; motion re-arms and needs a fresh
    // interaction, same as a first visit.
    await loadMotion(page);
    await expect(page.locator(".pin-spacer")).not.toHaveCount(0);
    await expect(page.locator("[data-oneloyalty-counter]")).toHaveAttribute(
      "data-counter-template",
      /\{current\}/
    );
  });

  test("clicking Read case study while the Swift chapter is pinned navigates to it", async ({
    page
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/en");
    await loadMotion(page);

    const chapter = page.locator('[data-chapter="swift-performance"]');
    await chapter.scrollIntoViewIfNeeded();
    const timer = page.locator("[data-swift-timer]");
    await expect(async () => {
      await page.mouse.wheel(0, 100);
      const text = await timer.textContent();
      expect(text).not.toBe("");
      expect(text).not.toBe("0.0s");
    }).toPass({ timeout: 10_000 });

    await chapter.getByRole("link", { name: /Read case study/ }).click();
    await expect(page).toHaveURL(/\/en\/work\/swift-performance$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Swift"
    );
    expect(pageErrors).toEqual([]);
  });
});

test.describe("Lenis momentum vs. navigation scroll reset", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("wheel momentum doesn't override the scroll reset when navigating into a case study", async ({
    page
  }) => {
    await page.goto("/en");
    await loadMotion(page);

    await page.mouse.wheel(0, 1200);
    // force: true skips Playwright's default actionability wait (which
    // scrolls the target into view and waits for its position to stop
    // moving) — that wait happens to outlast Lenis's momentum tail, which
    // would hide the regression under test. A real click can land mid-tail.
    await page
      .locator('[data-chapter="swift-performance"]')
      .getByRole("link", { name: /Read case study/ })
      .click({ force: true });

    await expect(page).toHaveURL(/\/en\/work\/swift-performance$/);
    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 })
      .toBeLessThan(50);
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
  });

  test("wheel momentum doesn't override the scroll reset when using the back link", async ({
    page
  }) => {
    await page.goto("/en");
    await loadMotion(page);
    await page
      .locator('[data-chapter="swift-performance"]')
      .getByRole("link", { name: /Read case study/ })
      .click();
    await expect(page).toHaveURL(/\/en\/work\/swift-performance$/);

    await page.mouse.wheel(0, 300);
    await page.getByRole("link", { name: /←/ }).click();

    await expect(page).toHaveURL(/\/en#work$/);
    await expect(page.locator("#work h2")).toBeInViewport({
      timeout: 10_000
    });
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("every heading is visible", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    for (const id of ["about", "work", "skills", "contact"]) {
      await page.locator(`section#${id}`).scrollIntoViewIfNeeded();
      await expect(page.locator(`section#${id} h2`)).toBeVisible();
    }
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("loads without smooth scroll, pins, or cursor", async ({ page }) => {
    await page.goto("/en");
    await loadMotion(page);
    await expect(page.locator("html")).not.toHaveClass(/lenis/);
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
    await expect(page.locator("[data-cursor]")).toHaveCount(0);
    await page.locator("#skills").scrollIntoViewIfNeeded();
    await expect(page.locator("#skills li").first()).toHaveCSS("opacity", "1");
  });
});

test.describe("touch devices", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true
  });

  test("load motion without pins or cursor", async ({ page }) => {
    await page.goto("/en");
    const html = page.locator("html");
    await expect(async () => {
      await page.touchscreen.tap(195, 400);
      await expect(html).toHaveAttribute("data-motion-ready", "", {
        timeout: 500
      });
    }).toPass({ timeout: 10_000 });
    await expect(html).not.toHaveClass(/lenis/);
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
    await expect(page.locator("[data-cursor]")).toHaveCount(0);
  });
});

test("content scrolled past before motion loads stays visible", async ({
  page
}) => {
  await page.goto("/en");
  await page.evaluate(() =>
    document.querySelector("#skills")?.scrollIntoView()
  );
  // The scroll above is the first interaction; wait for the engine.
  await expect(page.locator("html")).toHaveAttribute("data-motion-ready");
  await expect(page.locator("#about h2")).toHaveCSS("opacity", "1");
  await expect(page.locator("#skills li").first()).toHaveCSS("opacity", "1");
});

test("shrinking a desktop window to mobile removes pins", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/en");
  await loadMotion(page);
  await expect(page.locator(".pin-spacer")).not.toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  await page
    .locator('[data-chapter="swift-performance"]')
    .scrollIntoViewIfNeeded();
  await expect(
    page.locator('[data-chapter="swift-performance"] h3')
  ).toBeVisible();
});
