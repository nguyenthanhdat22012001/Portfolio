import { AVATAR } from "./avatar.config";

// Pure model of the avatar's motion (spec 5B §B.5/B.6, 5C §5). No three.js: the frame loop in Avatar.tsx evaluates it and applies the result.

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export type ClipName = keyof typeof AVATAR.CLIPS;
export type AvatarPhase = "enter" | "walk" | "wave" | "idle";
export type IntroMode = "full" | "repeat" | "rewave" | "skip";
export type StartMode = "full" | "repeat" | "skip";

export interface IntroPose {
  phase: AvatarPhase;
  z: number;
  opacity: number;
  clip: ClipName;
  /** Crossfade (s) used when `clip` differs from the clip playing now. */
  fade: number;
  walkTimeScale: number;
  bubble: boolean;
  /** About counters may start (spec §6). */
  counters: boolean;
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
  bubble: boolean,
  counters: boolean
): IntroPose {
  return {
    phase,
    z: AVATAR.end.z,
    opacity,
    clip: phase,
    fade: phase === "wave" ? T.walkToWave : T.waveToIdle,
    walkTimeScale: AVATAR.walkTimeScale,
    bubble,
    counters
  };
}

export function poseAt(t: number, mode: IntroMode): IntroPose {
  if (mode === "skip") return settled("idle", 1, false, true);

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
        bubble: false,
        counters: false
      };
    }
    const bubble = t >= T.bubbleIn && t < T.bubbleOut;
    return settled(
      t < FULL_IDLE_AT ? "wave" : "idle",
      1,
      bubble,
      t >= T.countersStart
    );
  }

  // "repeat" (same-session revisit) and "rewave" (click): a short wave.
  const opacity = mode === "repeat" ? clamp(t / AVATAR.repeatFadeIn, 0, 1) : 1;
  return settled(
    t < SHORT_IDLE_AT ? "wave" : "idle",
    opacity,
    t < BUBBLE_LENGTH,
    true
  );
}

export function startMode({
  alreadyPast,
  greeted
}: {
  alreadyPast: boolean;
  greeted: boolean;
}): StartMode {
  if (alreadyPast) return "skip";
  return greeted ? "repeat" : "full";
}

export interface Intro {
  step(dt: number): IntroPose;
  /** Click-to-wave; true if accepted (only from idle). */
  rewave(): boolean;
}

// The clock only moves forward, so once idle the intro never replays.
export function createIntro(initial: StartMode): Intro {
  let mode: IntroMode = initial;
  let t = 0;
  let started = false;
  return {
    step(dt) {
      if (!started)
        started = true; // the first frame is t = 0
      else t += dt;
      return poseAt(t, mode);
    },
    rewave() {
      if (poseAt(t, mode).phase !== "idle") return false;
      mode = "rewave";
      t = 0;
      return true;
    }
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

export interface AboutFrame {
  cameraZ: number;
  cameraY: number;
}

/**
 * Camera position for About: looking straight down -Z, the avatar at end.z
 * is screenHeight of the slot tall with its feet feetFromBottom up. With a
 * fixed vertical fov this holds at every slot size.
 */
export function aboutFrame(fovDeg: number): AboutFrame {
  const visibleH = AVATAR.height / AVATAR.screenHeight;
  const depth = visibleH / (2 * Math.tan(toRad(fovDeg / 2)));
  return {
    cameraZ: AVATAR.end.z + depth,
    cameraY: visibleH * (0.5 - AVATAR.feetFromBottom)
  };
}
