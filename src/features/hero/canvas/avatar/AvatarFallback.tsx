/* eslint-disable @next/next/no-img-element -- spec B.8: plain <img> with fixed size and fetchpriority low; next/image would add srcset and a loader for a 22 KB decorative WebP. */
import type { CSSProperties } from "react";
import { AVATAR } from "./avatar.config";
import { avatarFrame } from "./choreography";

const pct = (fraction: number) => `${(fraction * 100).toFixed(2)}%`;
const POSES = ["wave", "idle"] as const;

// Server-rendered stand-in for the 3D avatar (no JS, reduced motion, Low/Off
// tiers, failed 3D load). Decorative: the name is the h1. globals.css picks
// the visible pose; placement uses the same math as the 3D avatar.
export function AvatarFallback() {
  const { fallback } = AVATAR;
  const style = {
    "--avatar-left-sm": pct(avatarFrame(AVATAR.slotAspect.sm).leftPct / 100),
    "--avatar-left-md": pct(avatarFrame(AVATAR.slotAspect.md).leftPct / 100),
    "--avatar-bottom": pct(AVATAR.feetFromBottom),
    "--avatar-h-sm": pct(fallback.heightSm),
    "--avatar-h-md": pct(AVATAR.screenHeight),
    "--avatar-swap": `${fallback.swapAt}s`,
    "--avatar-wave-anchor": String(fallback.wave.anchorX),
    "--avatar-wave-scale": String(fallback.wave.scale),
    "--avatar-idle-anchor": String(fallback.idle.anchorX)
  } as CSSProperties;

  return (
    <div className="hero-avatar-fallback" style={style}>
      {POSES.map((pose) => (
        <img
          key={pose}
          data-avatar-pose={pose}
          src={fallback[pose].src}
          width={fallback[pose].width}
          height={fallback[pose].height}
          alt=""
          decoding="async"
          fetchPriority="low"
        />
      ))}
    </div>
  );
}
