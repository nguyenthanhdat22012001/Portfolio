import type {
  MotionCleanup,
  MotionContext,
  MotionEffectDef
} from "@/shared/animation/types";
import { isAtOrAboveViewport } from "@/shared/animation/viewport";
import { greetingAt, type Greeting } from "./greeting-cycle";

const GREETING_INTERVAL_MS = 2500;

type Split = ReturnType<MotionContext["SplitText"]["create"]>;

const SPLIT_CONFIG = { type: "chars", aria: "none" } as const;

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
        // A morph from the previous tick is still running (e.g. a
        // throttled background tab let the interval outrun the tween) —
        // skip this tick rather than split an already-split node.
        if (split) return;
        const out = SplitText.create(greetingEl, SPLIT_CONFIG);
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
            const incoming = SplitText.create(greetingEl, SPLIT_CONFIG);
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

      // Stops the cycle and, if a morph is mid-flight, ends it immediately:
      // killing the tween prevents its onComplete from swapping text after
      // the chapter has left the screen, and reverting the split restores
      // plain text. If the tween was mid-out, that reverts to the greeting
      // shown before this tick's morph began (show() never ran); if it was
      // mid-in, it reverts to the greeting show() already swapped to.
      // Either way the DOM is left holding a real, unsplit greeting.
      const stop = () => {
        if (intervalId !== undefined) window.clearInterval(intervalId);
        intervalId = undefined;
        gsap.killTweensOf(greetingEl.querySelectorAll("*"));
        split?.revert();
        split = null;
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
