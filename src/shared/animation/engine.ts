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

const queries = { isDesktop: DESKTOP_QUERY, reduceMotion: REDUCE_QUERY };

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

    const instance = new LenisClass({ autoRaf: false });
    const raf = (time: number) => instance.raf(time * 1000);
    instance.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    lenis = instance;

    const stops = desktopHandlers.map((startHandler) =>
      startHandler({ gsap, lenis: instance })
    );

    return () => {
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

  scan();
  document.documentElement.setAttribute("data-motion-ready", "");

  return {
    rescan() {
      pageMedia.revert();
      pageMedia = gsap.matchMedia();
      lenis?.scrollTo(window.scrollY, { immediate: true, force: true });
      scan();
      ScrollTrigger.refresh();
    },
    dispose() {
      pageMedia.revert();
      globalMedia.revert();
      document.documentElement.removeAttribute("data-motion-ready");
    }
  };
}
