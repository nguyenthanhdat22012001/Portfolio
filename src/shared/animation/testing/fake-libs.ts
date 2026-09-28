import { vi, type Mock } from "vitest";
import type { MotionContext, MotionLibs } from "../types";

export interface FakeConditions {
  isDesktop: boolean;
  reduceMotion: boolean;
}

// The real conditions object can carry extra always-true keys (e.g. "all")
// beyond isDesktop/reduceMotion, so this is wider than FakeConditions.
type MatchMediaCallback = (context: {
  conditions: Record<string, boolean>;
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
        // Mirrors gsap's real matchMedia gate: a branch only fires when at
        // least one of its named conditions matches. isDesktop/reduceMotion
        // resolve from the fake's configured booleans; any other key (e.g.
        // "all") always resolves true.
        add: vi.fn(
          (
            mediaQueries: Record<string, string>,
            callback: MatchMediaCallback
          ) => {
            const built: Record<string, boolean> = {};
            for (const key of Object.keys(mediaQueries)) {
              built[key] =
                key === "isDesktop" || key === "reduceMotion"
                  ? conditions[key as "isDesktop" | "reduceMotion"]
                  : true;
            }
            if (!Object.values(built).some(Boolean)) return;

            const cleanup = callback({ conditions: built });
            if (typeof cleanup === "function") cleanups.push(cleanup);
          }
        ),
        // Only runs the cleanups a branch callback returned — unlike a real
        // gsap context, it does not revert tweens/ScrollTriggers created
        // outside that callback's own scope (e.g. from a ScrollTrigger
        // `onUpdate`). An effect that creates tweens that way must kill/reset
        // them itself in its returned cleanup rather than relying on revert.
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
    reset = vi.fn();
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
