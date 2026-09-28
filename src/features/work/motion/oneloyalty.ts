import type {
  MotionCleanup,
  MotionContext,
  MotionEffectDef
} from "@/shared/animation/types";
import { isAtOrAboveViewport } from "@/shared/animation/viewport";
import { greetingAt, type Greeting } from "./greeting-cycle";

const GREETING_INTERVAL_MS = 2500;

type Split = ReturnType<MotionContext["SplitText"]["create"]>;

// Scattered components merge into one grid (40+ de-duplicated components),
// and the greeting cycles through the i18n system's languages. The visible
// greeting is aria-hidden; the sr-only list stays the accessible source.
export const oneloyalty: MotionEffectDef = {
  reducedMotion: true,
  run(el, { gsap, ScrollTrigger, SplitText, reduceMotion }) {
    const cleanups: MotionCleanup[] = [];

    const grid = el.querySelector<HTMLElement>("[data-oneloyalty-grid]");
    if (grid && !reduceMotion && !isAtOrAboveViewport(grid)) {
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

    const greetingEl = el.querySelector<HTMLElement>(
      "[data-oneloyalty-greeting]"
    );
    const counterEl = el.querySelector<HTMLElement>(
      "[data-oneloyalty-counter]"
    );
    const list = el.querySelector("[data-oneloyalty-greetings]");
    if (greetingEl && counterEl && list) {
      const greetings: Greeting[] = Array.from(
        list.querySelectorAll("li"),
        (li) => ({ text: li.textContent ?? "", lang: li.lang })
      );
      const template =
        counterEl.dataset.counterTemplate ?? "{current} / {total}";
      const original = {
        text: greetingEl.textContent ?? "",
        lang: greetingEl.lang,
        counter: counterEl.textContent ?? ""
      };
      let index = 0;
      let intervalId: number | undefined;
      let split: Split | null = null;

      const show = (next: number) => {
        const greeting = greetingAt(greetings, next, template);
        index = next;
        greetingEl.textContent = greeting.text;
        greetingEl.lang = greeting.lang;
        counterEl.textContent = greeting.counter;
      };

      const step = () => {
        if (reduceMotion) {
          show(index + 1);
          return;
        }
        const out = SplitText.create(greetingEl, {
          type: "chars",
          aria: "none"
        });
        split = out;
        gsap.to(out.chars, {
          yPercent: -100,
          opacity: 0,
          duration: 0.3,
          stagger: 0.03,
          ease: "power2.in",
          onComplete: () => {
            out.revert();
            show(index + 1);
            const incoming = SplitText.create(greetingEl, {
              type: "chars",
              aria: "none"
            });
            split = incoming;
            gsap.from(incoming.chars, {
              yPercent: 100,
              opacity: 0,
              duration: 0.3,
              stagger: 0.03,
              ease: "power2.out",
              onComplete: () => {
                incoming.revert();
                split = null;
              }
            });
          }
        });
      };

      const stop = () => {
        if (intervalId !== undefined) window.clearInterval(intervalId);
        intervalId = undefined;
      };
      const trigger = ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          stop();
          if (self.isActive) {
            intervalId = window.setInterval(step, GREETING_INTERVAL_MS);
          }
        }
      });

      cleanups.push(() => {
        stop();
        trigger.kill();
        gsap.killTweensOf(greetingEl.querySelectorAll("*"));
        split?.revert();
        greetingEl.textContent = original.text;
        greetingEl.lang = original.lang;
        counterEl.textContent = original.counter;
      });
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }
};
