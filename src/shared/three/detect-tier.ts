/** Rendering tiers. "Off" is not a tier: it is each canvas gate's fallback state. */
export type RenderTier = "high" | "medium" | "low";

/** Device facts only. Each canvas applies its own slot cap (capForSlot). */
export interface TierEnv {
  finePointer: boolean;
  cores?: number;
  memory?: number;
}

/** In the Low tier, sustained fps below this switches a canvas Off. */
export const LOW_FPS_FLOOR = 25;

export function detectTier(env: TierEnv): RenderTier {
  if (!env.finePointer) return "low";
  const strongCpu = (env.cores ?? 0) >= 8;
  const enoughMemory = env.memory === undefined || env.memory >= 8;
  return strongCpu && enoughMemory ? "high" : "medium";
}

export function downgradeTier(level: RenderTier): RenderTier {
  return level === "high" ? "medium" : "low";
}

const RANK: Record<RenderTier, number> = { low: 0, medium: 1, high: 2 };

export function lowerTier(a: RenderTier, b: RenderTier): RenderTier {
  return RANK[a] <= RANK[b] ? a : b;
}

/** A slot narrower than minWidth renders at Low whatever the device can do. */
export function capForSlot(
  level: RenderTier,
  slotWidth: number,
  minWidth: number
): RenderTier {
  return slotWidth < minWidth ? "low" : level;
}

export const TIER_DPR: Record<RenderTier, number | [number, number]> = {
  high: [1, 1.5],
  medium: [1, 1.25],
  low: 1
};

export function readTierEnv(win: Window = window): TierEnv {
  const nav = win.navigator as Navigator & { deviceMemory?: number };
  return {
    finePointer: win.matchMedia("(pointer: fine)").matches,
    cores: nav.hardwareConcurrency || undefined,
    memory: nav.deviceMemory
  };
}
