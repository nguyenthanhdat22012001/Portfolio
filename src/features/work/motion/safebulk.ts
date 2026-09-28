import type { MotionEffectDef } from "@/shared/animation/types";
import { isAtOrAboveViewport } from "@/shared/animation/viewport";
import { activeStep } from "./safebulk-step";

// Desktop: pin the chapter and let scroll progress pick the wizard step.
// The static markup shows the last step active; cleanup restores that.
export const safebulk: MotionEffectDef = {
  run(el, { gsap, ScrollTrigger, isDesktop }) {
    const cards = [...el.querySelectorAll<HTMLElement>("[data-safebulk-card]")];
    if (cards.length === 0 || isAtOrAboveViewport(el)) return;

    if (!isDesktop) {
      gsap.from(cards, {
        y: 24,
        opacity: 0,
        duration: 0.5,
        ease: "power2.out",
        stagger: 0.12,
        scrollTrigger: { trigger: el, start: "top 80%", once: true }
      });
      return;
    }

    const initial = cards.findIndex((card) => card.hasAttribute("data-active"));
    let current = -1;
    const show = (index: number) => {
      if (index === current) return;
      current = index;
      cards.forEach((card, i) =>
        card.toggleAttribute("data-active", i === index)
      );
      gsap.to(cards, {
        zIndex: (i: number) => (i === index ? 3 : 1),
        scale: (i: number) => (i === index ? 1 : 0.96),
        duration: 0.3,
        ease: "power2.out",
        overwrite: "auto"
      });
    };

    show(0);
    ScrollTrigger.create({
      trigger: el,
      start: "center center",
      end: "+=200%",
      pin: true,
      onUpdate: (self) => show(activeStep(self.progress, cards.length))
    });

    return () => {
      cards.forEach((card, i) =>
        card.toggleAttribute("data-active", i === initial)
      );
    };
  }
};
