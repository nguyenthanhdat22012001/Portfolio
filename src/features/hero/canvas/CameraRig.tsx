import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import { damp } from "@/shared/lib/math";
import { PARALLAX, fitCameraZ } from "./graph-frame";
import { usePointerInside } from "./usePointerInside";

const PARALLAX_DAMPING = 4;

// Fits the layered graph to the slot width (recomputed on resize) and, on
// fine pointers, eases the camera towards the pointer.
export function CameraRig({
  parallax,
  slot
}: {
  parallax: boolean;
  slot: HTMLElement;
}) {
  const size = useThree((state) => state.size);
  const z = useMemo(
    () => fitCameraZ(size.width / Math.max(1, size.height)),
    [size]
  );
  const inside = usePointerInside(slot, parallax);

  useFrame(({ camera, pointer }, delta) => {
    const active = parallax && inside.current;
    const tx = active ? pointer.x * PARALLAX : 0;
    const ty = active ? pointer.y * PARALLAX : 0;
    camera.position.x = damp(camera.position.x, tx, PARALLAX_DAMPING, delta);
    camera.position.y = damp(camera.position.y, ty, PARALLAX_DAMPING, delta);
    camera.position.z = z;
    camera.lookAt(0, 0, 0);
  });
  return null;
}
