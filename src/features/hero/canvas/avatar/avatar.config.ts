/**
 * Avatar config — generated from Meshy_AI_Alex_All_Animations.glb (2026-10-02).
 * Asset facts (measured):
 *  - height 1.70 m, feet on y = 0, facing +Z, 10,355 triangles, 1 material, 28 joints (Mixamo rig)
 *  - textures: baseColor / normal / metallicRoughness, 1024² WebP; file 0.79 MB (meshopt)
 *  - clips: walk 1.04 s (in place, loop) · wave 2.45 s (trimmed from Big_Wave_Hello 1.85–4.30 s,
 *    hips re-centred) · idle 2.0 s (loop)
 *  - walk stride ≈ 0.71 m per step → natural travel speed ≈ 1.36 m/s at timeScale 1
 */
export const AVATAR = {
  url: "/models/avatar.glb",

  /** three.js strips ':' from node names: 'mixamorig:Head' → 'mixamorigHead'. */
  HEAD_BONE: "mixamorigHead",

  /** Clip names inside avatar.glb (already renamed). */
  CLIPS: { walk: "walk", wave: "wave", idle: "idle" },

  height: 1.7,

  /**
   * Walk distance matches the clip's natural speed (1.36 m/s × ~2.1 s ≈ 2.8 m) so feet don't slide.
   * Start sits inside the graph's tangle (radius 2.6), end in front of it.
   * If you change timings.walk, keep (end.z - start.z) ≈ 1.3 × timings.walk.
   */
  start: { x: 0.6, z: -1.2 },
  end: { x: 0.6, z: 1.6 },
  receded: { z: 0.2, opacityAtMorph: 0.5 },
  /** Scrolled past this morph when the intro starts (or while it runs) → straight to idle. */
  skipIntroAtMorph: 0.3,

  timings: {
    fadeIn: 0.4,
    walk: 2.2, // constant speed, then a linear slow-down over walkSlowdown
    walkToWave: 0.3,
    wave: 2.45, // full clip length, LoopOnce + clampWhenFinished
    waveToIdle: 0.5,
    bubbleIn: 2.2,
    bubbleOut: 4.4
  },
  walkSlowdown: 0.4,
  /** Repeat visit: appear at `end` with this fade (s). */
  repeatFadeIn: 0.3,
  /** Runtime drop to the Low tier: fade the 3D avatar out over this (s). */
  tierFadeOut: 0.3,

  walkTimeScale: 1.0,

  /** On-screen size at `end.z`: fraction of the slot height, feet this far above the slot bottom. */
  screenHeight: 0.7,
  feetFromBottom: 0.15,
  /** Mirrors HeroSection's slot classes: aspect-[4/3] and md:aspect-[7/8]. */
  slotAspect: { sm: 4 / 3, md: 7 / 8 },

  /** Server-rendered WebP fallback (Low/Off tiers). anchorX = feet centre as a fraction of the image width. */
  fallback: {
    /** Mobile height (fraction of the slot): smaller than 3D's 0.7 so the h1 stays the LCP element. */
    heightSm: 0.55,
    /** Low tier: wave image swaps to idle after this many seconds. */
    swapAt: 2,
    wave: {
      src: "/images/avatar-wave.webp",
      width: 363,
      height: 600,
      anchorX: 0.56,
      scale: 1.1
    },
    idle: {
      src: "/images/avatar-idle.webp",
      width: 248,
      height: 600,
      anchorX: 0.5,
      scale: 1
    }
  },

  /** Bubble anchor above the model's top, in model units. */
  bubbleOffset: 0.15,
  hitCapsule: { radius: 0.3 },
  /** Rim light only; the Phase 5 ambient + directional act as the key (design doc D4). */
  rim: { position: [-1.5, 2.5, -2], intensity: 2.5 },
  contactShadows: {
    opacity: 0.35,
    blur: 2.5,
    resolution: 256,
    scale: 1.4,
    far: 1
  },

  /** Degrees; gain maps the slot edge to past the limit; signs depend on the rig's bone axes. */
  lookAt: {
    yaw: 30,
    pitch: 15,
    damping: 5,
    gain: 1.5,
    yawSign: 1,
    pitchSign: -1
  }
} as const;
