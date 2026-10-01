import type { RenderTier } from "../quality/detect-tier";
import { CameraRig } from "./CameraRig";
import { Graph } from "./Graph";

export function HeroScene({ tier, slot }: { tier: RenderTier; slot: HTMLElement }) {
  return (
    <>
      <CameraRig />
      <Graph tier={tier} slot={slot} />
      {/* Phase 5B: <Avatar tier={tier} /> goes here, same Canvas, same lights. */}
    </>
  );
}
