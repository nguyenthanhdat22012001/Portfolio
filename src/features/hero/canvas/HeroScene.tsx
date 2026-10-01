import type { RenderTier } from "../quality/detect-tier";
import { CameraRig } from "./CameraRig";
import { Graph } from "./Graph";

export function HeroScene({ tier }: { tier: RenderTier }) {
  return (
    <>
      <CameraRig />
      <Graph tier={tier} />
      {/* Phase 5B: <Avatar tier={tier} /> goes here, same Canvas, same lights. */}
    </>
  );
}
