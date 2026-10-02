import { useCallback, useState } from "react";
import { useStore } from "zustand";
import {
  TIER_DPR,
  capForSlot,
  lowerTier,
  readTierEnv
} from "@/shared/three/detect-tier";
import { qualityStore } from "@/shared/three/quality-store";
import { HERO_MIN_SLOT_WIDTH } from "./tier-features";

// Device tier from the shared store (About's canvas sees the same
// downgrades), capped to Low when the hero slot is narrow (Phase 5 rule).
// Tiers only step down within a session (spec §9).
export function useQualityTier(slot: HTMLElement) {
  const [cap] = useState(() => {
    qualityStore.getState().init(readTierEnv());
    return capForSlot(
      "high",
      slot.getBoundingClientRect().width,
      HERO_MIN_SLOT_WIDTH
    );
  });
  const device = useStore(qualityStore, (state) => state.level ?? "low");
  const level = lowerTier(device, cap);
  const downgrade = useCallback(() => qualityStore.getState().downgrade(), []);
  return { level, dpr: TIER_DPR[level], downgrade };
}
