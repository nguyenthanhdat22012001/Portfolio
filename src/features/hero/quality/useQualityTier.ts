import { useCallback, useState } from "react";
import { TIER_DPR, downgradeTier, type RenderTier } from "./detect-tier";

// Tiers only step down within a session (spec §9).
export function useQualityTier(initial: RenderTier) {
  const [level, setLevel] = useState(initial);
  const downgrade = useCallback(() => setLevel(downgradeTier), []);
  return { level, dpr: TIER_DPR[level], downgrade };
}
