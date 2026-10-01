import type { DesktopHandler } from "../types";

const HOT_TARGETS = "a, button, summary, [data-magnetic]";

// A ring that trails the native cursor; the system cursor is never hidden.
export const startCursor: DesktopHandler = ({ gsap }) => {
  const ring = document.createElement("div");
  ring.className = "motion-cursor";
  ring.setAttribute("aria-hidden", "true");
  ring.setAttribute("data-cursor", "");
  document.body.append(ring);

  const x = gsap.quickTo(ring, "x", { duration: 0.35, ease: "power3.out" });
  const y = gsap.quickTo(ring, "y", { duration: 0.35, ease: "power3.out" });

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    ring.setAttribute("data-visible", "");
    // pointerover doesn't refire while moving between nodes on one canvas,
    // so the hero graph's node hover is checked on every move.
    const node =
      event.target instanceof Element && event.target.closest('[data-cursor="node"]');
    ring.toggleAttribute("data-node", Boolean(node));
    x(event.clientX);
    y(event.clientY);
  };
  const onOver = (event: PointerEvent) => {
    const hot =
      event.target instanceof Element && event.target.closest(HOT_TARGETS);
    ring.toggleAttribute("data-hover", Boolean(hot));
  };
  const onLeave = () => ring.removeAttribute("data-visible");

  window.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerover", onOver, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);

  return () => {
    window.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerover", onOver);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    ring.remove();
  };
};
