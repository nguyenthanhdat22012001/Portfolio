import { count } from "@/shared/animation/effects/count";
import { hero } from "@/shared/animation/effects/hero";
import { reveal } from "@/shared/animation/effects/reveal";
import type { MotionName } from "@/shared/animation/motion";
import type { DesktopHandler, MotionEffectDef } from "@/shared/animation/types";

// The one place that joins shared and feature effects. Adding a name to
// motionNames without an entry here (or vice versa) is a type error.
export const motionRegistry = {
  hero,
  reveal,
  count
} satisfies Record<MotionName, MotionEffectDef>;

export const desktopHandlers: readonly DesktopHandler[] = [];
