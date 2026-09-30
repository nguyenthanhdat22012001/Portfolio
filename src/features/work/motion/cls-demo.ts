import type { MotionCleanup, MotionContext } from "@/shared/animation/types";
import { isAtOrAboveViewport } from "@/shared/animation/viewport";

// Desktop only: BEFORE plays a layout shift — the async block is revealed
// with clip-path and the cards jump down with a transform — then AFTER's
// content fills space that was reserved all along. Nothing here touches
// layout properties, so the demo itself never shifts the page. Without it
// (mobile, reduced motion, no JS) both panes show their final state.
export function runClsDemo(
  root: HTMLElement,
  { gsap, isDesktop }: MotionContext
): MotionCleanup | void {
  if (!isDesktop || isAtOrAboveViewport(root)) return;

  const before = root.querySelector<HTMLElement>('[data-layer="before"]');
  if (!before) return;
  const block = before.querySelector<HTMLElement>("[data-async-block]");
  const cards = before.querySelector<HTMLElement>("[data-cards]");
  const content = root.querySelector<HTMLElement>(
    '[data-layer="after"] [data-async-content]'
  );
  if (!block || !cards || !content) return;
  const marks = [
    ...before.querySelectorAll<HTMLElement>("[data-ghost], [data-shift-marker]")
  ];

  // Where the cards sat before the async block took its space.
  const shift =
    cards.getBoundingClientRect().top - block.getBoundingClientRect().top;

  const timeline = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: root,
      start: "top 70%",
      end: "bottom 30%",
      scrub: 1
    }
  });
  timeline
    .fromTo(
      block,
      { clipPath: "inset(0 0 100% 0)" },
      { clipPath: "inset(0 0 0% 0)", duration: 0.25 },
      0.15
    )
    // Janky on purpose: this is the shift the real dashboard had.
    .fromTo(
      cards,
      { y: -shift },
      { y: 0, duration: 0.25, ease: "power4.in" },
      0.15
    );
  if (marks.length > 0) {
    timeline.fromTo(marks, { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.4);
  }
  timeline.fromTo(
    content,
    { opacity: 0 },
    { opacity: 1, duration: 0.35 },
    0.65
  );

  return () => {
    gsap.set([block, cards, ...marks, content], {
      clearProps: "clipPath,transform,opacity"
    });
  };
}
