import type { MotionEffectDef } from "../types";
import { isAtOrAboveViewport } from "../viewport";

export const stagger: MotionEffectDef = {
  run(el, { gsap }) {
    if (isAtOrAboveViewport(el)) return;
    gsap.from(el.children, {
      // yPercent (not y): magnetic.ts drives `y` on these same chips, and
      // GSAP composes yPercent + y into one transform, so the two effects
      // no longer share a property and hovering mid-reveal can't clash.
      yPercent: 50,
      opacity: 0,
      duration: 0.5,
      ease: "power2.out",
      stagger: 0.04,
      scrollTrigger: { trigger: el, start: "top 90%", once: true }
    });
  }
};
