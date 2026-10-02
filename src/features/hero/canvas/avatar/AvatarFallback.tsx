/* eslint-disable @next/next/no-img-element -- spec B.8: plain <img> with fixed size and fetchpriority low; next/image would add srcset and a loader for a 22 KB decorative WebP. */
import type { CSSProperties } from "react";
import { CAMERA_FOV, fitCameraZ } from "../graph-frame";
import { AVATAR } from "./avatar.config";
import { avatarFrame } from "./choreography";

const pct = (fraction: number) => `${(fraction * 100).toFixed(2)}%`;
const POSES = ["wave", "idle"] as const;
const leftFor = (aspect: number) =>
  pct(avatarFrame(aspect, fitCameraZ(aspect), CAMERA_FOV).leftPct / 100);

// Server-rendered stand-in for the 3D avatar (no JS, reduced motion, Low/Off
// tiers, failed 3D load). Decorative: the name is the h1. globals.css picks
// the visible pose; placement uses the same math as the 3D avatar.
export function AvatarFallback() {
  const { fallback } = AVATAR;
  const style = {
    "--avatar-left-sm": leftFor(AVATAR.slotAspect.sm),
    "--avatar-left-md": leftFor(AVATAR.slotAspect.md),
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
          // Lazy: never fetched on desktop, where the wrapper is display:
          // none; in view on mobile it still loads right after layout.
          loading="lazy"
          decoding="async"
          fetchPriority="low"
        />
      ))}
    </div>
  );
}
