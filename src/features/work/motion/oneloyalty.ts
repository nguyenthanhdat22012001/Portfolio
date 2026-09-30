import type { MotionCleanup, MotionEffectDef } from "@/shared/animation/types";
import { isAtOrAboveViewport } from "@/shared/animation/viewport";
import { runClsDemo } from "./cls-demo";

// Scattered components merge into one shared packages/ui grid, and the CLS
// demo shows a layout shift fixed by reserving space.
export const oneloyalty: MotionEffectDef = {
  run(el, ctx) {
    const { gsap } = ctx;
    const cleanups: MotionCleanup[] = [];

    const grid = el.querySelector<HTMLElement>("[data-oneloyalty-grid]");
    if (grid && !isAtOrAboveViewport(grid)) {
      const blocks = [...grid.children];
      gsap.set(blocks, {
        x: () => gsap.utils.random(-40, 40),
        y: () => gsap.utils.random(-30, 30),
        rotation: () => gsap.utils.random(-30, 30),
        scale: 0.6
      });
      gsap.to(blocks, {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        duration: 0.9,
        ease: "power3.inOut",
        stagger: { each: 0.02, from: "random" },
        scrollTrigger: { trigger: grid, start: "top 80%", once: true }
      });
    }

    const demo = el.querySelector<HTMLElement>("[data-cls-demo]");
    const demoCleanup = demo ? runClsDemo(demo, ctx) : undefined;
    if (demoCleanup) cleanups.push(demoCleanup);

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }
};
