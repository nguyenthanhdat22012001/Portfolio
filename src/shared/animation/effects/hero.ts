import { useScrollStore } from "@/shared/lib/stores/scroll-store";
import type { MotionEffectDef } from "../types";

const MIN_MORPH_DISTANCE = 100;
const CENTRE_CLEARANCE = 170;

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

    // Deliberate deviation from spec 8.1 (`end: "bottom top"`): the hero is not
    // pinned, so over its full height the graph would scroll off screen (or
    // under the sticky header) before the morph finished and nobody would see
    // the layered state. The range instead ends once the slot's centre has
    // climbed to ~170px below the header at 90% progress, with a floor so
    // short mobile layouts do not complete instantly. Measured from scroll 0 and re-evaluated on refresh.
    const morphDistance = () => {
      const slot = el.querySelector<HTMLElement>("#hero-canvas-slot") ?? graph ?? el;
      const rect = slot.getBoundingClientRect();
      const centre = rect.top + window.scrollY + rect.height / 2;
      const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 80;
      return Math.max(MIN_MORPH_DISTANCE, (centre - headerBottom - CENTRE_CLEARANCE) / 0.9);
    };

    ScrollTrigger.create({
      trigger: el,
      // Scroll 0, not "top top": the hero starts below the sticky header, so
      // "top top" would leave the first ~80px of scrolling with no morph.
      start: 0,
      end: () => `+=${Math.round(morphDistance())}`,
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
