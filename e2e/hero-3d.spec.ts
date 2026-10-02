import { expect, test, type Page } from "@playwright/test";
import {
  collectConsoleProblems,
  gzipBytes,
  splitAvatarChunks,
  trackScripts
} from "./helpers/scripts";

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
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });

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
  test("mounts the canvas after load + idle with no console problems", async ({
    page
  }) => {
    const problems = collectConsoleProblems(page);
    await page.goto("/en");
    await expect(graph(page)).toHaveAttribute("data-gate", "live", {
      timeout: 15_000
    });
    await expect(canvas(page)).toHaveCount(1);
    await expect(graph(page)).toHaveAttribute("data-tier", /^(high|medium)$/);
    expect(problems).toEqual([]);
  });

  test("the 3D chunk stays under 250 KB gzip and initial JS under 150 KB", async ({
    page
  }) => {
    const scripts = trackScripts(page);
    await scripts.goto("/en");
    await expect(graph(page)).toHaveAttribute("data-gate", "live", {
      timeout: 15_000
    });
    const { rest: canvasChunks } = await splitAvatarChunks(scripts.lazy());
    const lazyBytes = await gzipBytes(canvasChunks);
    const initialBytes = await gzipBytes(scripts.initial());
    console.log(
      `3D chunk: ${(lazyBytes / 1024).toFixed(1)} KB gzip; initial: ${(initialBytes / 1024).toFixed(1)} KB gzip`
    );
    expect(canvasChunks.length).toBeGreaterThan(0);
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
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3
  });

  test("loads no 3D code until the first interaction, then mounts Low", async ({
    page
  }) => {
    const problems = collectConsoleProblems(page);
    const scripts = trackScripts(page);
    await scripts.goto("/en");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    expect(scripts.lazy()).toEqual([]);
    await expect(graph(page)).toHaveAttribute("data-gate", "pending");

    await page.evaluate(() => window.scrollBy(0, 40));
    await expect(graph(page)).toHaveAttribute("data-gate", "live", {
      timeout: 15_000
    });
    await expect(graph(page)).toHaveAttribute("data-tier", "low");
    await page.waitForTimeout(500);
    expect(problems).toEqual([]);
  });

  test("on mobile without interaction, LCP is hero DOM text inside #top, never the canvas or graph", async ({
    page
  }) => {
    await page.goto("/en");
    const lcp = await page.evaluate(
      () =>
        new Promise<{
          tag: string;
          inTop: boolean;
          inSlot: boolean;
          inSvg: boolean;
        }>((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries() as Array<
              PerformanceEntry & { element?: Element | null }
            >;
            const el = entries.at(-1)?.element;
            resolve({
              tag: el?.tagName ?? "none",
              inTop: !!el?.closest("#top"),
              inSlot: !!el?.closest("#hero-canvas-slot"),
              inSvg: !!el?.closest("svg") || el?.tagName === "CANVAS"
            });
          }).observe({ type: "largest-contentful-paint", buffered: true });
        })
    );
    expect(lcp.inTop).toBe(true);
    expect(lcp.inSlot).toBe(false);
    expect(lcp.inSvg).toBe(false);
    expect(["H1", "P"]).toContain(lcp.tag);
  });
});

async function waitLive(page: Page) {
  await expect(graph(page)).toHaveAttribute("data-gate", "live", {
    timeout: 15_000
  });
}

test.describe("desktop scene", () => {
  test("draws in at most 9 draw calls with the avatar", async ({ page }) => {
    await page.goto("/en");
    await waitLive(page);
    await expect(page.locator("#hero-canvas-slot")).toHaveAttribute(
      "data-avatar-phase",
      "idle",
      { timeout: 20_000 }
    );
    await expect
      .poll(async () => Number(await graph(page).getAttribute("data-gl-calls")))
      .toBeGreaterThan(0);
    const calls = Number(await graph(page).getAttribute("data-gl-calls"));
    expect(calls).toBeLessThanOrEqual(9);
  });

  test("scrolling past the hero switches the caption to layered and back", async ({
    page
  }) => {
    await page.goto("/en");
    await waitLive(page);
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
    await expect(caption(page, "layered")).toBeVisible();
    await page.mouse.wheel(0, -heroHeight);
    await expect(caption(page, "chaos")).toBeVisible();
  });

  test("the theme toggle recolors without remounting the canvas", async ({
    page
  }) => {
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
  test("resizing the window keeps the canvas matched to the slot", async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en");
    await waitLive(page);
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect
      .poll(async () => {
        const slot = await page.locator("#hero-canvas-slot").boundingBox();
        const box = await canvas(page).boundingBox();
        return Math.abs((slot?.width ?? 0) - (box?.width ?? -100));
      })
      .toBeLessThan(2);
  });

  // Review Focus 4
  test("a reload part-way down the hero restores the matching caption", async ({
    page
  }) => {
    await page.goto("/en");
    const heroHeight = await page
      .locator("#top")
      .evaluate((el) => el.getBoundingClientRect().height);
    await page.evaluate(
      (y) => window.scrollTo(0, y),
      Math.round(heroHeight * 0.8)
    );
    await page.reload();
    await page.mouse.move(200, 200);
    await expect(page.locator("html")).toHaveAttribute(
      "data-motion-ready",
      "",
      { timeout: 10_000 }
    );
    await expect(caption(page, "layered")).toBeVisible();
  });
});

test.describe("desktop scene (follow-up)", () => {
  test("stays live well past the PerformanceMonitor sampling windows", async ({
    page
  }) => {
    await page.goto("/en");
    await waitLive(page);
    await page.waitForTimeout(12_000);
    await expect(graph(page)).toHaveAttribute("data-gate", "live");
    await expect(canvas(page)).toHaveCount(1);
  });

  test("the graph geometry follows the morph while the slot is still on screen", async ({
    page
  }) => {
    await page.goto("/en");
    await waitLive(page);
    await page.mouse.move(200, 200);
    await expect(page.locator("html")).toHaveAttribute(
      "data-motion-ready",
      "",
      { timeout: 10_000 }
    );
    await expect
      .poll(async () => Number(await graph(page).getAttribute("data-gl-calls")))
      .toBeGreaterThanOrEqual(3);
    const distance = await page.evaluate(() => {
      const r = document
        .querySelector("#hero-canvas-slot")!
        .getBoundingClientRect();
      const header = document
        .querySelector("header")!
        .getBoundingClientRect().bottom;
      return Math.max(100, (r.top + r.height / 2 - header - 170) / 0.9);
    });
    await page.mouse.wheel(0, Math.round(distance * 0.92));
    await expect
      .poll(
        async () => Number(await graph(page).getAttribute("data-gl-calls")),
        { timeout: 10_000 }
      )
      .toBe(2);
    const { centre, header } = await page.evaluate(() => {
      const r = document
        .querySelector("#hero-canvas-slot")!
        .getBoundingClientRect();
      return {
        centre: r.top + r.height / 2,
        header: document.querySelector("header")!.getBoundingClientRect().bottom
      };
    });
    expect(centre).toBeGreaterThanOrEqual(header + 80);
    expect(centre).toBeLessThan(page.viewportSize()!.height);
  });
});

test.describe("mobile scene", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1
  });

  test("the geometry morphs while the slot is still below the header", async ({
    page
  }) => {
    await page.goto("/en");
    await page.evaluate(() => window.scrollBy(0, 5));
    await waitLive(page);
    await expect(page.locator("html")).toHaveAttribute(
      "data-motion-ready",
      "",
      { timeout: 10_000 }
    );
    await page.evaluate(() => window.scrollTo(0, 90));
    await expect
      .poll(
        async () => Number(await graph(page).getAttribute("data-gl-calls")),
        { timeout: 10_000 }
      )
      .toBe(2);
    const { centre, header } = await page.evaluate(() => {
      const r = document
        .querySelector("#hero-canvas-slot")!
        .getBoundingClientRect();
      return {
        centre: r.top + r.height / 2,
        header: document.querySelector("header")!.getBoundingClientRect().bottom
      };
    });
    expect(centre).toBeGreaterThanOrEqual(header + 80);
  });
});

test.describe("robustness", () => {
  test("WebGL context loss ends in the static layered graph", async ({
    page
  }) => {
    const problems = collectConsoleProblems(page);
    await page.goto("/en");
    await waitLive(page);
    await page.evaluate(() => {
      const el = document.querySelector<HTMLCanvasElement>(
        "#hero-canvas-slot canvas"
      );
      const gl = el?.getContext("webgl2") ?? el?.getContext("webgl");
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    });
    await expect(graph(page)).toHaveAttribute("data-gate", "fallback");
    await expect(svg(page, "layered")).toBeVisible();
    await expect(canvas(page)).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test("on desktop with the canvas live, LCP is the hero h1", async ({
    page
  }) => {
    await page.goto("/en");
    await waitLive(page);
    const lcp = await page.evaluate(
      () =>
        new Promise<string>((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries() as Array<
              PerformanceEntry & { element?: Element | null }
            >;
            const element = entries.at(-1)?.element;
            resolve(
              element?.closest("h1") ? "h1" : (element?.tagName ?? "none")
            );
          }).observe({ type: "largest-contentful-paint", buffered: true });
        })
    );
    expect(lcp).toBe("h1");
  });

  test("10 round trips to a case study keep one canvas, one live GL context, stable GPU counts and no extra triggers", async ({
    page
  }) => {
    test.setTimeout(180_000);
    // A live WebGL context is one that exists and has not been lost. The gate's
    // support probe loses its context immediately, and R3F force-loses the
    // renderer's context on unmount, so a leaked renderer (even on a detached
    // canvas) stays "live" and shows up here. gl.info only covers the current
    // renderer, so it cannot see leaks across mounts; this can.
    await page.addInitScript(() => {
      const contexts = new Set<
        WebGLRenderingContext | WebGL2RenderingContext
      >();
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        type: string,
        ...rest: unknown[]
      ) {
        const ctx = (original as (...args: unknown[]) => unknown).call(
          this,
          type,
          ...rest
        );
        if (
          ctx &&
          (type === "webgl" ||
            type === "webgl2" ||
            type === "experimental-webgl")
        ) {
          contexts.add(ctx as WebGLRenderingContext);
        }
        return ctx;
      } as typeof original;
      (window as unknown as { __liveGl: () => number }).__liveGl = () =>
        [...contexts].filter((c) => !c.isContextLost()).length;
    });
    const liveContexts = () =>
      page.evaluate(() =>
        (window as unknown as { __liveGl: () => number }).__liveGl()
      );
    const triggers = () =>
      page.evaluate(() =>
        Number(document.documentElement.dataset.motionTriggers)
      );
    const stats = async () => ({
      geometries: await graph(page).getAttribute("data-gl-geometries"),
      textures: await graph(page).getAttribute("data-gl-textures")
    });
    const settle = async (atTop: boolean) => {
      let last = -1;
      await expect
        .poll(
          async () => {
            const y = await page.evaluate(() => Math.round(window.scrollY));
            const settled = (atTop ? y === 0 : y > 0) && y === last;
            last = y;
            return settled;
          },
          { intervals: [250] }
        )
        .toBe(true);
    };
    const avatarIdle = () =>
      expect(page.locator("#hero-canvas-slot")).toHaveAttribute(
        "data-avatar-phase",
        "idle",
        { timeout: 20_000 }
      );
    const backToTopLive = async () => {
      // Let the #work hash scroll land before leaving it.
      await settle(false);
      await page.evaluate(() => window.scrollTo(0, 0));
      await settle(true);
      await waitLive(page);
      await avatarIdle();
      await expect.poll(async () => (await stats()).geometries).not.toBeNull();
    };

    await page.goto("/en");
    await waitLive(page);
    await avatarIdle();
    // Motion must be loaded so the trigger count means something.
    let step = 0;
    await expect(async () => {
      step += 1;
      await page.mouse.move(100 + step * 10, 200);
      await expect(page.locator("html")).toHaveAttribute(
        "data-motion-ready",
        "",
        { timeout: 500 }
      );
    }).toPass({ timeout: 10_000 });
    const baseline = await stats();
    expect(await liveContexts()).toBe(1);

    // Fresh-load count is the ceiling: after a return, the rescan runs while the
    // #work hash scroll may or may not have landed, so effects for already-visible
    // content are skipped (16) or not (24) depending on timing. A leak would add
    // a whole set per trip and blow through the ceiling within a few trips.
    await expect.poll(triggers).toBeGreaterThan(0);
    const triggerCeiling = await triggers();
    for (let trip = 0; trip < 10; trip += 1) {
      await page
        .locator('[data-chapter="swift-performance"]')
        .getByRole("link", { name: /Read case study/ })
        .click();
      await expect(page).toHaveURL(/\/en\/work\/swift-performance$/);
      await expect(page.locator("#hero-canvas-slot canvas")).toHaveCount(0);
      await expect.poll(liveContexts).toBe(0);
      await page.getByRole("link", { name: /←/ }).click();
      await expect(page).toHaveURL(/\/en#work$/);
      await expect(page.locator("html")).toHaveAttribute("data-motion-ready");
      await backToTopLive();
      await expect(canvas(page)).toHaveCount(1);
      await expect.poll(liveContexts).toBe(1);
      await expect.poll(stats).toEqual(baseline);
      await expect.poll(triggers).toBeGreaterThan(0);
      await expect.poll(triggers).toBeLessThanOrEqual(triggerCeiling);
    }
  });

  // Review Focus 2
  test("switching locale while live leaves exactly one live canvas", async ({
    page
  }) => {
    await page.goto("/en");
    await waitLive(page);
    await page.locator('a[hreflang="vi"]').first().click();
    await expect(page).toHaveURL(/\/vi/);
    await waitLive(page);
    await expect(page.locator("canvas")).toHaveCount(1);
  });

  // Review Focus 3
  test("leaving Home before the idle trigger cancels cleanly", async ({
    page
  }) => {
    const problems = collectConsoleProblems(page);
    // Idle never fires on its own, so the click is guaranteed to come before the
    // trigger; the gate's cleanup must then cancel the pending idle callback.
    await page.addInitScript(() => {
      const w = window as unknown as {
        __idleRequested: number[];
        __idleCancelled: number[];
      };
      w.__idleRequested = [];
      w.__idleCancelled = [];
      window.requestIdleCallback = () => {
        w.__idleRequested.push(1);
        return 987654;
      };
      window.cancelIdleCallback = (id: number) => {
        w.__idleCancelled.push(id);
      };
    });
    await page.goto("/en");
    const link = page
      .locator('[data-chapter="swift-performance"]')
      .getByRole("link", { name: /Read case study/ });
    // Hydration signal: React attaches its props key to a hydrated DOM node, so a
    // click now is a client-side navigation, not a full page load.
    await link.evaluate(
      (el) =>
        new Promise<void>((resolve) => {
          const check = () =>
            Object.keys(el).some((key) => key.startsWith("__reactProps$"))
              ? resolve()
              : requestAnimationFrame(check);
          check();
        })
    );
    await page.waitForFunction(
      () =>
        (window as unknown as { __idleRequested: number[] }).__idleRequested
          .length > 0
    );
    await expect(graph(page)).toHaveAttribute("data-gate", "pending");
    await page.evaluate(
      () => ((window as unknown as { __marker: number }).__marker = 1)
    );
    await link.click();
    await expect(page).toHaveURL(/\/en\/work\/swift-performance$/);
    expect(
      await page.evaluate(
        () => (window as unknown as { __marker?: number }).__marker
      )
    ).toBe(1);
    // The old page unmounts after the transition, so give cleanup time to run.
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as { __idleCancelled: number[] }).__idleCancelled
        )
      )
      .toContain(987654);
    await page.waitForTimeout(3000);
    await expect(page.locator("canvas")).toHaveCount(0);
    expect(problems).toEqual([]);
  });
});

test.describe("desktop hover", () => {
  // Review Focus 5
  test("hovering a node sets the node cursor; leaving the slot clears it", async ({
    page
  }) => {
    await page.goto("/en");
    await waitLive(page);
    const slot = page.locator("#hero-canvas-slot");
    const box = (await slot.boundingBox())!;
    let found = false;
    for (let row = 1; row < 12 && !found; row += 1) {
      for (let col = 1; col < 12 && !found; col += 1) {
        await page.mouse.move(
          box.x + (box.width * col) / 12,
          box.y + (box.height * row) / 12
        );
        await page.waitForTimeout(40);
        found = (await slot.getAttribute("data-cursor")) === "node";
      }
    }
    expect(found).toBe(true);
    await page.mouse.move(5, box.y + box.height + 40);
    await expect(slot).not.toHaveAttribute("data-cursor");
  });

  test("layered labels are below the header and do not overlap each other", async ({
    page
  }) => {
    await page.goto("/en");
    await waitLive(page);
    await page.mouse.move(200, 200);
    await expect(page.locator("html")).toHaveAttribute(
      "data-motion-ready",
      "",
      { timeout: 10_000 }
    );
    const heroHeight = await page
      .locator("#top")
      .evaluate((el) => el.getBoundingClientRect().height);
    const labels = page.locator("#hero-canvas-slot .hero-graph-label");
    // Step down until the layered labels appear, then a little further (about morph 0.9).
    let y = 0;
    while ((await labels.count()) < 4 && y < heroHeight) {
      y += 20;
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(250);
    }
    await expect(labels).toHaveCount(4);
    await page.evaluate((v) => window.scrollTo(0, v), y + 40);
    await page.waitForTimeout(1200);
    const headerBottom = await page
      .locator("header")
      .first()
      .evaluate((el) => el.getBoundingClientRect().bottom);
    const boxes = await labels.evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { l: r.left, r: r.right, t: r.top, b: r.bottom };
      })
    );
    for (const [i, box] of boxes.entries()) {
      expect(box.t, `label ${i} is below the header`).toBeGreaterThanOrEqual(
        headerBottom
      );
    }
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        const overlap = a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
        expect(overlap, `labels ${i} and ${j}`).toBe(false);
      }
    }
  });
});
