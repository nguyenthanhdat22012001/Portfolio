import { oneloyalty } from "@/features/work/motion/oneloyalty";
import { safebulk } from "@/features/work/motion/safebulk";
import { swift } from "@/features/work/motion/swift";
import { count } from "@/shared/animation/effects/count";
import { startCursor } from "@/shared/animation/effects/cursor";
import { footerReveal } from "@/shared/animation/effects/footer-reveal";
import { startHashLinks } from "@/shared/animation/effects/hash-links";
import { hero } from "@/shared/animation/effects/hero";
import { startMagnetic } from "@/shared/animation/effects/magnetic";
import { reveal } from "@/shared/animation/effects/reveal";
import { stagger } from "@/shared/animation/effects/stagger";
import type { MotionName } from "@/shared/animation/motion";
import type { DesktopHandler, MotionEffectDef } from "@/shared/animation/types";

// The one place that joins shared and feature effects. Adding a name to
// motionNames without an entry here (or vice versa) is a type error.
export const motionRegistry = {
  hero,
  reveal,
  count,
  stagger,
  "footer-reveal": footerReveal,
  swift,
  safebulk,
  oneloyalty
} satisfies Record<MotionName, MotionEffectDef>;

export const desktopHandlers: readonly DesktopHandler[] = [
  startCursor,
  startMagnetic,
  startHashLinks
];
