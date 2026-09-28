// Every effect name the registry in app/[locale]/_motion/registry.ts must
// implement. Later tasks append to this list as they add effects.
export const motionNames = [
  "hero",
  "reveal",
  "count",
  "stagger",
  "footer-reveal",
  "swift",
  "safebulk",
  "oneloyalty"
] as const;

export type MotionName = (typeof motionNames)[number];

export function motion(name: MotionName): { "data-motion": MotionName } {
  return { "data-motion": name };
}

export function magnetic(strength = 0.35): { "data-magnetic": string } {
  return { "data-magnetic": String(strength) };
}
