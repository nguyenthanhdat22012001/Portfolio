import { expect, test, type Page } from "@playwright/test";
import { trackLiveGl } from "./helpers/gl";
import {
  collectConsoleProblems,
  gzipBytes,
  trackScripts
} from "./helpers/scripts";

// Same cap as the Phase 5B avatar chunk (design D3); measured 25.5 KB after Phase 5C.
const AVATAR_BUDGET_BYTES = 26 * 1024;

const slot = (page: Page) => page.locator("#about-avatar-slot");
const pose = (page: Page, name: "wave" | "idle") =>
  page.locator(`#about-avatar-slot [data-avatar-pose="${name}"]`);
const stats = (page: Page) => page.locator("#about dl dd");
const isGlb = (url: string) => url.endsWith("/models/avatar.glb");

function trackGlb(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (request) => {
    if (isGlb(request.url())) urls.push(request.url());
  });
  return urls;
}

// Records every data-avatar-phase value on the About slot, in order.
async function recordPhases(page: Page) {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __phases: string[] }).__phases = seen;
    new MutationObserver(() => {
      const phase =
        document.getElementById("about-avatar-slot")?.dataset.avatarPhase;
      if (phase && seen.at(-1) !== phase) seen.push(phase);
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-avatar-phase"]
    });
  });
  return () =>
    page.evaluate(() => (window as unknown as { __phases: string[] }).__phases);
}

const heroLive = (page: Page) =>
  expect(page.locator("[data-hero-graph]")).toHaveAttribute(
    "data-gate",
    "live",
    { timeout: 15_000 }
  );

/** Scrolls so the slot's top sits at `fraction` of the viewport height. */
async function scrollSlotTo(page: Page, fraction: number) {
  await page.evaluate((f) => {
    const el = document.getElementById("about-avatar-slot")!;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, Math.max(0, top - window.innerHeight * f));
  }, fraction);
}

const scrollToTop = (page: Page) => page.evaluate(() => window.scrollTo(0, 0));
const scrollToBottom = (page: Page) =>
  page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight)
  );

// Steps the shared quality tier (src/shared/three/quality-store.ts) down to
// Low, as the Hero's perf policy would. There's no test hook in the product:
// this finds the store through webpack's runtime (the only module factory
// with a `downgrade` that exports a store whose state has `level`).
const dropTierToLow = (page: Page) =>
  page.evaluate(() => {
    type Store = {
      getState(): { level: string | null; downgrade(): void };
    };
    type Require = ((id: string) => Record<string, unknown>) & {
      m: Record<string, unknown>;
    };
    let require!: Require;
    (
      window as unknown as { webpackChunk_N_E: unknown[][] }
    ).webpackChunk_N_E.push([
      [Symbol("e2e")],
      {},
      (r: Require) => {
        require = r;
      }
    ]);
    const stores = Object.keys(require.m)
      .filter((id) => String(require.m[id]).includes("downgrade"))
      .flatMap((id) => Object.values(require(id)))
      .filter((value): value is Store => {
        const state = (value as Partial<Store> | null)?.getState?.();
        return (
          !!state && "level" in state && typeof state.downgrade === "function"
        );
      });
    if (stores.length !== 1)
      throw new Error(`found ${stores.length} tier stores`);
    const store = stores[0]!;
    while (store.getState().level !== "low") store.getState().downgrade();
  });

test.describe("About avatar on desktop", () => {
  test("initial load: no avatar code, no avatar.glb, nothing in the Hero", async ({
    page
  }) => {
    const glb = trackGlb(page);
    const scripts = trackScripts(page);
    await scripts.goto("/en");
    await heroLive(page);
    const lazyAtLive = scripts.lazy().length;
    await page.waitForTimeout(2000);
    expect(glb).toEqual([]);
    expect(scripts.lazy()).toHaveLength(lazyAtLive);
    await expect(
      page.locator("#top [data-avatar-phase], #top [data-avatar-pose]")
    ).toHaveCount(0);
    await expect(slot(page).locator("canvas")).toHaveCount(0);
    await expect(slot(page)).toHaveAttribute("data-gate", "pending");
  });

  test("near About: avatar.glb once; then enter → walk → wave → idle within 6 s, bubble in wave", async ({
    page
  }) => {
    const problems = collectConsoleProblems(page);
    const glb = trackGlb(page);
    const phases = await recordPhases(page);
    await page.goto("/en");
    await heroLive(page);
    const loaded = page.waitForResponse((r) => isGlb(r.url()), {
      timeout: 20_000
    });
    await scrollSlotTo(page, 1.2); // ~20 % of a viewport below the fold: inside 400px
    await (await loaded).finished();
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "wave", {
      timeout: 6_000
    });
    await expect(
      page.locator(".about-avatar-bubble[data-visible]")
    ).toBeVisible();
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 6_000
    });
    expect(await phases()).toEqual(["enter", "walk", "wave", "idle"]);
    await expect(pose(page, "idle")).toBeHidden(); // the 3D avatar stands there
    expect(glb).toHaveLength(1);
    expect(problems).toEqual([]);
  });

  test("leaving during the walk pauses; coming back resumes; never replays", async ({
    page
  }) => {
    const phases = await recordPhases(page);
    await page.goto("/en");
    await heroLive(page);
    await scrollSlotTo(page, 1.2);
    await page.waitForResponse((r) => isGlb(r.url()), { timeout: 20_000 });
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "walk", {
      timeout: 10_000
    });
    await scrollToTop(page);
    await page.waitForTimeout(3000);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "walk"); // paused
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 6_000
    });
    await scrollToTop(page);
    await scrollSlotTo(page, 0.3);
    await page.waitForTimeout(1000);
    expect(await phases()).toEqual(["enter", "walk", "wave", "idle"]);
  });

  test("scrolling past About before the model loads lands in idle on return", async ({
    page
  }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/models/avatar.glb", async (route) => {
      await held;
      await route.continue();
    });
    const phases = await recordPhases(page);
    await page.goto("/en");
    await heroLive(page);
    await scrollSlotTo(page, 1.2);
    await scrollSlotTo(page, 0.3); // crosses the 70 % line
    await page.waitForTimeout(300);
    await scrollToBottom(page);
    release();
    await page.waitForResponse((r) => isGlb(r.url()), { timeout: 20_000 });
    await page.waitForTimeout(1000);
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 6_000
    });
    expect(await phases()).toEqual(["idle"]);
  });

  test("counters wait for the wave, then count to their final values", async ({
    page
  }) => {
    await page.goto("/en");
    await heroLive(page);
    await page.mouse.move(200, 200);
    await expect(page.locator("html")).toHaveAttribute(
      "data-motion-ready",
      "",
      { timeout: 10_000 }
    );
    await scrollSlotTo(page, 1.2);
    await page.waitForResponse((r) => isGlb(r.url()), { timeout: 20_000 });
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "walk", {
      timeout: 10_000
    });
    await expect(stats(page).first()).toHaveText("0");
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 6_000
    });
    await expect(stats(page)).toHaveText(["4", "3", "1.5"], { timeout: 5_000 });
  });

  // Review Focus 5
  test("a failed avatar.glb shows the idle image, frees the counters, leaves the Hero live", async ({
    page
  }) => {
    await page.route("**/models/avatar.glb", (route) =>
      route.fulfill({ status: 404 })
    );
    await page.goto("/en");
    await heroLive(page);
    await page.mouse.move(200, 200);
    await scrollSlotTo(page, 1.2);
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-gate", "fallback", {
      timeout: 15_000
    });
    await expect(pose(page, "idle")).toBeVisible();
    await expect(pose(page, "wave")).toBeHidden();
    await expect(slot(page).locator("canvas")).toHaveCount(0, {
      timeout: 2_000
    });
    await expect(page.locator("#about")).not.toHaveAttribute(
      "data-count-hold",
      ""
    );
    await expect(stats(page)).toHaveText(["4", "3", "1.5"], {
      timeout: 10_000
    });
    await expect(page.locator("[data-hero-graph]")).toHaveAttribute(
      "data-gate",
      "live"
    );
  });

  test("a same-session reload only waves", async ({ page }) => {
    const phases = await recordPhases(page);
    await page.goto("/en");
    await heroLive(page);
    await scrollSlotTo(page, 1.2);
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    await scrollToTop(page);
    await page.reload();
    await heroLive(page);
    await scrollSlotTo(page, 1.2);
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    expect(await phases()).toEqual(["wave", "idle"]);
  });

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
    await heroLive(page);
    await scrollSlotTo(page, 1.2);
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    expect((await phases())[0]).toBe("enter");
  });

  test("hover sets the avatar cursor; a click in idle waves again", async ({
    page
  }) => {
    const phases = await recordPhases(page);
    await page.goto("/en");
    await heroLive(page);
    await scrollSlotTo(page, 1.2);
    await scrollSlotTo(page, 0.15);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    const box = (await slot(page).boundingBox())!;
    const target = { x: box.x + box.width / 2, y: box.y + box.height * 0.5 };
    await page.mouse.move(target.x, target.y, { steps: 4 });
    await expect(slot(page)).toHaveAttribute("data-avatar-hover", "");
    const before = (await phases()).length;
    await page.mouse.click(target.x, target.y);
    // Still idle until the click lands: wait for the wave first.
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "wave", {
      timeout: 5_000
    });
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 6_000
    });
    expect((await phases()).slice(before)).toEqual(["wave", "idle"]);
  });

  test("≤ 3 draw calls in About and ≤ 2 live WebGL contexts", async ({
    page
  }) => {
    const liveGl = await trackLiveGl(page);
    await page.goto("/en");
    await heroLive(page);
    await scrollSlotTo(page, 1.2);
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    await expect
      .poll(async () => Number(await slot(page).getAttribute("data-gl-calls")))
      .toBeGreaterThan(0);
    expect(
      Number(await slot(page).getAttribute("data-gl-calls"))
    ).toBeLessThanOrEqual(3);
    expect(await liveGl()).toBeLessThanOrEqual(2);
  });

  test("the about-avatar chunk stays under its cap", async ({ page }) => {
    const scripts = trackScripts(page);
    await scripts.goto("/en");
    await heroLive(page);
    // The scroll below would also be the first interaction that loads the
    // motion chunk; load it first so only the avatar's chunks are counted.
    await page.mouse.move(200, 200);
    await expect(page.locator("html")).toHaveAttribute(
      "data-motion-ready",
      "",
      { timeout: 10_000 }
    );
    await page.waitForTimeout(1000);
    const before = new Set(scripts.lazy().map((r) => r.url()));
    await scrollSlotTo(page, 1.2);
    await page.waitForResponse((r) => isGlb(r.url()), { timeout: 20_000 });
    const added = scripts.lazy().filter((r) => !before.has(r.url()));
    const bytes = await gzipBytes(added);
    console.log(
      `about-avatar: ${(bytes / 1024).toFixed(1)} KB gzip (${added.length} file(s))`
    );
    expect(added.length).toBeGreaterThan(0);
    expect(bytes).toBeLessThanOrEqual(AVATAR_BUDGET_BYTES);
  });

  // Review Focus 2. Returning into About while the model loads plays the
  // intro (skip applies only when the slot is off screen at model-ready), so
  // this checks the end state, not the phase list.
  test("landing on #contact requests no avatar.glb until the visitor scrolls back", async ({
    page
  }) => {
    const glb = trackGlb(page);
    await page.goto("/en#contact");
    await page.waitForTimeout(3000);
    expect(glb).toEqual([]);
    // Bring the Hero live first, as on every other path: two canvases
    // compiling at once under SwiftShader read as a slow device and drop the
    // shared tier to Low. A #hash landing's own scroll, and this scripted
    // one, don't arm the About mount even though the slot is within 400px.
    await scrollToTop(page);
    await heroLive(page);
    expect(glb).toEqual([]);
    await expect(slot(page).locator("canvas")).toHaveCount(0);
    // The visitor's own input does. Let Lenis's smooth wheel scroll land
    // first, or it would carry on past the scripted scroll below.
    await page.mouse.wheel(0, 100);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(100);
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
  });

  // Review Focus 2: the case study's back link lands on /en#work, inside the
  // mount margin. Its hash scroll is not the visitor's first scroll.
  test("returning to /en#work from a case study requests no avatar.glb until the visitor scrolls", async ({
    page
  }) => {
    await page.goto("/en");
    await heroLive(page);
    await page
      .locator('[data-chapter="swift-performance"]')
      .getByRole("link", { name: /Read case study/ })
      .click();
    await expect(page).toHaveURL(/\/en\/work\/swift-performance$/);
    const glb = trackGlb(page);
    await page.getByRole("link", { name: /←/ }).click();
    await expect(page).toHaveURL(/\/en#work$/);
    await page.waitForTimeout(3000);
    expect(glb).toEqual([]);
    await expect(slot(page)).toHaveAttribute("data-gate", "pending");
    await expect(slot(page).locator("canvas")).toHaveCount(0);
    const loaded = page.waitForResponse((r) => isGlb(r.url()), {
      timeout: 20_000
    });
    await page.mouse.move(640, 360);
    await page.mouse.wheel(0, -300);
    await loaded;
    await expect(slot(page)).toHaveAttribute("data-gate", "mount");
  });

  // Final review 1: a leaked About renderer would stay a live context.
  test("5 round trips to a case study re-mount About with exact live contexts and stable GPU counts", async ({
    page
  }) => {
    test.setTimeout(240_000);
    const liveGl = await trackLiveGl(page);
    const glStats = async () => ({
      geometries: await slot(page).getAttribute("data-gl-geometries"),
      textures: await slot(page).getAttribute("data-gl-textures")
    });
    const settled = async () => {
      let last = -1;
      await expect
        .poll(
          async () => {
            const y = await page.evaluate(() => Math.round(window.scrollY));
            const still = y === last;
            last = y;
            return still;
          },
          { intervals: [250] }
        )
        .toBe(true);
    };
    // The visitor's own wheel arms the mount (a #work return waits for real
    // input); let Lenis's smooth scroll land, then bring the slot in.
    const mountAbout = async () => {
      await page.mouse.move(640, 360);
      await page.mouse.wheel(0, 100);
      await settled();
      await scrollSlotTo(page, 0.3);
      await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
        timeout: 20_000
      });
      await expect
        .poll(async () => (await glStats()).geometries)
        .not.toBeNull();
    };

    await page.goto("/en");
    await heroLive(page);
    await mountAbout();
    await expect(slot(page).locator("canvas")).toHaveCount(1);
    await expect.poll(liveGl).toBe(2); // Hero + About
    const baseline = await glStats();

    for (let trip = 0; trip < 5; trip += 1) {
      await scrollToTop(page);
      await page
        .locator('[data-chapter="swift-performance"]')
        .getByRole("link", { name: /Read case study/ })
        .click();
      await expect(page).toHaveURL(/\/en\/work\/swift-performance$/);
      await expect(slot(page)).toHaveCount(0);
      await expect.poll(liveGl).toBe(0);
      await page.getByRole("link", { name: /←/ }).click();
      await expect(page).toHaveURL(/\/en#work$/);
      // Let the #work hash scroll land, then bring the Hero live first.
      await settled();
      await scrollToTop(page);
      await heroLive(page);
      await mountAbout();
      await expect(slot(page).locator("canvas")).toHaveCount(1);
      await expect.poll(liveGl).toBe(2);
      await expect.poll(glStats).toEqual(baseline);
    }
  });

  // Review Focus 3
  test("the theme toggle keeps the About canvas and its state", async ({
    page
  }) => {
    await page.goto("/en");
    await heroLive(page);
    await scrollSlotTo(page, 1.2);
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    const before = await slot(page).locator("canvas").elementHandle();
    await page.getByRole("button", { name: "Dark theme" }).click();
    await page.waitForTimeout(500);
    expect(await before?.evaluate((el) => el.isConnected)).toBe(true);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle");
  });

  // Review Focus 4
  test("switching locale while idle leaves one About canvas and no new walk", async ({
    page
  }) => {
    const phases = await recordPhases(page);
    await page.goto("/en");
    await heroLive(page);
    await scrollSlotTo(page, 1.2);
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    const before = (await phases()).length;
    await page.locator('a[hreflang="vi"]').first().click();
    await expect(page).toHaveURL(/\/vi/);
    await scrollSlotTo(page, 1.2);
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    await expect(slot(page).locator("canvas")).toHaveCount(1);
    expect((await phases()).slice(before)).not.toContain("walk");
  });

  // Review Focus 1, at runtime: the canvas is mounted but the intro hasn't
  // started (slot inside the mount margin, below the 70 % line).
  test("a drop to Low before the intro shows the idle image and unmounts the canvas", async ({
    page
  }) => {
    await page.goto("/en");
    await heroLive(page);
    await page.mouse.move(200, 200);
    await scrollSlotTo(page, 1.2);
    await expect(slot(page)).toHaveAttribute("data-avatar-stage", "3d", {
      timeout: 20_000
    });
    await expect(slot(page).locator("canvas")).toHaveCount(1);
    await dropTierToLow(page);
    await expect(slot(page)).toHaveAttribute("data-gate", "fallback");
    await expect(slot(page).locator("canvas")).toHaveCount(0, {
      timeout: 2_000
    });
    await expect(page.locator("#about")).not.toHaveAttribute(
      "data-count-hold",
      ""
    );
    await scrollSlotTo(page, 0.3);
    await expect(pose(page, "idle")).toBeVisible();
    await expect(pose(page, "wave")).toBeHidden();
    await expect(stats(page)).toHaveText(["4", "3", "1.5"], {
      timeout: 10_000
    });
  });

  test("no portrait is requested anywhere on the page", async ({ page }) => {
    const portraits: string[] = [];
    page.on("request", (request) => {
      if (/portrait/i.test(request.url())) portraits.push(request.url());
    });
    await page.goto("/en");
    await heroLive(page);
    await scrollToBottom(page);
    await page.waitForTimeout(1500);
    expect(portraits).toEqual([]);
  });
});

test.describe("About avatar on mobile (Low)", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });

  test("never downloads avatar.glb; waves in view, then idles", async ({
    page
  }) => {
    const glb = trackGlb(page);
    await page.goto("/en");
    await expect(slot(page)).toHaveAttribute("data-tier", "low");
    await scrollSlotTo(page, 0.3);
    await expect(pose(page, "wave")).toBeVisible();
    await expect(pose(page, "idle")).toBeVisible({ timeout: 4_000 });
    await expect(pose(page, "wave")).toBeHidden();
    await page.waitForTimeout(1000);
    expect(glb).toEqual([]);
    await expect(slot(page).locator("canvas")).toHaveCount(0);
  });
});

test.describe("About avatar on mobile, landing on #about", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });

  // Final review M1: the Low path's wave → idle swap would change a picture
  // already on screen. The slot stays on its static idle image.
  test("shows the idle image and never the wave image", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __waveSeen: boolean };
      w.__waveSeen = false;
      const check = () => {
        const wave = document.querySelector(
          '#about-avatar-slot [data-avatar-pose="wave"]'
        );
        if (wave && getComputedStyle(wave).visibility === "visible") {
          w.__waveSeen = true;
        }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
    const glb = trackGlb(page);
    await page.goto("/en#about");
    await expect(slot(page)).toHaveAttribute("data-gate", "fallback", {
      timeout: 10_000
    });
    await expect(slot(page)).not.toHaveAttribute("data-tier", "low");
    await expect(pose(page, "idle")).toBeInViewport();
    await expect(pose(page, "idle")).toBeVisible();
    await expect(pose(page, "wave")).toBeHidden();
    expect(
      await page.evaluate(
        () => (window as unknown as { __waveSeen: boolean }).__waveSeen
      )
    ).toBe(false);
    expect(glb).toEqual([]);
  });
});

test.describe("About avatar with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("static idle image, no canvas, no avatar.glb, counters final", async ({
    page
  }) => {
    const glb = trackGlb(page);
    await page.goto("/en");
    await expect(slot(page)).toHaveAttribute("data-gate", "fallback");
    await scrollSlotTo(page, 0.3);
    await expect(pose(page, "idle")).toBeVisible();
    await expect(pose(page, "wave")).toBeHidden();
    await expect(stats(page)).toHaveText(["4", "3", "1.5"]);
    await page.waitForTimeout(2000);
    await expect(slot(page).locator("canvas")).toHaveCount(0);
    expect(glb).toEqual([]);
  });
});

test.describe("About avatar without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("shows the idle image", async ({ page }) => {
    await page.goto("/en");
    await slot(page).scrollIntoViewIfNeeded();
    await expect(pose(page, "idle")).toBeVisible();
    await expect(pose(page, "wave")).toBeHidden();
  });
});
