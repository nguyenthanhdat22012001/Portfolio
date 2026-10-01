import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import { fitCameraZ } from "./graph-frame";

// Fits the layered graph to the slot width; recomputed on every resize.
export function CameraRig() {
  const size = useThree((state) => state.size);
  const z = useMemo(() => fitCameraZ(size.width / Math.max(1, size.height)), [size]);
  useFrame(({ camera }) => {
    camera.position.z = z;
    camera.lookAt(0, 0, 0);
  });
  return null;
}
