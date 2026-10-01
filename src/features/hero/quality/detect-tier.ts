import { LOW_TIER_NODE_IDS } from "../graph/graph-data";

/** Rendering tiers. "Off" is not a tier: it is the gate's fallback state. */
export type RenderTier = "high" | "medium" | "low";

export interface TierEnv {
  finePointer: boolean;
  cores?: number;
  memory?: number;
  slotWidth: number;
}

/** In the Low tier, sustained fps below this switches the canvas Off. */
export const LOW_FPS_FLOOR = 25;

export function detectTier(env: TierEnv): RenderTier {
  if (!env.finePointer || env.slotWidth < 480) return "low";
  const strongCpu = (env.cores ?? 0) >= 8;
  const enoughMemory = env.memory === undefined || env.memory >= 8;
  return strongCpu && enoughMemory ? "high" : "medium";
}

export function downgradeTier(level: RenderTier): RenderTier {
  return level === "high" ? "medium" : "low";
}

export const TIER_DPR: Record<RenderTier, number | [number, number]> = {
  high: [1, 1.5],
  medium: [1, 1.25],
  low: 1
};

export function tierFeatures(level: RenderTier) {
  const full = level !== "low";
  return {
    labels: full,
    interactive: full,
    parallax: full,
    nodeIds: full ? undefined : LOW_TIER_NODE_IDS
  };
}

export function readTierEnv(slot: Element, win: Window = window): TierEnv {
  const nav = win.navigator as Navigator & { deviceMemory?: number };
  return {
    finePointer: win.matchMedia("(pointer: fine)").matches,
    cores: nav.hardwareConcurrency || undefined,
    memory: nav.deviceMemory,
    slotWidth: slot.getBoundingClientRect().width
  };
}
