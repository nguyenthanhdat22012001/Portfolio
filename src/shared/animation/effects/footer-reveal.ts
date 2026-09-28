import type { MotionEffectDef } from "../types";
import { isAtOrAboveViewport } from "../viewport";

export const footerReveal: MotionEffectDef = {
  run(el, { gsap }) {
    if (isAtOrAboveViewport(el)) return;
    gsap.from(el, {
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 95%", once: true }
    });
  }
};
