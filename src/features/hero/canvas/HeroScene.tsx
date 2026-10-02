import type { RenderTier } from "@/shared/three/detect-tier";
import { tierFeatures } from "../quality/tier-features";
import { CameraRig } from "./CameraRig";
import { Graph } from "./Graph";

export function HeroScene({
  tier,
  slot
}: {
  tier: RenderTier;
  slot: HTMLElement;
}) {
  return (
    <>
      <CameraRig parallax={tierFeatures(tier).parallax} slot={slot} />
      <Graph tier={tier} slot={slot} />
    </>
  );
}
