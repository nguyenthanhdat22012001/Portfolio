import { LOW_FPS_FLOOR, type RenderTier } from "./detect-tier";

/**
 * Lower/upper fps bounds for drei's PerformanceMonitor. Above Low these are
 * drei's defaults (a decline means "well under the refresh rate"). At Low the
 * lower bound is the Off floor, so a phone holding the spec's ≥ 30 fps target
 * never registers a decline.
 */
export function monitorBounds(
  level: RenderTier,
  refreshrate: number
): [lower: number, upper: number] {
  const defaults: [number, number] = refreshrate > 100 ? [60, 100] : [40, 60];
  return level === "low" ? [LOW_FPS_FLOOR, defaults[1]] : defaults;
}

export type DeclineAction = "downgrade" | "off" | "stay";

/**
 * What to do when drei reports a decline (most samples in the window under the
 * lower bound). Above Low: step down one tier. At Low: go Off only when the
 * window's average is also under the floor. Never steps up.
 */
export function declineAction(
  level: RenderTier,
  samples: readonly number[]
): DeclineAction {
  if (level !== "low") return "downgrade";
  if (samples.length === 0) return "stay";
  const average = samples.reduce((sum, fps) => sum + fps, 0) / samples.length;
  return average < LOW_FPS_FLOOR ? "off" : "stay";
}
