import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { startMotion } from "@/shared/animation/engine";
import { desktopHandlers, motionRegistry } from "./registry";

// The only runtime import of GSAP and Lenis in the app. MotionRoot loads
// this module lazily, so none of it is part of the initial bundle.
export function start() {
  return startMotion(
    { gsap, ScrollTrigger, SplitText, Lenis },
    motionRegistry,
    { desktopHandlers }
  );
}
