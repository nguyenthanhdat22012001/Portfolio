import type { MotionEffectDef } from "../types";
import { isAtOrAboveViewport } from "../viewport";
import { parseStat } from "./parse-stat";

export const count: MotionEffectDef = {
  run(el, { gsap }) {
    const finalText = el.textContent ?? "";
    const stat = parseStat(finalText);
    if (!stat || isAtOrAboveViewport(el)) return;

    const render = (value: number) => {
      el.textContent = `${value.toFixed(stat.decimals)}${stat.suffix}`;
    };
    const state = { value: 0 };
    el.setAttribute("aria-label", finalText);
    render(0);
    gsap.to(state, {
      value: stat.value,
      duration: 1.2,
      ease: "power2.out",
      onUpdate: () => render(state.value),
      scrollTrigger: { trigger: el, start: "top 90%", once: true }
    });

    return () => {
      el.textContent = finalText;
      el.removeAttribute("aria-label");
    };
  }
};
