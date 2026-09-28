import type { MotionEffectDef } from "@/shared/animation/types";
import { isAtOrAboveViewport } from "@/shared/animation/viewport";
import { formatSwiftTimer } from "./swift-timer";

const MOBILE_SECONDS = 1.2;

// Desktop: pin the chapter and scrub the old 12 s load against the rebuilt
// 1–3 s one. Mobile: the same timeline plays once, no pin.
export const swift: MotionEffectDef = {
  run(el, { gsap, isDesktop }) {
    const before = el.querySelector<HTMLElement>('[data-swift-bar="before"]');
    const after = el.querySelector<HTMLElement>('[data-swift-bar="after"]');
    const afterValue = el.querySelector<HTMLElement>("[data-swift-after]");
    const timer = el.querySelector<HTMLElement>("[data-swift-timer]");
    const steps = el.querySelectorAll<HTMLElement>("[data-swift-step]");
    if (!before || !after || !afterValue || !timer) return;
    if (isAtOrAboveViewport(el)) return;

    const clock = { progress: 0 };
    const renderTimer = () => {
      timer.textContent = formatSwiftTimer(clock.progress);
    };
    renderTimer();

    const timeline = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: isDesktop
        ? {
            trigger: el,
            start: "center center",
            end: "+=150%",
            pin: true,
            scrub: 0.5
          }
        : { trigger: el, start: "top 75%", once: true }
    });
    timeline
      .fromTo(before, { scaleX: 0 }, { scaleX: 1, duration: 1 })
      .fromTo(
        clock,
        { progress: 0 },
        { progress: 1, duration: 1, onUpdate: renderTimer },
        "<"
      )
      .fromTo(
        after,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.2, ease: "power4.out" }
      )
      .from(afterValue, { opacity: 0, y: 12, duration: 0.2 }, "<")
      .from(steps, { opacity: 0.3, duration: 0.3, stagger: 0.1 });

    if (!isDesktop) timeline.timeScale(timeline.duration() / MOBILE_SECONDS);

    return () => {
      timer.textContent = "";
    };
  }
};
