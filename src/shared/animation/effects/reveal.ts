import type { MotionEffectDef } from "../types";
import { isAtOrAboveViewport } from "../viewport";

// aria: "auto" keeps the original sentence as an aria-label so screen
// readers never hear the text line by line.
export const reveal: MotionEffectDef = {
  run(el, { gsap, SplitText }) {
    if (isAtOrAboveViewport(el)) return;
    const split = SplitText.create(el, {
      type: "lines",
      mask: "lines",
      aria: "auto",
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 100,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: "top 85%", once: true }
        })
    });
    return () => split.revert();
  }
};
