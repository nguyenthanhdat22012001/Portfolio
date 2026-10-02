import { decideGate, type GateEnv } from "@/shared/three/decide-gate";
import type { RenderTier } from "@/shared/three/detect-tier";

export type AvatarPath = "fallback" | "low" | "3d";

/**
 * fallback: static idle image (reduced motion, no WebGL, Save-Data).
 * low: image animation only, never downloads avatar.glb (touch, small, or
 * the shared tier is already Low). 3d: the canvas mounts near About.
 */
export function decideAvatarPath(env: GateEnv, tier: RenderTier): AvatarPath {
  if (decideGate(env) === "fallback") return "fallback";
  return env.isDesktop && tier !== "low" ? "3d" : "low";
}
