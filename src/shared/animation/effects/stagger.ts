import type { MotionEffectDef } from "../types";
import { isAtOrAboveViewport } from "../viewport";

export const stagger: MotionEffectDef = {
  run(el, { gsap }) {
    if (isAtOrAboveViewport(el)) return;
    gsap.from(el.children, {
      y: 16,
      opacity: 0,
      duration: 0.5,
      ease: "power2.out",
      stagger: 0.04,
      scrollTrigger: { trigger: el, start: "top 90%", once: true }
    });
  }
};
