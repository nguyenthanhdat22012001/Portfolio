import { useScrollStore } from "@/shared/lib/stores/scroll-store";
import type { MotionEffectDef } from "../types";

// Writes hero scroll progress (heroMorph) for the hero canvas — read in
// useFrame, never through React state — and switches the graph caption
// line at 0.5. The h1 and tagline are never animated: they are LCP.
export const hero: MotionEffectDef = {
  reducedMotion: true,
  run(el, { gsap, ScrollTrigger, reduceMotion }) {
    const { setHeroMorph } = useScrollStore.getState();
    const graph = el.querySelector<HTMLElement>("[data-hero-graph]");
    const setCaption = (state: "chaos" | "layered") => {
      if (graph && graph.dataset.morph !== state) graph.dataset.morph = state;
    };

    ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom top",
      onUpdate: (self) => {
        setHeroMorph(self.progress);
        if (!reduceMotion && graph?.dataset.gate !== "fallback") {
          setCaption(self.progress >= 0.5 ? "layered" : "chaos");
        }
      }
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

    return () => {
      setHeroMorph(0);
      setCaption("chaos");
    };
  }
};
