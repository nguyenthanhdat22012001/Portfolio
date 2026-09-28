import { vi, type Mock } from "vitest";
import type { MotionContext, MotionLibs } from "../types";

export interface FakeConditions {
  isDesktop: boolean;
  reduceMotion: boolean;
}

type MatchMediaCallback = (context: {
  conditions: FakeConditions;
}) => void | (() => void);

const tween = () => ({ kill: vi.fn() });

// Minimal stand-ins for gsap, ScrollTrigger, SplitText, and Lenis. Every
// method is a vi.fn so tests can assert on calls; matchMedia runs its
// callback immediately with the given conditions and revert() runs cleanups.
export function createFakeLibs(
  conditions: FakeConditions = { isDesktop: true, reduceMotion: false }
) {
  const timeline = {} as Record<
    "fromTo" | "from" | "to" | "timeScale" | "duration",
    Mock
  >;
  for (const method of ["fromTo", "from", "to", "timeScale"] as const) {
    timeline[method] = vi.fn((..._args: unknown[]) => timeline);
  }
  timeline.duration = vi.fn(() => 2.4);

  const gsap = {
    registerPlugin: vi.fn(),
    matchMedia: vi.fn(() => {
      const cleanups: Array<() => void> = [];
      return {
        add: vi.fn((_queries: unknown, callback: MatchMediaCallback) => {
          const cleanup = callback({ conditions });
          if (typeof cleanup === "function") cleanups.push(cleanup);
        }),
        revert: vi.fn(() => {
          for (const cleanup of cleanups.splice(0).reverse()) cleanup();
        })
      };
    }),
    ticker: { add: vi.fn(), remove: vi.fn(), lagSmoothing: vi.fn() },
    quickTo: vi.fn((..._args: unknown[]) => vi.fn()),
    getProperty: vi.fn((..._args: unknown[]) => 0),
    set: vi.fn((..._args: unknown[]) => tween()),
    to: vi.fn((..._args: unknown[]) => tween()),
    from: vi.fn((..._args: unknown[]) => tween()),
    fromTo: vi.fn((..._args: unknown[]) => tween()),
    timeline: vi.fn((..._args: unknown[]) => timeline),
    killTweensOf: vi.fn(),
    utils: { random: vi.fn((min: number) => min) }
  };
  const ScrollTrigger = {
    update: vi.fn(),
    refresh: vi.fn(),
    create: vi.fn((..._args: unknown[]) => ({ kill: vi.fn() }))
  };
  const SplitText = {
    create: vi.fn((..._args: unknown[]) => ({
      lines: [] as Element[],
      chars: [] as Element[],
      revert: vi.fn()
    }))
  };
  const lenisInstances: FakeLenis[] = [];
  class FakeLenis {
    on = vi.fn();
    raf = vi.fn();
    destroy = vi.fn();
    scrollTo = vi.fn();
    constructor(public options?: unknown) {
      lenisInstances.push(this);
    }
  }

  const libs = {
    gsap,
    ScrollTrigger,
    SplitText,
    Lenis: FakeLenis
  } as unknown as MotionLibs;

  return { libs, gsap, ScrollTrigger, SplitText, timeline, lenisInstances };
}

export function createFakeContext(conditions: Partial<FakeConditions> = {}) {
  const resolved = { isDesktop: true, reduceMotion: false, ...conditions };
  const fake = createFakeLibs(resolved);
  const ctx: MotionContext = {
    gsap: fake.libs.gsap,
    ScrollTrigger: fake.libs.ScrollTrigger,
    SplitText: fake.libs.SplitText,
    ...resolved,
    lenis: null
  };
  return { ...fake, ctx };
}

/** jsdom lays everything out at top 0 (on screen); this moves an element below the fold. */
export function placeBelowFold(el: Element) {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    top: 5000,
    bottom: 5100,
    left: 0,
    right: 100,
    width: 100,
    height: 100,
    x: 0,
    y: 5000,
    toJSON: () => ({})
  } as DOMRect);
}
