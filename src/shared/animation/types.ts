import type { gsap } from "gsap";
import type { ScrollTrigger } from "gsap/ScrollTrigger";
import type { SplitText } from "gsap/SplitText";
import type Lenis from "lenis";

// Type-only imports: the libraries themselves load lazily in
// app/[locale]/_motion/motion-entry.ts and are passed in at runtime.
export interface MotionLibs {
  gsap: typeof gsap;
  ScrollTrigger: typeof ScrollTrigger;
  SplitText: typeof SplitText;
  Lenis: typeof Lenis;
}

export interface MotionContext extends Omit<MotionLibs, "Lenis"> {
  isDesktop: boolean;
  reduceMotion: boolean;
  lenis: Lenis | null;
}

export type MotionCleanup = () => void;

export type MotionEffect = (
  el: HTMLElement,
  ctx: MotionContext
) => void | MotionCleanup;

export interface MotionEffectDef {
  run: MotionEffect;
  /** Also runs under prefers-reduced-motion (default: false). */
  reducedMotion?: boolean;
}

/** Page-independent behaviour started once on desktop without reduced motion. */
export type DesktopHandler = (env: {
  gsap: MotionLibs["gsap"];
  lenis: Lenis;
}) => MotionCleanup;
