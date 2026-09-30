import { afterEach, describe, expect, it, vi } from "vitest";
import { startMotion, type MotionHandle } from "./engine";
import { createFakeLibs, type FakeConditions } from "./testing/fake-libs";
import type { MotionEffectDef } from "./types";

const desktop: FakeConditions = { isDesktop: true, reduceMotion: false };
const mobile: FakeConditions = { isDesktop: false, reduceMotion: false };
const reduced: FakeConditions = { isDesktop: true, reduceMotion: true };

let handle: MotionHandle | undefined;

function start(
  conditions: FakeConditions,
  registry: Record<string, MotionEffectDef>,
  options?: Parameters<typeof startMotion>[2]
) {
  const fake = createFakeLibs(conditions);
  handle = startMotion(fake.libs, registry, options);
  return { ...fake, handle };
}

afterEach(() => {
  handle?.dispose();
  handle = undefined;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("startMotion", () => {
  it("publishes the live ScrollTrigger count and clears it on dispose", () => {
    const fake = createFakeLibs(desktop);
    fake.ScrollTrigger.getAll.mockReturnValue([{}, {}, {}]);
    handle = startMotion(fake.libs, {});
    expect(document.documentElement.dataset.motionTriggers).toBe("3");

    fake.ScrollTrigger.getAll.mockReturnValue([{}]);
    handle.rescan();
    expect(document.documentElement.dataset.motionTriggers).toBe("1");

    handle.dispose();
    expect(document.documentElement.dataset.motionTriggers).toBeUndefined();
  });

  it("runs the registered effect for each [data-motion] element", () => {
    document.body.innerHTML =
      '<p data-motion="fade" id="a"></p><p data-motion="fade" id="b"></p>';
    const run = vi.fn();
    start(desktop, { fade: { run } });

    expect(run).toHaveBeenCalledTimes(2);
    expect(run.mock.calls.map(([el]) => (el as HTMLElement).id)).toEqual([
      "a",
      "b"
    ]);
    expect(run.mock.calls[0]?.[1]).toMatchObject({
      isDesktop: true,
      reduceMotion: false
    });
  });

  it("skips elements whose effect is not registered", () => {
    document.body.innerHTML = '<p data-motion="unknown"></p>';
    expect(() => start(desktop, {})).not.toThrow();
  });

  it("keeps running other effects when one throws", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    document.body.innerHTML =
      '<p data-motion="broken"></p><p data-motion="fine"></p>';
    const fine = vi.fn();
    start(desktop, {
      broken: {
        run: () => {
          throw new Error("boom");
        }
      },
      fine: { run: fine }
    });

    expect(fine).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("broken"),
      expect.anything()
    );
  });

  it("creates one Lenis on desktop and drives it from the GSAP ticker", () => {
    const { lenisInstances, gsap, ScrollTrigger } = start(desktop, {});

    expect(lenisInstances).toHaveLength(1);
    const [lenis] = lenisInstances;
    expect(lenis?.options).toMatchObject({
      autoRaf: false,
      stopInertiaOnNavigate: true
    });
    expect(lenis?.on).toHaveBeenCalledWith("scroll", ScrollTrigger.update);
    expect(gsap.ticker.add).toHaveBeenCalledOnce();
    expect(gsap.ticker.lagSmoothing).toHaveBeenCalledWith(0);

    const raf = gsap.ticker.add.mock.calls[0]?.[0] as (t: number) => void;
    raf(2);
    expect(lenis?.raf).toHaveBeenCalledWith(2000);
  });

  it("resets Lenis momentum on popstate while running, but not after dispose", () => {
    const { lenisInstances, handle } = start(desktop, {});
    const [lenis] = lenisInstances;

    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(lenis?.reset).toHaveBeenCalledOnce();

    handle.dispose();
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(lenis?.reset).toHaveBeenCalledOnce();
  });

  it("passes the Lenis instance to page effects", () => {
    document.body.innerHTML = '<p data-motion="fade"></p>';
    const run = vi.fn();
    const { lenisInstances } = start(desktop, { fade: { run } });
    expect(run.mock.calls[0]?.[1].lenis).toBe(lenisInstances[0]);
  });

  it("does not create Lenis on mobile", () => {
    const { lenisInstances } = start(mobile, {});
    expect(lenisInstances).toHaveLength(0);
  });

  it("does not create Lenis under reduced motion", () => {
    const { lenisInstances } = start(reduced, {});
    expect(lenisInstances).toHaveLength(0);
  });

  it("runs page effects on mobile", () => {
    document.body.innerHTML = '<p data-motion="fade"></p>';
    const run = vi.fn();
    start(mobile, { fade: { run } });

    expect(run).toHaveBeenCalledOnce();
    expect(run.mock.calls[0]?.[1]).toMatchObject({ isDesktop: false });
  });

  it("runs only reducedMotion effects under reduced motion", () => {
    document.body.innerHTML =
      '<p data-motion="fancy"></p><p data-motion="safe"></p>';
    const fancy = vi.fn();
    const safe = vi.fn();
    start(reduced, {
      fancy: { run: fancy },
      safe: { run: safe, reducedMotion: true }
    });

    expect(fancy).not.toHaveBeenCalled();
    expect(safe).toHaveBeenCalledOnce();
  });

  it("starts desktop handlers with Lenis and stops them on dispose", () => {
    const stop = vi.fn();
    const handler = vi.fn(() => stop);
    const { lenisInstances, gsap, handle } = start(
      desktop,
      {},
      { desktopHandlers: [handler] }
    );

    expect(handler).toHaveBeenCalledWith({ gsap, lenis: lenisInstances[0] });
    handle.dispose();
    expect(stop).toHaveBeenCalledOnce();
    expect(lenisInstances[0]?.destroy).toHaveBeenCalledOnce();
  });

  it("dispose is idempotent", () => {
    const stop = vi.fn();
    const handler = vi.fn(() => stop);
    const { lenisInstances, handle } = start(
      desktop,
      {},
      { desktopHandlers: [handler] }
    );

    handle.dispose();
    handle.dispose();

    expect(stop).toHaveBeenCalledOnce();
    expect(lenisInstances[0]?.destroy).toHaveBeenCalledOnce();
  });

  it("does not start desktop handlers on mobile", () => {
    const handler = vi.fn(() => () => {});
    start(mobile, {}, { desktopHandlers: [handler] });
    expect(handler).not.toHaveBeenCalled();
  });

  it("rescan cleans up and re-runs page effects without a new Lenis", () => {
    document.body.innerHTML = '<p data-motion="fade"></p>';
    const cleanup = vi.fn();
    const run = vi.fn(() => cleanup);
    const { lenisInstances, ScrollTrigger, handle } = start(desktop, {
      fade: { run }
    });

    document.body.innerHTML =
      '<p data-motion="fade"></p><p data-motion="fade"></p>';
    handle.rescan();

    expect(cleanup).toHaveBeenCalledOnce();
    expect(run).toHaveBeenCalledTimes(3);
    expect(lenisInstances).toHaveLength(1);
    expect(lenisInstances[0]?.scrollTo).toHaveBeenCalledWith(window.scrollY, {
      immediate: true,
      force: true
    });
    expect(ScrollTrigger.refresh).toHaveBeenCalledOnce();
  });

  it("marks <html data-motion-ready> until disposed", () => {
    const { handle } = start(desktop, {});
    expect(document.documentElement.hasAttribute("data-motion-ready")).toBe(
      true
    );
    handle.dispose();
    expect(document.documentElement.hasAttribute("data-motion-ready")).toBe(
      false
    );
  });

  it("runs effect cleanups on dispose", () => {
    document.body.innerHTML = '<p data-motion="fade"></p>';
    const cleanup = vi.fn();
    const { handle } = start(desktop, { fade: { run: () => cleanup } });
    handle.dispose();
    expect(cleanup).toHaveBeenCalledOnce();
  });
});
