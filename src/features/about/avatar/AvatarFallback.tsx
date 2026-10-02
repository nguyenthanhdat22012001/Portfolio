/* eslint-disable @next/next/no-img-element -- spec 5B §B.8: plain <img> with fixed size and fetchpriority low; next/image would add srcset and a loader for a 22 KB decorative WebP. */
import type { CSSProperties } from "react";
import { AVATAR } from "./avatar.config";

const pct = (fraction: number) => `${(fraction * 100).toFixed(2)}%`;
const POSES = ["wave", "idle"] as const;

// Server-rendered stand-in for the 3D avatar (no JS, reduced motion, Low
// tier, before the canvas paints, failed 3D). Decorative: the About heading
// and text carry the meaning. globals.css picks the visible pose; feet line
// and height come from the same config as aboutFrame, so the swap to the
// canvas doesn't jump.
export function AvatarFallback() {
  const { fallback } = AVATAR;
  const style = {
    "--avatar-bottom": pct(AVATAR.feetFromBottom),
    "--avatar-h": pct(AVATAR.screenHeight),
    "--avatar-swap": `${fallback.swapAt}s`,
    "--avatar-wave-anchor": String(fallback.wave.anchorX),
    "--avatar-wave-scale": String(fallback.wave.scale),
    "--avatar-idle-anchor": String(fallback.idle.anchorX)
  } as CSSProperties;

  return (
    <div className="about-avatar-fallback" style={style}>
      {POSES.map((pose) => (
        <img
          key={pose}
          data-avatar-pose={pose}
          src={fallback[pose].src}
          width={fallback[pose].width}
          height={fallback[pose].height}
          alt=""
          // About is below the fold (spec §7).
          loading="lazy"
          decoding="async"
          fetchPriority="low"
        />
      ))}
    </div>
  );
}
