import { useScrollStore } from "@/shared/lib/stores/scroll-store";
import type { MotionEffectDef } from "../types";

// Writes hero scroll progress for Phase 5's canvas (read in useFrame, never
// through React state). The h1 and tagline are never animated: they are LCP.
export const hero: MotionEffectDef = {
  reducedMotion: true,
  run(el, { gsap, ScrollTrigger, reduceMotion }) {
    const { setProgress } = useScrollStore.getState();
    ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom top",
      onUpdate: (self) => setProgress(self.progress)
    });

    const hint = el.querySelector<HTMLElement>("[data-scroll-hint]");
    if (hint && !reduceMotion) {
      gsap.to(hint, {
        y: 6,
        duration: 1.2,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true
      });
    }

    return () => setProgress(0);
  }
};
