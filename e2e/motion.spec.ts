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

  test(
    "the lazily loaded motion code stays under 70 KB gzip",
    { tag: "@webgl" },
    async ({ page }) => {
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
      // The desktop hero canvas loads on idle; let it finish so its chunk
      // isn't counted as motion code.
      await expect(page.locator("[data-hero-graph]")).toHaveAttribute(
        "data-gate",
        "live",
        { timeout: 15_000 }
      );
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
    }
  );
});

test(
  "header links smooth-scroll to their section on desktop",
  { tag: "@desktop" },
  async ({ page }) => {
    await page.goto("/en");
    await loadMotion(page);
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Work" })
      .click();
    await expect(page).toHaveURL(/#work$/);
    await expect(page.locator("#work h2")).toBeInViewport();
  }
);

// Pinned chapters exist only on desktop with motion allowed.
test.describe("navigation", { tag: ["@desktop", "@motion"] }, () => {
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
    await expect(
      page.locator('[data-chapter="swift-performance"] [data-step]')
    ).toHaveCount(4);
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
    const steps = chapter.locator("[data-step]");
    await expect(async () => {
      await page.mouse.wheel(0, 100);
      const states = await steps.evaluateAll((els) =>
        els.map((el) => (el as HTMLElement).dataset.state)
      );
      expect(states.some((state) => state !== "pending")).toBe(true);
      expect(states.some((state) => state !== "done")).toBe(true);
    }).toPass({ timeout: 10_000 });

    await chapter.getByRole("link", { name: /Read case study/ }).click();
    await expect(page).toHaveURL(/\/en\/work\/swift-performance$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Swift"
    );
    expect(pageErrors).toEqual([]);
  });
});

test.describe(
  "Lenis momentum vs. navigation scroll reset",
  { tag: ["@desktop", "@motion"] },
  () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test("wheel momentum doesn't override the scroll reset when navigating into a case study", async ({
      page
    }) => {
      await page.goto("/en");
      await loadMotion(page);

      await page.mouse.wheel(0, 1200);
      // dispatchEvent skips Playwright's actionability wait (which scrolls the
      // target into view and waits for its position to stop moving) — that
      // wait happens to outlast Lenis's momentum tail, which would hide the
      // regression under test. A real click can land mid-tail. A coordinate
      // click (even forced) misses in Firefox and WebKit, where Lenis pulls
      // the link away after Playwright scrolls it into view.
      await page
        .locator('[data-chapter="swift-performance"]')
        .getByRole("link", { name: /Read case study/ })
        .dispatchEvent("click");

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
  }
);

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

  test("keeps live-progress and the CLS demo in their final state", async ({
    page
  }) => {
    await page.goto("/en");
    await loadMotion(page);
    const swift = page.locator('[data-chapter="swift-performance"]');
    await swift.scrollIntoViewIfNeeded();
    await expect(swift.locator('[data-step][data-state="done"]')).toHaveCount(
      4
    );
    await expect(swift.locator("[data-result-value]")).toHaveText("−20%");
    await expect(swift.locator("[data-result-value]")).toHaveCSS(
      "opacity",
      "1"
    );
    const demo = page.locator("[data-cls-demo]");
    await demo.scrollIntoViewIfNeeded();
    await expect(demo.locator("[data-cards]").first()).toHaveCSS(
      "transform",
      "none"
    );
    await expect(demo.locator("[data-async-content]")).toHaveCSS(
      "opacity",
      "1"
    );
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
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
  // The scroll above is the first interaction; wait for the engine. Under
  // load WebKit can scroll before hydration adds the listener, so repeat a
  // scroll event in place (no movement) until motion loads.
  await expect(async () => {
    await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
    await expect(page.locator("html")).toHaveAttribute(
      "data-motion-ready",
      "",
      { timeout: 500 }
    );
  }).toPass({ timeout: 10_000 });
  await expect(page.locator("#about h2")).toHaveCSS("opacity", "1");
  await expect(page.locator("#skills li").first()).toHaveCSS("opacity", "1");
});

test(
  "shrinking a desktop window to mobile removes pins",
  { tag: ["@desktop", "@motion"] },
  async ({ page }) => {
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
  }
);

test.describe("layout stability", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // Scrolls with the mouse wheel, which mobile WebKit doesn't have.
  test(
    "Home keeps CLS under 0.1 while scrolling to the bottom",
    { tag: "@desktop" },
    async ({ page }) => {
      // Session-window CLS, as Core Web Vitals defines it: shifts less than
      // 1 s apart and within 5 s form a window; CLS is the worst window.
      await page.addInitScript(() => {
        const state = { cls: 0, current: 0, first: 0, last: 0 };
        (window as unknown as { __cls: typeof state }).__cls = state;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as Array<{
            value: number;
            startTime: number;
            hadRecentInput: boolean;
          }>) {
            if (entry.hadRecentInput) continue;
            const continues =
              state.current > 0 &&
              entry.startTime - state.last < 1000 &&
              entry.startTime - state.first < 5000;
            state.current = continues
              ? state.current + entry.value
              : entry.value;
            if (!continues) state.first = entry.startTime;
            state.last = entry.startTime;
            state.cls = Math.max(state.cls, state.current);
          }
        }).observe({ type: "layout-shift", buffered: true });
      });

      await page.goto("/en");
      await loadMotion(page);
      await expect(async () => {
        await page.mouse.wheel(0, 600);
        const atBottom = await page.evaluate(
          () =>
            window.scrollY + window.innerHeight >=
            document.documentElement.scrollHeight - 2
        );
        expect(atBottom).toBe(true);
      }).toPass({ timeout: 30_000 });

      const cls = await page.evaluate(
        () => (window as unknown as { __cls: { cls: number } }).__cls.cls
      );
      console.log(`home CLS after scrolling: ${cls.toFixed(4)}`);
      expect(cls).toBeLessThan(0.1);
    }
  );

  test("round trips to a case study don't leak ScrollTrigger triggers", async ({
    page
  }) => {
    // 11 navigations: ~25 s on WebKit locally, over the 30 s default on CI.
    test.setTimeout(120_000);
    await page.goto("/en");
    await loadMotion(page);

    const triggerCount = () =>
      page.evaluate(() =>
        Number(document.documentElement.dataset.motionTriggers)
      );
    const roundTrip = async () => {
      await page
        .locator('[data-chapter="swift-performance"]')
        .getByRole("link", { name: /Read case study/ })
        .click();
      await expect(page).toHaveURL(/\/en\/work\/swift-performance$/);
      await page.getByRole("link", { name: /←/ }).click();
      await expect(page).toHaveURL(/\/en#work$/);
      await expect(page.locator("html")).toHaveAttribute("data-motion-ready");
      // Let the #work hash scroll land before anything is read.
      let last = -1;
      await expect
        .poll(
          async () => {
            const y = await page.evaluate(() => Math.round(window.scrollY));
            const settled = y > 0 && y === last;
            last = y;
            return settled;
          },
          { intervals: [250] }
        )
        .toBe(true);
    };

    // The first return is the baseline: Swift is on screen on /en#work, so
    // its isAtOrAboveViewport guard skips it and the count is lower than on
    // the initial load. Every later trip must stay at or below it.
    await roundTrip();
    await expect.poll(triggerCount).toBeGreaterThan(0);
    const baseline = await triggerCount();

    for (let trip = 0; trip < 10; trip += 1) {
      await roundTrip();
      await expect.poll(triggerCount).toBeLessThanOrEqual(baseline);
    }
  });
});
