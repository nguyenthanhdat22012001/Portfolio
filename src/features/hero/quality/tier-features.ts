import type { RenderTier } from "@/shared/three/detect-tier";
import { LOW_TIER_NODE_IDS } from "../graph/graph-data";

/** Phase 5 rule: a hero slot narrower than this renders at Low. */
export const HERO_MIN_SLOT_WIDTH = 480;

export function tierFeatures(level: RenderTier) {
  const full = level !== "low";
  return {
    labels: full,
    interactive: full,
    parallax: full,
    nodeIds: full ? undefined : LOW_TIER_NODE_IDS
  };
}
