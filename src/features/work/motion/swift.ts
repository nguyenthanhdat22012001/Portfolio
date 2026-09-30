import type { MotionEffectDef } from "@/shared/animation/types";
import { isAtOrAboveViewport } from "@/shared/animation/viewport";
import { RESULT_START, resultAt, stateAt } from "./live-progress";

// Mobile plays the whole run once: 0.6 s per step, then the result.
const MOBILE_SECONDS = 3;

// Desktop: pin the chapter and let scroll progress drive the live theme
// optimization. Mobile: the same progress plays once, no pin. The server
// HTML is the final state (4 × done, −20%); cleanup restores it. Only
// data-state, the result text, and its opacity change — never layout.
export const swift: MotionEffectDef = {
  run(el, { gsap, isDesktop }) {
    const steps = [...el.querySelectorAll<HTMLElement>("[data-step]")];
    const result = el.querySelector<HTMLElement>("[data-result-value]");
    if (steps.length === 0 || !result || isAtOrAboveViewport(el)) return;

    const finalResult = result.textContent ?? "";
    const failOnce = steps.map((step) => step.hasAttribute("data-fail-once"));
    const shown = steps.map(() => "");
    let shownValue = -1;
    let shownVisible: boolean | null = null;

    const render = (p: number) => {
      steps.forEach((step, i) => {
        const state = stateAt(p, i, failOnce[i] ?? false);
        if (state !== shown[i]) {
          shown[i] = state;
          step.dataset.state = state;
        }
      });
      const value = resultAt(p);
      if (value !== shownValue) {
        shownValue = value;
        result.textContent = `−${value}%`;
      }
      const visible = p >= RESULT_START;
      if (visible !== shownVisible) {
        shownVisible = visible;
        result.style.opacity = visible ? "1" : "0";
      }
    };

    const progress = { value: 0 };
    render(0);
    gsap.to(progress, {
      value: 1,
      ease: "none",
      onUpdate: () => render(progress.value),
      ...(isDesktop
        ? {
            scrollTrigger: {
              trigger: el,
              start: "center center",
              end: "+=150%",
              pin: true,
              scrub: 0.5
            }
          }
        : {
            duration: MOBILE_SECONDS,
            scrollTrigger: { trigger: el, start: "top 70%", once: true }
          })
    });

    return () => {
      for (const step of steps) step.dataset.state = "done";
      result.textContent = finalResult;
      result.style.opacity = "";
    };
  }
};
