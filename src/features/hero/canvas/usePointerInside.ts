import { useEffect, useRef, type RefObject } from "react";

// True while a mouse (not touch/pen) is over el; read in useFrame.
export function usePointerInside(
  el: HTMLElement,
  enabled: boolean
): RefObject<boolean> {
  const inside = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    const onMove = (event: PointerEvent) => {
      inside.current = event.pointerType === "mouse";
    };
    const onLeave = () => {
      inside.current = false;
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      inside.current = false;
    };
  }, [el, enabled]);
  return inside;
}
