import type { MotionEffectDef } from "../types";
import { isAtOrAboveViewport } from "../viewport";
import { parseStat } from "./parse-stat";

const HOLD = "data-count-hold";
/** Under a hold, start anyway this long after the stat's own trigger. */
export const HOLD_SAFETY_S = 4;

type Killable = { kill: () => void };

export const count: MotionEffectDef = {
  run(el, { gsap, ScrollTrigger }) {
    const finalText = el.textContent ?? "";
    const stat = parseStat(finalText);
    if (!stat || isAtOrAboveViewport(el)) return;

    const render = (value: number) => {
      el.textContent = `${value.toFixed(stat.decimals)}${stat.suffix}`;
    };
    const state = { value: 0 };
    el.setAttribute("aria-label", finalText);
    render(0);

    // Created from callbacks, outside the effect's gsap context: killed here.
    let tween: Killable | undefined;
    let safety: Killable | undefined;
    let observer: MutationObserver | undefined;
    let done = false;
    const start = () => {
      if (done) return;
      done = true;
      observer?.disconnect();
      safety?.kill();
      tween = gsap.to(state, {
        value: stat.value,
        duration: 1.2,
        ease: "power2.out",
        onUpdate: () => render(state.value)
      });
    };

    ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: () => {
        // About holds its counters until the 3D avatar waves (spec 5C §6).
        const host = el.closest(`[${HOLD}]`);
        if (!host) return start();
        observer = new MutationObserver(() => {
          if (!host.hasAttribute(HOLD)) start();
        });
        observer.observe(host, { attributes: true, attributeFilter: [HOLD] });
        safety = gsap.delayedCall(HOLD_SAFETY_S, start);
      }
    });

    return () => {
      done = true;
      observer?.disconnect();
      safety?.kill();
      tween?.kill();
      el.textContent = finalText;
      el.removeAttribute("aria-label");
    };
  }
};
