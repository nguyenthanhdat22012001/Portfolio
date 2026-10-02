import { useFrame } from "@react-three/fiber";
import { Suspense, lazy, useState } from "react";
import type { RenderTier } from "../../quality/detect-tier";
import { useGraphColors } from "../useGraphColors";

// The avatar's own chunk. The canvas chunk has no headroom left (CLAUDE.md),
// so this file stays minimal and everything else, the error boundary
// included, lives in that chunk.
const Avatar = lazy(
  () => import(/* webpackChunkName: "hero-avatar" */ "./Avatar")
);

// Mounts after the canvas's first frame if the tier is High or Medium then
// (spec B.3). No extra idle wait: the gate mounts the canvas itself only
// after load + idle on desktop, and the GLB parse stays under the 100 ms
// long-task limit (spec B.9; checked in Task 3). Once mounted it stays
// mounted: Avatar fades itself out on a drop to Low.
export function AvatarMount({
  tier,
  slot,
  bubble
}: {
  tier: RenderTier;
  slot: HTMLElement;
  bubble: string;
}) {
  const [mounted, setMounted] = useState(false);
  // Read here, in the canvas chunk, and passed down: the avatar chunk must not
  // import canvas modules (see choreography.ts).
  const palette = useGraphColors();
  useFrame(() => {
    if (!mounted && tier !== "low") setMounted(true);
  });

  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <Avatar tier={tier} slot={slot} bubble={bubble} palette={palette} />
    </Suspense>
  );
}
