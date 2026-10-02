import { useEffect } from "react";
import { AVATAR } from "./avatar.config";

// The slot is an external DOM node; the cursor effect reads this attribute.
// It is separate from the graph's data-cursor="node", so neither clears the
// other (and Graph.tsx, in the size-capped canvas chunk, stays untouched).
function setAvatarHover(slot: HTMLElement, on: boolean) {
  slot.toggleAttribute("data-avatar-hover", on);
}

// Invisible capsule around the body: cheap raycasts instead of testing the
// skinned mesh (spec B.6). Draws nothing (material.visible = false) but
// still receives R3F pointer events. Lives inside the avatar's scaled group.
export function AvatarHitProxy({
  slot,
  active,
  onWave
}: {
  slot: HTMLElement;
  active: () => boolean;
  onWave: () => void;
}) {
  useEffect(() => () => setAvatarHover(slot, false), [slot]);
  const { radius } = AVATAR.hitCapsule;
  return (
    <mesh
      position={[0, AVATAR.height / 2, 0]}
      onPointerOver={(event) => {
        event.stopPropagation();
        setAvatarHover(slot, active());
      }}
      onPointerOut={() => setAvatarHover(slot, false)}
      onClick={(event) => {
        event.stopPropagation();
        if (active()) onWave();
      }}
    >
      <capsuleGeometry args={[radius, AVATAR.height - 2 * radius, 4, 8]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}
