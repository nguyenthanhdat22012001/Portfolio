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
  url: '/models/avatar.glb',

  /** three.js strips ':' from node names: 'mixamorig:Head' → 'mixamorigHead'. */
  HEAD_BONE: 'mixamorigHead',

  /** Clip names inside avatar.glb (already renamed). */
  CLIPS: { walk: 'walk', wave: 'wave', idle: 'idle' },

  height: 1.70,

  /**
   * Walk distance matches the clip's natural speed (1.36 m/s × ~2.1 s ≈ 2.8 m) so feet don't slide.
   * Start sits inside the graph's tangle (radius 2.6), end in front of it.
   * If you change timings.walk, keep (end.z - start.z) ≈ 1.3 × timings.walk.
   */
  start: { x: 0.6, z: -1.2 },
  end: { x: 0.6, z: 1.6 },
  receded: { z: 0.2, opacityAtMorph: 0.5 },

  timings: {
    fadeIn: 0.4,
    walk: 2.2,          // use ease 'none' for the first 1.8 s, then slow down over the last 0.4 s
    walkToWave: 0.3,
    wave: 2.45,         // full clip length, LoopOnce + clampWhenFinished
    waveToIdle: 0.5,
    bubbleIn: 2.2,
    bubbleOut: 4.4,
  },

  walkTimeScale: 1.0,
  lookAt: { yaw: 30, pitch: 15, damping: 5 },
} as const;
