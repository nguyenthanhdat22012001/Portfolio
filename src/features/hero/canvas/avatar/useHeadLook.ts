import { useEffect, useMemo, useRef } from "react";
import { Euler, MathUtils, Quaternion } from "three";
import type { AvatarModel } from "./avatar-model";
import { AVATAR } from "./avatar.config";
import { lookTarget } from "./choreography";

export type HeadLook = (
  dt: number,
  active: boolean,
  pointer: { x: number; y: number }
) => void;

// Runs after mixer.update(): adds a damped offset on top of the clip's head
// rotation. If no clip animates the head, the rest pose is restored first so
// the offset doesn't accumulate frame after frame.
export function createHeadLook(model: AvatarModel): HeadLook {
  const head = model.head;
  if (!head) return () => {};
  const rest = model.headAnimated ? null : head.quaternion.clone();
  const euler = new Euler();
  const offset = new Quaternion();
  let yaw = 0;
  let pitch = 0;
  return (dt, active, pointer) => {
    const target = active ? lookTarget(pointer.x, pointer.y) : null;
    const { damping } = AVATAR.lookAt;
    yaw = MathUtils.damp(yaw, target?.yaw ?? 0, damping, dt);
    pitch = MathUtils.damp(pitch, target?.pitch ?? 0, damping, dt);
    if (rest) head.quaternion.copy(rest);
    euler.set(pitch, yaw, 0);
    head.quaternion.multiply(offset.setFromEuler(euler));
  };
}

// True while a mouse is over the slot. Local on purpose: importing the canvas
// chunk's usePointerInside would cost it bytes (see choreography.ts).
function useMouseInside(el: HTMLElement) {
  const inside = useRef(false);
  useEffect(() => {
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
    };
  }, [el]);
  return inside;
}

export function useHeadLook(model: AvatarModel, slot: HTMLElement): HeadLook {
  const inside = useMouseInside(slot);
  const look = useMemo(() => createHeadLook(model), [model]);
  return useMemo(
    () => (dt, active, pointer) => look(dt, active && inside.current, pointer),
    [look, inside]
  );
}
