import type Lenis from "lenis";
import type {
  DesktopHandler,
  MotionCleanup,
  MotionContext,
  MotionEffectDef,
  MotionLibs
} from "./types";

export const DESKTOP_QUERY =
  "(min-width: 768px) and (hover: hover) and (pointer: fine)";
export const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

// gsap's matchMedia only invokes a branch's callback when at least one named
// condition matches (see gsap-core.js's matchMedia: `active` stays 0 and the
// callback is skipped unless some query in the set matches). "all" always
// matches, so the branch still runs on mobile without reduced motion, where
// neither isDesktop nor reduceMotion would otherwise match.
const queries = {
  all: "all",
  isDesktop: DESKTOP_QUERY,
  reduceMotion: REDUCE_QUERY
};

export type MotionRegistry = Readonly<Record<string, MotionEffectDef>>;

export interface MotionHandle {
  rescan(): void;
  dispose(): void;
}

interface Conditions {
  isDesktop?: boolean;
  reduceMotion?: boolean;
}

// Owns the app's only Lenis instance and ticker hook. The global matchMedia
// holds page-independent pieces (Lenis, cursor, magnetic, hash links); the
// page matchMedia holds [data-motion] effects and is rebuilt on navigation.
export function startMotion(
  libs: MotionLibs,
  registry: MotionRegistry,
  { desktopHandlers = [] }: { desktopHandlers?: readonly DesktopHandler[] } = {}
): MotionHandle {
  const { gsap, ScrollTrigger, SplitText, Lenis: LenisClass } = libs;
  gsap.registerPlugin(ScrollTrigger, SplitText);

  let lenis: Lenis | null = null;

  const globalMedia = gsap.matchMedia();
  globalMedia.add(queries, (context) => {
    const { isDesktop = false, reduceMotion = false } = (context.conditions ??
      {}) as Conditions;
    if (!isDesktop || reduceMotion) return;

    // stopInertiaOnNavigate makes Lenis reset its own inertia when a link to
    // a different pathname is clicked (lenis.mjs onClick), but that only
    // covers clicks; the browser Back/Forward buttons fire `popstate` with
    // no click, so momentum from an in-flight smooth scroll can keep writing
    // scroll position after Next has already restored/changed it. `reset()`
    // clears that without the `stop()`/`start()` side effects (toggling
    // isStopped, emitting a scroll event, flipping the lenis-stopped class).
    // It's typed `private` in lenis's .d.ts (it's normally only called
    // internally by stop()/start()) but is a real, stable public method at
    // runtime — see packages/core/src/lenis.ts's `reset()` in the published
    // package. Cast around the private modifier to call it directly.
    const instance = new LenisClass({
      autoRaf: false,
      stopInertiaOnNavigate: true
    });
    const raf = (time: number) => instance.raf(time * 1000);
    instance.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    lenis = instance;

    const onPopState = () => {
      (instance as unknown as { reset(): void }).reset();
    };
    window.addEventListener("popstate", onPopState);

    const stops = desktopHandlers.map((startHandler) =>
      startHandler({ gsap, lenis: instance })
    );

    return () => {
      window.removeEventListener("popstate", onPopState);
      for (const stop of stops) stop();
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33);
      instance.destroy();
      lenis = null;
    };
  });

  let pageMedia = gsap.matchMedia();
  const scan = () =>
    pageMedia.add(queries, (context) => {
      const { isDesktop = false, reduceMotion = false } = (context.conditions ??
        {}) as Conditions;
      const ctx: MotionContext = {
        gsap,
        ScrollTrigger,
        SplitText,
        isDesktop,
        reduceMotion,
        lenis
      };
      const cleanups: MotionCleanup[] = [];

      for (const el of document.querySelectorAll<HTMLElement>(
        "[data-motion]"
      )) {
        const name = el.dataset.motion ?? "";
        const effect = registry[name];
        if (!effect || (reduceMotion && !effect.reducedMotion)) continue;
        try {
          const cleanup = effect.run(el, ctx);
          if (cleanup) cleanups.push(cleanup);
        } catch (error) {
          if (process.env.NODE_ENV !== "production") {
            console.warn(`[motion] effect "${name}" failed`, error);
          }
        }
      }

      return () => {
        for (const cleanup of cleanups) cleanup();
      };
    });

  // Exposed only so the leak e2e can count live triggers.
  const publishTriggerCount = () => {
    document.documentElement.dataset.motionTriggers = String(
      ScrollTrigger.getAll().length
    );
  };

  scan();
  publishTriggerCount();
  document.documentElement.setAttribute("data-motion-ready", "");

  let disposed = false;

  return {
    rescan() {
      if (disposed) return;
      pageMedia.revert();
      pageMedia = gsap.matchMedia();
      lenis?.scrollTo(window.scrollY, { immediate: true, force: true });
      scan();
      ScrollTrigger.refresh();
      publishTriggerCount();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      pageMedia.revert();
      globalMedia.revert();
      document.documentElement.removeAttribute("data-motion-ready");
      document.documentElement.removeAttribute("data-motion-triggers");
    }
  };
}
