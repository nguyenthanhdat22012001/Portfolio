import { AVATAR } from "./avatar.config";

// Pure model of the avatar's motion (spec B.5/B.6/B.7). No three.js: the
// frame loop in Avatar.tsx evaluates it and applies the result.
//
// Imports nothing from the canvas chunk's modules (graph-frame, shared math):
// a module shared with another chunk can no longer be scope-hoisted there,
// which cost the canvas chunk ~0.7 KB gzip it doesn't have (CLAUDE.md).

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export type ClipName = keyof typeof AVATAR.CLIPS;
export type AvatarPhase = "enter" | "walk" | "wave" | "idle";
export type IntroMode = "full" | "repeat" | "rewave" | "skip";

export interface IntroPose {
  phase: AvatarPhase;
  z: number;
  opacity: number;
  clip: ClipName;
  /** Crossfade (s) used when `clip` differs from the clip playing now. */
  fade: number;
  walkTimeScale: number;
  bubble: boolean;
}

const T = AVATAR.timings;
const SLOW = AVATAR.walkSlowdown;
const CRUISE_END = T.walk - SLOW;
const MIN_STEP_RATE = 0.6;

/** Constant speed, then a linear slow-down to 0 over SLOW, covering start → end. */
export const CRUISE_SPEED =
  (AVATAR.end.z - AVATAR.start.z) / (T.walk - SLOW / 2);
/** Full intro hands over to idle: wave clip end minus the crossfade. */
export const FULL_IDLE_AT = T.walk + T.wave - T.waveToIdle;
const SHORT_IDLE_AT = T.wave - T.waveToIdle;
const BUBBLE_LENGTH = T.bubbleOut - T.bubbleIn;

function walkAt(t: number): { z: number; speed: number } {
  const start = AVATAR.start.z;
  if (t <= CRUISE_END) {
    return { z: start + CRUISE_SPEED * Math.max(0, t), speed: CRUISE_SPEED };
  }
  const u = Math.min(t - CRUISE_END, SLOW);
  return {
    z: start + CRUISE_SPEED * (CRUISE_END + u - (u * u) / (2 * SLOW)),
    speed: CRUISE_SPEED * (1 - u / SLOW)
  };
}

function settled(
  phase: "wave" | "idle",
  opacity: number,
  bubble: boolean
): IntroPose {
  return {
    phase,
    z: AVATAR.end.z,
    opacity,
    clip: phase,
    fade: phase === "wave" ? T.walkToWave : T.waveToIdle,
    walkTimeScale: AVATAR.walkTimeScale,
    bubble
  };
}

export function poseAt(t: number, mode: IntroMode): IntroPose {
  if (mode === "skip") return settled("idle", 1, false);

  if (mode === "full") {
    if (t < T.walk) {
      const { z, speed } = walkAt(t);
      return {
        phase: t < T.fadeIn ? "enter" : "walk",
        z,
        opacity: clamp(t / T.fadeIn, 0, 1),
        clip: "walk",
        fade: 0,
        walkTimeScale:
          AVATAR.walkTimeScale * clamp(speed / CRUISE_SPEED, MIN_STEP_RATE, 1),
        bubble: false
      };
    }
    const bubble = t >= T.bubbleIn && t < T.bubbleOut;
    return settled(t < FULL_IDLE_AT ? "wave" : "idle", 1, bubble);
  }

  // "repeat" (same-session revisit) and "rewave" (click): a short wave.
  const opacity = mode === "repeat" ? clamp(t / AVATAR.repeatFadeIn, 0, 1) : 1;
  return settled(
    t < SHORT_IDLE_AT ? "wave" : "idle",
    opacity,
    t < BUBBLE_LENGTH
  );
}

export interface Intro {
  step(dt: number, morph: number): IntroPose;
  /** Click-to-wave; true if accepted (only from idle). */
  rewave(): boolean;
}

export function createIntro(initial: "full" | "repeat"): Intro {
  let mode: IntroMode = initial;
  let t = 0;
  let started = false;
  return {
    step(dt, morph) {
      if (!started) {
        started = true; // the first frame is t = 0
        if (morph > AVATAR.skipIntroAtMorph) mode = "skip";
      } else {
        t += dt;
      }
      let pose = poseAt(t, mode);
      if (pose.phase !== "idle" && morph > AVATAR.skipIntroAtMorph) {
        mode = "skip";
        t = 0;
        pose = poseAt(0, mode);
      }
      return pose;
    },
    rewave() {
      if (poseAt(t, mode).phase !== "idle") return false;
      mode = "rewave";
      t = 0;
      return true;
    }
  };
}

export interface ScrollPose {
  zOffset: number;
  opacity: number;
  visible: boolean;
  lookAt: boolean;
}

export function scrollPose(morph: number): ScrollPose {
  const hideAt = AVATAR.receded.opacityAtMorph;
  const k = clamp(morph / hideAt, 0, 1);
  return {
    zOffset: k === 0 ? 0 : (AVATAR.receded.z - AVATAR.end.z) * k, // never -0
    opacity: 1 - k,
    visible: morph < hideAt,
    lookAt: morph <= 0.001
  };
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

export function clampLook(
  yawDeg: number,
  pitchDeg: number
): { yaw: number; pitch: number } {
  const { yaw, pitch } = AVATAR.lookAt;
  return {
    yaw: toRad(clamp(yawDeg, -yaw, yaw)),
    pitch: toRad(clamp(pitchDeg, -pitch, pitch))
  };
}

/** Pointer in slot NDC (-1..1) → head offset in radians, rig signs applied. */
export function lookTarget(
  px: number,
  py: number
): { yaw: number; pitch: number } {
  const { yaw, pitch, gain, yawSign, pitchSign } = AVATAR.lookAt;
  const look = clampLook(px * yaw * gain, py * pitch * gain);
  // `|| 0` turns -0 into 0.
  return { yaw: look.yaw * yawSign || 0, pitch: look.pitch * pitchSign || 0 };
}

export interface AvatarFrame {
  /** Uniform model scale so the avatar is screenHeight of the slot at end.z. */
  scale: number;
  /** World y of the feet (constant; perspective lifts them while far away). */
  feetY: number;
  /** Horizontal position of end.x as a % of the slot width. */
  leftPct: number;
}

/** cameraZ/fovDeg: the hero camera (CameraRig fits z to the slot aspect). */
export function avatarFrame(
  aspect: number,
  cameraZ: number,
  fovDeg: number
): AvatarFrame {
  const depth = cameraZ - AVATAR.end.z;
  const visibleH = 2 * depth * Math.tan(toRad(fovDeg / 2));
  return {
    scale: (AVATAR.screenHeight * visibleH) / AVATAR.height,
    feetY: visibleH * (AVATAR.feetFromBottom - 0.5),
    leftPct: 50 + (AVATAR.end.x / ((visibleH / 2) * aspect)) * 50
  };
}
