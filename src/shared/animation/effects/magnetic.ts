import type { DesktopHandler, MotionLibs } from "../types";

const DEFAULT_STRENGTH = 0.35;

type QuickTo = ReturnType<MotionLibs["gsap"]["quickTo"]>;

// Delegated, so elements on pages reached by client navigation work
// without a rescan.
export const startMagnetic: DesktopHandler = ({ gsap }) => {
  const movers = new WeakMap<HTMLElement, { x: QuickTo; y: QuickTo }>();
  let active: HTMLElement | null = null;

  const moverFor = (el: HTMLElement) => {
    let mover = movers.get(el);
    if (!mover) {
      const vars = { duration: 0.4, ease: "power3.out" };
      mover = {
        x: gsap.quickTo(el, "x", vars),
        y: gsap.quickTo(el, "y", vars)
      };
      movers.set(el, mover);
    }
    return mover;
  };

  const release = () => {
    if (!active) return;
    const mover = moverFor(active);
    mover.x(0);
    mover.y(0);
    active = null;
  };

  const onMove = (event: PointerEvent) => {
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-magnetic]")
        : null;
    if (target !== active) release();
    if (!target) return;
    active = target;

    // Measure the resting position: subtract the offset already applied.
    const rect = target.getBoundingClientRect();
    const offsetX = Number(gsap.getProperty(target, "x")) || 0;
    const offsetY = Number(gsap.getProperty(target, "y")) || 0;
    const centerX = rect.left - offsetX + rect.width / 2;
    const centerY = rect.top - offsetY + rect.height / 2;
    const strength = Number(target.dataset.magnetic) || DEFAULT_STRENGTH;

    const mover = moverFor(target);
    mover.x((event.clientX - centerX) * strength);
    mover.y((event.clientY - centerY) * strength);
  };

  document.addEventListener("pointermove", onMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", release);

  return () => {
    document.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", release);
    release();
  };
};
