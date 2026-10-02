import { decideGate, type GateEnv } from "@/shared/three/decide-gate";
import type { RenderTier } from "@/shared/three/detect-tier";

export type AvatarPath = "fallback" | "low" | "3d";

/**
 * fallback: static idle image (reduced motion, no WebGL, Save-Data).
 * low: image animation only, never downloads avatar.glb (touch, small, or
 * the shared tier is already Low). 3d: the canvas mounts near About.
 * The Low animation swaps wave → idle, so it needs the slot below the
 * viewport: an image already on screen stays static (CLAUDE.md).
 */
export function decideAvatarPath(
  env: GateEnv,
  tier: RenderTier,
  slotBelowViewport: boolean
): AvatarPath {
  if (decideGate(env) === "fallback") return "fallback";
  if (env.isDesktop && tier !== "low") return "3d";
  return slotBelowViewport ? "low" : "fallback";
}

/** The element's top is at or below the bottom of the viewport. */
export function isBelowViewport(el: Element, win: Window = window): boolean {
  return el.getBoundingClientRect().top >= win.innerHeight;
}
