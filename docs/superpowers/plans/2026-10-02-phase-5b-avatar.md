# Phase 5B Avatar Intro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A stylized 3D avatar walks out of the Hero node graph, waves with a speech bubble, idles with head look-at and click-to-wave, recedes on scroll, and falls back to CSS-driven WebP images on Low/Off tiers.

**Architecture:** All avatar logic is a pure model (`choreography.ts`) evaluated in `useFrame` against a clock — no GSAP, no per-frame React state. The 3D code lives in its own lazy webpack chunk (`hero-avatar`) mounted inside the existing Phase 5 `<Canvas>` after the first paint + idle, only on High/Medium tiers. Fallback images are server-rendered and switched purely by CSS attribute/media selectors, like the Phase 5 static graph.

**Tech Stack:** Next 16 (webpack build), React 19, React Three Fiber 9, drei 10 (per-component imports), three 0.186 (`GLTFLoader`, meshopt decoder, `SkeletonUtils` from `three/examples/jsm`), Zustand scroll store, Vitest + jsdom, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-02-phase-5b-avatar-design.md` (wins on conflicts) together with `docs/SPEC-phase-5b-avatar.en.md`. Read both, and `CLAUDE.md`.

## Global Constraints

- Work directly on the current branch `phase-5b`. No new branches, no worktrees. One Conventional Commit per task, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Layering `app → features → shared`; never suppress `eslint-plugin-boundaries`.
- Runtime `gsap`/`lenis` imports only in `app/[locale]/_motion/motion-entry.ts`. The avatar uses none.
- The canvas chunk stays ≤ 250 KB gzip and initial JS ≤ 150 KB gzip; the avatar code is a separate `dynamic`/`React.lazy` chunk named `hero-avatar` with its own cap (measured + 3 KB; stop and report if the measurement exceeds 40 KB).
- `avatar.glb` ≤ 1.5 MB (it is 0.79 MB); downloaded only on High/Medium after the canvas paints.
- Scene draw calls ≤ 9; avatar ≤ 15k triangles (it is 10,355).
- Never loosen `lighthouserc.json`. Mobile Lighthouse Performance ≥ 90, CLS ≤ 0.1, LCP element is the Hero `h1`.
- No hardcoded user-facing strings: `hero.avatar.bubble` in both `src/shared/i18n/messages/en.json` ("Hi, I'm Dat") and `vi.json` ("Chào, mình là Đạt"). No emoji.
- Nothing starts at `opacity: 0` in HTML/CSS except the documented exceptions (Task 2 adds the inactive avatar fallback pose). JS-created nodes (the bubble) may start hidden.
- drei imports are per-component: `@react-three/drei/web/Html`, `@react-three/drei/core/ContactShadows`.
- The 3D canvas stays `aria-hidden`; the bubble is `aria-hidden` (the name is already the `h1`).
- Done = `pnpm lint && pnpm typecheck && pnpm test && pnpm build` green, `pnpm test:e2e` green, Lighthouse CI green, and a manual `pnpm dev` (Turbopack) check.
- Spec token `--radius-lg` does not exist in this repo; use `var(--radius)`.

## Review Focus

1. **`avatar.glb` fails to load (404, offline, corrupt)** — the graph must keep running, the gate must stay `live`, and the static idle image must show in the avatar's spot. Pinned in Task 3 (e2e with `page.route` 404).
2. **`sessionStorage` throws (blocked storage / some private modes)** — the full intro must still run and reach `idle`. Pinned in Task 4 (e2e with a throwing `sessionStorage`).
3. **Locale switch while the avatar is live** — exactly one canvas on the new page and the avatar plays the short `wave → idle` (same session), never the walk again. Pinned in Task 4 (e2e).
4. **Theme toggle after the intro** — no canvas remount, no intro replay (phase stays `idle`). Pinned in Task 4 (e2e).
5. **A model without the expected clips or head bone** — no crash, static pose, look-at becomes a no-op. Pinned in Task 3 (unit tests on `createActions` and `prepareAvatar`).

---

## File map

| File                                                                 | Status | Responsibility                                                                         |
| -------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| `src/features/hero/canvas/avatar/avatar.config.ts`                   | modify | All tunables (adds placement, fallback, lights, look-at signs, fades)                  |
| `src/features/hero/canvas/avatar/choreography.ts`                    | create | Pure: `poseAt`, `createIntro`, `scrollPose`, `clampLook`, `lookTarget`, `avatarFrame`  |
| `src/features/hero/canvas/avatar/choreography.test.ts`               | create | Unit tests for the above                                                               |
| `src/features/hero/canvas/avatar/AvatarFallback.tsx` (+ `.test.tsx`) | create | Server `<img>` pair placed by `avatarFrame`                                            |
| `src/features/hero/canvas/avatar/avatar-model.ts` (+ `.test.ts`)     | create | Clone scene + materials, find head bone, opacity, dispose                              |
| `src/features/hero/canvas/avatar/useAvatarMixer.ts` (+ `.test.ts`)   | create | `AnimationMixer`, actions, `playClip`, `setWalkSpeed`                                  |
| `src/features/hero/canvas/avatar/AvatarMount.tsx`                    | create | In the canvas chunk: lazy import + error boundary + idle mount                         |
| `src/features/hero/canvas/avatar/Avatar.tsx`                         | create | Lazy chunk entry: load GLB, frame loop, lights, shadows                                |
| `src/features/hero/canvas/avatar/useAvatarIntro.ts`                  | create | Clock + session mode + clip edges + `data-avatar-phase`                                |
| `src/features/hero/canvas/avatar/AvatarBubble.tsx`                   | create | drei `Html` bubble                                                                     |
| `src/features/hero/canvas/avatar/useHeadLook.ts`                     | create | Damped head offset after `mixer.update`                                                |
| `src/features/hero/canvas/avatar/AvatarHitProxy.tsx`                 | create | Invisible capsule: hover cursor + click-to-wave                                        |
| `src/features/hero/canvas/graph-frame.ts`                            | modify | Export `CAMERA_FOV`                                                                    |
| `src/features/hero/canvas/HeroCanvas.tsx`                            | modify | Use `CAMERA_FOV`; `painted` state; pass `avatarBubble`                                 |
| `src/features/hero/canvas/HeroScene.tsx`                             | modify | Render `<AvatarMount>`                                                                 |
| `src/features/hero/canvas/HeroCanvasGate.tsx`                        | modify | Accept and forward `avatarBubble`                                                      |
| `src/features/hero/canvas/Graph.tsx`                                 | modify | Don't clear/overwrite `data-cursor="avatar"`                                           |
| `src/features/hero/HeroSection.tsx`                                  | modify | Render `<AvatarFallback/>`; pass `avatarBubble`                                        |
| `src/shared/animation/effects/cursor.ts` (+ test)                    | modify | React to `data-cursor="avatar"`                                                        |
| `src/shared/i18n/messages/{en,vi}.json`                              | modify | `hero.avatar.bubble`                                                                   |
| `src/app/globals.css`                                                | modify | Fallback states + bubble styles                                                        |
| `e2e/helpers/scripts.ts`                                             | modify | `splitAvatarChunks`                                                                    |
| `e2e/hero-avatar.spec.ts`                                            | create | Avatar e2e                                                                             |
| `e2e/hero-3d.spec.ts`, `e2e/hero-3d-no-webgl.spec.ts`                | modify | Budgets exclude avatar chunk, draw calls ≤ 9, leak test waits for idle, no-WebGL image |
| `e2e/hero-3d-visual.spec.ts-snapshots/*`                             | update | Baselines now include the idle image                                                   |
| `CLAUDE.md`, `docs/SPEC-phase-5b-avatar.en.md`                       | modify | Conventions + budget                                                                   |

---

### Task 1: Config and the pure choreography model

**Files:**

- Modify: `src/features/hero/canvas/avatar/avatar.config.ts`
- Modify: `src/features/hero/canvas/graph-frame.ts` (add `CAMERA_FOV`), `src/features/hero/canvas/HeroCanvas.tsx` (use it)
- Create: `src/features/hero/canvas/avatar/choreography.ts`
- Test: `src/features/hero/canvas/avatar/choreography.test.ts`

**Interfaces:**

- Produces (from `choreography.ts`):
  - `type ClipName = "walk" | "wave" | "idle"`
  - `type AvatarPhase = "enter" | "walk" | "wave" | "idle"`
  - `type IntroMode = "full" | "repeat" | "rewave" | "skip"`
  - `interface IntroPose { phase: AvatarPhase; z: number; opacity: number; clip: ClipName; fade: number; walkTimeScale: number; bubble: boolean }`
  - `const CRUISE_SPEED: number`, `const FULL_IDLE_AT: number`
  - `poseAt(t: number, mode: IntroMode): IntroPose`
  - `interface Intro { step(dt: number, morph: number): IntroPose; rewave(): boolean }`, `createIntro(mode: "full" | "repeat"): Intro`
  - `interface ScrollPose { zOffset: number; opacity: number; visible: boolean; lookAt: boolean }`, `scrollPose(morph: number): ScrollPose`
  - `clampLook(yawDeg: number, pitchDeg: number): { yaw: number; pitch: number }` (radians), `lookTarget(px: number, py: number): { yaw: number; pitch: number }`
  - `interface AvatarFrame { scale: number; feetY: number; leftPct: number }`, `avatarFrame(aspect: number): AvatarFrame`
- Produces (from `graph-frame.ts`): `const CAMERA_FOV = 45`

- [ ] **Step 1: Extend the config**

Replace the body of `AVATAR` in `src/features/hero/canvas/avatar/avatar.config.ts` with the following (keep the file's header comment as is):

```ts
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
```

- [ ] **Step 2: Export `CAMERA_FOV`**

In `src/features/hero/canvas/graph-frame.ts`, above `fitCameraZ`, add:

```ts
/** Vertical field of view of the hero camera (HeroCanvas). */
export const CAMERA_FOV = 45;
```

and change the signature to `export function fitCameraZ(aspect: number, fovDeg = CAMERA_FOV): number {`.

In `src/features/hero/canvas/HeroCanvas.tsx`, import `CAMERA_FOV` from `"./graph-frame"` and change the camera prop to `camera={{ fov: CAMERA_FOV, near: 0.1, far: 50, position: [0, 0, 9] }}`.

- [ ] **Step 3: Write the failing tests**

Create `src/features/hero/canvas/avatar/choreography.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AVATAR } from "./avatar.config";
import {
  CRUISE_SPEED,
  FULL_IDLE_AT,
  avatarFrame,
  clampLook,
  createIntro,
  lookTarget,
  poseAt,
  scrollPose
} from "./choreography";

const deg = (d: number) => (d * Math.PI) / 180;

describe("poseAt (full intro)", () => {
  it("walks, waves, then idles", () => {
    expect(poseAt(0, "full").phase).toBe("enter");
    expect(poseAt(1, "full").phase).toBe("walk");
    expect(poseAt(3, "full").phase).toBe("wave");
    expect(poseAt(5, "full").phase).toBe("idle");
  });

  it("reaches idle inside the 4.5 s acceptance window", () => {
    expect(FULL_IDLE_AT).toBeCloseTo(4.15, 5);
    expect(poseAt(4.5, "full").phase).toBe("idle");
  });

  it("fades in over timings.fadeIn", () => {
    expect(poseAt(0, "full").opacity).toBe(0);
    expect(poseAt(0.2, "full").opacity).toBeCloseTo(0.5, 5);
    expect(poseAt(0.4, "full").opacity).toBe(1);
  });

  it("moves forward continuously from start to end", () => {
    let last = -Infinity;
    for (let t = 0; t <= AVATAR.timings.walk + 0.5; t += 0.01) {
      const { z } = poseAt(t, "full");
      expect(z).toBeGreaterThanOrEqual(last - 1e-9);
      expect(z - last).toBeLessThan(0.05); // no jumps
      last = z;
    }
    expect(poseAt(0, "full").z).toBe(AVATAR.start.z);
    expect(poseAt(AVATAR.timings.walk, "full").z).toBeCloseTo(AVATAR.end.z, 5);
    expect(poseAt(10, "full").z).toBe(AVATAR.end.z);
  });

  it("cruises near the walk clip's natural 1.36 m/s", () => {
    expect(CRUISE_SPEED).toBeGreaterThan(1.3);
    expect(CRUISE_SPEED).toBeLessThan(1.5);
  });

  it("slows the steps down with the body, never below 0.6", () => {
    expect(poseAt(1, "full").walkTimeScale).toBe(AVATAR.walkTimeScale);
    const late = poseAt(AVATAR.timings.walk - 0.01, "full").walkTimeScale;
    expect(late).toBeGreaterThanOrEqual(0.6 * AVATAR.walkTimeScale);
    expect(late).toBeLessThan(AVATAR.walkTimeScale);
  });

  it("shows the bubble from bubbleIn to bubbleOut", () => {
    expect(poseAt(2.1, "full").bubble).toBe(false);
    expect(poseAt(2.3, "full").bubble).toBe(true);
    expect(poseAt(4.3, "full").bubble).toBe(true);
    expect(poseAt(4.5, "full").bubble).toBe(false);
  });

  it("crossfades with the configured durations", () => {
    expect(poseAt(3, "full").fade).toBe(AVATAR.timings.walkToWave);
    expect(poseAt(5, "full").fade).toBe(AVATAR.timings.waveToIdle);
  });
});

describe("poseAt (other modes)", () => {
  it("repeat visit: starts at wave at the end position, fading in", () => {
    const first = poseAt(0, "repeat");
    expect(first.phase).toBe("wave");
    expect(first.z).toBe(AVATAR.end.z);
    expect(first.opacity).toBe(0);
    expect(poseAt(AVATAR.repeatFadeIn, "repeat").opacity).toBe(1);
    expect(poseAt(AVATAR.timings.wave, "repeat").phase).toBe("idle");
  });

  it("rewave: wave at full opacity, then idle", () => {
    expect(poseAt(0, "rewave")).toMatchObject({ phase: "wave", opacity: 1 });
    expect(poseAt(AVATAR.timings.wave, "rewave").phase).toBe("idle");
  });

  it("scrolled-past: idle straight away", () => {
    expect(poseAt(0, "skip")).toMatchObject({
      phase: "idle",
      clip: "idle",
      opacity: 1,
      z: AVATAR.end.z
    });
  });
});

describe("createIntro", () => {
  it("runs the full intro from the first step", () => {
    const intro = createIntro("full");
    expect(intro.step(0.016, 0).phase).toBe("enter"); // first step is t = 0
    expect(intro.step(1, 0).phase).toBe("walk");
    expect(intro.step(2, 0).phase).toBe("wave");
    expect(intro.step(2, 0).phase).toBe("idle");
  });

  it("starts in idle when the visitor has already scrolled", () => {
    expect(createIntro("full").step(0, 0.4).phase).toBe("idle");
  });

  it("jumps to idle when the visitor scrolls past during the walk", () => {
    const intro = createIntro("full");
    intro.step(0, 0);
    expect(intro.step(1, 0).phase).toBe("walk");
    expect(intro.step(0.016, 0.35).phase).toBe("idle");
    expect(intro.step(0.016, 0).phase).toBe("idle"); // never replays
  });

  it("starts the repeat path at wave", () => {
    expect(createIntro("repeat").step(0, 0).phase).toBe("wave");
  });

  it("rewaves only from idle", () => {
    const intro = createIntro("full");
    intro.step(0, 0);
    expect(intro.rewave()).toBe(false); // still entering
    intro.step(5, 0);
    expect(intro.rewave()).toBe(true);
    expect(intro.step(0.016, 0).phase).toBe("wave");
    expect(intro.rewave()).toBe(false); // already waving
    expect(intro.step(AVATAR.timings.wave, 0).phase).toBe("idle");
  });
});

describe("scrollPose", () => {
  it("is neutral at the top", () => {
    expect(scrollPose(0)).toEqual({
      zOffset: 0,
      opacity: 1,
      visible: true,
      lookAt: true
    });
  });

  it("recedes and fades halfway to the hide point", () => {
    const pose = scrollPose(0.25);
    expect(pose.zOffset).toBeCloseTo((AVATAR.receded.z - AVATAR.end.z) / 2, 5);
    expect(pose.opacity).toBeCloseTo(0.5, 5);
    expect(pose.visible).toBe(true);
    expect(pose.lookAt).toBe(false);
  });

  it("hides from morph 0.5", () => {
    expect(scrollPose(0.5).visible).toBe(false);
    expect(scrollPose(1)).toMatchObject({ visible: false, opacity: 0 });
  });
});

describe("look-at", () => {
  it("clamps to ±30° yaw and ±15° pitch", () => {
    expect(clampLook(10, -5)).toEqual({ yaw: deg(10), pitch: deg(-5) });
    expect(clampLook(90, 40)).toEqual({ yaw: deg(30), pitch: deg(15) });
    expect(clampLook(-90, -40)).toEqual({ yaw: deg(-30), pitch: deg(-15) });
  });

  it("looks straight ahead at the slot centre and saturates at the edges", () => {
    expect(lookTarget(0, 0)).toEqual({ yaw: 0, pitch: 0 });
    const edge = lookTarget(1, 1);
    expect(Math.abs(edge.yaw)).toBeCloseTo(deg(30), 5);
    expect(Math.abs(edge.pitch)).toBeCloseTo(deg(15), 5);
  });
});

describe("avatarFrame", () => {
  // Hand-computed: GRAPH_WIDTH = 7.17, tan(22.5°) = 0.414214, FIT_FRACTION 0.85.
  it("mobile slot (4/3)", () => {
    const frame = avatarFrame(4 / 3);
    expect(frame.scale).toBeCloseTo(2.0592, 3);
    expect(frame.feetY).toBeCloseTo(-1.7503, 3);
    expect(frame.leftPct).toBeCloseTo(59.0, 1);
  });

  it("desktop slot (7/8)", () => {
    const frame = avatarFrame(7 / 8);
    expect(frame.scale).toBeCloseTo(3.4238, 3);
    expect(frame.leftPct).toBeCloseTo(58.25, 1);
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/features/hero/canvas/avatar/choreography.test.ts`
Expected: FAIL — `Failed to resolve import "./choreography"`.

- [ ] **Step 5: Implement `choreography.ts`**

Create `src/features/hero/canvas/avatar/choreography.ts`:

```ts
import { clamp } from "@/shared/lib/math";
import { CAMERA_FOV, fitCameraZ } from "../graph-frame";
import { AVATAR } from "./avatar.config";

// Pure model of the avatar's motion (spec B.5/B.6/B.7). No three.js: the
// frame loop in Avatar.tsx evaluates it and applies the result.

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

export function avatarFrame(aspect: number): AvatarFrame {
  const depth = fitCameraZ(aspect) - AVATAR.end.z;
  const visibleH = 2 * depth * Math.tan(toRad(CAMERA_FOV / 2));
  return {
    scale: (AVATAR.screenHeight * visibleH) / AVATAR.height,
    feetY: visibleH * (AVATAR.feetFromBottom - 0.5),
    leftPct: 50 + (AVATAR.end.x / ((visibleH / 2) * aspect)) * 50
  };
}
```

(`|| 0` in `lookTarget` normalises `-0` so `toEqual({ yaw: 0, pitch: 0 })` holds.)

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/features/hero/canvas/avatar/choreography.test.ts src/features/hero/canvas/graph-frame.test.ts`
Expected: PASS. If an `avatarFrame` number is off, recompute it by hand from `fitCameraZ` before touching the implementation: the test values are derived independently.

- [ ] **Step 7: Lint, typecheck, commit**

```bash
pnpm lint && pnpm typecheck
git add src/features/hero/canvas/avatar/avatar.config.ts src/features/hero/canvas/avatar/choreography.ts src/features/hero/canvas/avatar/choreography.test.ts src/features/hero/canvas/graph-frame.ts src/features/hero/canvas/HeroCanvas.tsx
git commit -m "feat(avatar): pure choreography, scroll and placement model

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Server-rendered fallback images driven by CSS

**Files:**

- Create: `src/features/hero/canvas/avatar/AvatarFallback.tsx`
- Test: `src/features/hero/canvas/avatar/AvatarFallback.test.tsx`
- Modify: `src/features/hero/HeroSection.tsx`, `src/app/globals.css`, `CLAUDE.md`
- Create: `e2e/hero-avatar.spec.ts` (fallback describes only for now)
- Modify: `e2e/hero-3d-no-webgl.spec.ts`
- Update: `e2e/hero-3d-visual.spec.ts-snapshots/*.png`

**Interfaces:**

- Consumes: `AVATAR.fallback`, `AVATAR.slotAspect`, `AVATAR.feetFromBottom`, `AVATAR.screenHeight`, `avatarFrame(aspect)` from Task 1.
- Produces: `AvatarFallback()` (server component, no props); DOM contract `.hero-avatar-fallback > img[data-avatar-pose="wave"|"idle"]`; CSS reads `data-gate`, `data-tier` on `[data-hero-graph]` and `data-avatar-phase`, `data-avatar-failed` on `#hero-canvas-slot`.

- [ ] **Step 1: Write the failing unit test**

Create `src/features/hero/canvas/avatar/AvatarFallback.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AVATAR } from "./avatar.config";
import { AvatarFallback } from "./AvatarFallback";
import { avatarFrame } from "./choreography";

function render() {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(<AvatarFallback />);
  return host.querySelector<HTMLElement>(".hero-avatar-fallback")!;
}

describe("AvatarFallback", () => {
  it("renders a decorative wave/idle image pair with fixed sizes", () => {
    const root = render();
    const images = [...root.querySelectorAll("img")];
    expect(images.map((img) => img.dataset.avatarPose)).toEqual([
      "wave",
      "idle"
    ]);
    for (const img of images) {
      const pose = img.dataset.avatarPose as "wave" | "idle";
      expect(img.getAttribute("alt")).toBe("");
      expect(img.getAttribute("src")).toBe(AVATAR.fallback[pose].src);
      expect(img.getAttribute("width")).toBe(
        String(AVATAR.fallback[pose].width)
      );
      expect(img.getAttribute("height")).toBe(
        String(AVATAR.fallback[pose].height)
      );
      expect(img.getAttribute("decoding")).toBe("async");
      expect(img.getAttribute("fetchpriority")).toBe("low");
    }
  });

  it("stands where the 3D avatar would, using the shared placement math", () => {
    const style = render().style;
    const left = (aspect: number) =>
      `${avatarFrame(aspect).leftPct.toFixed(2)}%`;
    expect(style.getPropertyValue("--avatar-left-sm")).toBe(
      left(AVATAR.slotAspect.sm)
    );
    expect(style.getPropertyValue("--avatar-left-md")).toBe(
      left(AVATAR.slotAspect.md)
    );
    expect(style.getPropertyValue("--avatar-bottom")).toBe("15.00%");
    expect(style.getPropertyValue("--avatar-h-md")).toBe("70.00%");
    expect(style.getPropertyValue("--avatar-h-sm")).toBe("55.00%");
    expect(style.getPropertyValue("--avatar-swap")).toBe("2s");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run src/features/hero/canvas/avatar/AvatarFallback.test.tsx`
Expected: FAIL — cannot resolve `./AvatarFallback`.

- [ ] **Step 3: Implement `AvatarFallback.tsx`**

```tsx
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
```

If `pnpm lint` reports `@next/next/no-img-element`, add `{/* eslint-disable-next-line @next/next/no-img-element -- spec B.8: plain <img>, fixed size, fetchpriority low */}` above the `<img>`.

- [ ] **Step 4: Run the unit test to verify it passes**

Run: `pnpm exec vitest run src/features/hero/canvas/avatar/AvatarFallback.test.tsx`
Expected: PASS.

- [ ] **Step 5: Render it in the slot**

In `src/features/hero/HeroSection.tsx`, import `AvatarFallback` from `"./canvas/avatar/AvatarFallback"` and render it after the two static graphs, before the gate:

```tsx
            <HeroGraphStatic state="chaos" />
            <HeroGraphStatic state="layered" />
            <AvatarFallback />
            <HeroCanvasGate />
```

(The canvas is absolutely positioned on top and transparent; on desktop the fallback is `display: none` whenever the 3D avatar can stand there.)

- [ ] **Step 6: Add the CSS states**

In `src/app/globals.css`, directly after the `[data-hero-graph][data-gate="fallback"] .hero-graph-canvas { … }` block, add:

```css
/* Hero avatar fallback (features/hero/canvas/avatar/AvatarFallback). Inline
   custom properties carry the placement from avatar.config. CSS alone picks
   the pose: idle by default (no JS, reduced motion, gate fallback, failed 3D
   load, 3D already greeted); wave → idle on Low; display: none on desktop,
   where the 3D avatar stands in the same spot. The inactive pose is hidden
   with opacity 0 + visibility hidden (CLAUDE.md exception). */
.hero-avatar-fallback {
  position: absolute;
  left: var(--avatar-left-sm);
  bottom: var(--avatar-bottom);
  height: var(--avatar-h-sm);
  pointer-events: none;
}

.hero-avatar-fallback img {
  position: absolute;
  bottom: 0;
  left: 0;
  width: auto;
  max-width: none;
}

.hero-avatar-fallback [data-avatar-pose="idle"] {
  height: 100%;
  translate: calc(-100% * var(--avatar-idle-anchor)) 0;
}

.hero-avatar-fallback [data-avatar-pose="wave"] {
  height: calc(100% * var(--avatar-wave-scale));
  translate: calc(-100% * var(--avatar-wave-anchor)) 0;
  opacity: 0;
  visibility: hidden;
}

@media (min-width: 768px) {
  .hero-avatar-fallback {
    left: var(--avatar-left-md);
    height: var(--avatar-h-md);
  }
}

@media (scripting: enabled) and (prefers-reduced-motion: no-preference) {
  .hero-avatar-fallback {
    animation: hero-avatar-bob 4s ease-in-out var(--avatar-swap) infinite;
  }

  .hero-avatar-fallback [data-avatar-pose="wave"] {
    opacity: 1;
    visibility: visible;
    animation: hero-avatar-pose-out 0s var(--avatar-swap) forwards;
  }

  .hero-avatar-fallback [data-avatar-pose="idle"] {
    opacity: 0;
    visibility: hidden;
    animation: hero-avatar-pose-in 0s var(--avatar-swap) forwards;
  }
}

/* Same as DESKTOP_QUERY (shared/animation/media.ts): the 3D avatar takes the
   spot unless the canvas runs at Low. */
@media (scripting: enabled) and (prefers-reduced-motion: no-preference) and (min-width: 768px) and (hover: hover) and (pointer: fine) {
  [data-hero-graph]:not([data-tier="low"]) .hero-avatar-fallback {
    display: none;
  }
}

/* Static idle. Must stay after the rules above (equal specificity). */
[data-hero-graph][data-gate="fallback"] .hero-avatar-fallback,
#hero-canvas-slot[data-avatar-failed] .hero-avatar-fallback {
  display: block;
}

[data-hero-graph][data-gate="fallback"] .hero-avatar-fallback,
#hero-canvas-slot[data-avatar-failed] .hero-avatar-fallback,
#hero-canvas-slot[data-avatar-phase] .hero-avatar-fallback,
[data-hero-graph][data-gate="fallback"] .hero-avatar-fallback img,
#hero-canvas-slot[data-avatar-failed] .hero-avatar-fallback img,
#hero-canvas-slot[data-avatar-phase] .hero-avatar-fallback img {
  animation: none;
}

[data-hero-graph][data-gate="fallback"] [data-avatar-pose="wave"],
#hero-canvas-slot[data-avatar-failed] [data-avatar-pose="wave"],
#hero-canvas-slot[data-avatar-phase] [data-avatar-pose="wave"] {
  opacity: 0;
  visibility: hidden;
}

[data-hero-graph][data-gate="fallback"] [data-avatar-pose="idle"],
#hero-canvas-slot[data-avatar-failed] [data-avatar-pose="idle"],
#hero-canvas-slot[data-avatar-phase] [data-avatar-pose="idle"] {
  opacity: 1;
  visibility: visible;
}

@keyframes hero-avatar-pose-out {
  to {
    opacity: 0;
    visibility: hidden;
  }
}

@keyframes hero-avatar-pose-in {
  to {
    opacity: 1;
    visibility: visible;
  }
}

@keyframes hero-avatar-bob {
  50% {
    translate: 0 -2px;
  }
}
```

- [ ] **Step 7: Write the fallback e2e tests**

Create `e2e/hero-avatar.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";

const graph = (page: Page) => page.locator("[data-hero-graph]");
const pose = (page: Page, name: "wave" | "idle") =>
  page.locator(`#hero-canvas-slot [data-avatar-pose="${name}"]`);
const isGlb = (url: string) => url.endsWith("/models/avatar.glb");

function trackGlb(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (request) => {
    if (isGlb(request.url())) urls.push(request.url());
  });
  return urls;
}

test.describe("avatar fallback without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("shows the idle image", async ({ page }) => {
    await page.goto("/en");
    await expect(pose(page, "idle")).toBeVisible();
    await expect(pose(page, "wave")).toBeHidden();
  });
});

test.describe("avatar fallback with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("never requests avatar.glb and shows the static idle image", async ({
    page
  }) => {
    const glb = trackGlb(page);
    await page.goto("/en");
    await expect(graph(page)).toHaveAttribute("data-gate", "fallback");
    await expect(pose(page, "idle")).toBeVisible();
    await expect(pose(page, "wave")).toBeHidden();
    await page.waitForTimeout(3000);
    await expect(pose(page, "idle")).toBeVisible();
    expect(glb).toEqual([]);
  });
});

test.describe("avatar fallback on mobile (Low tier)", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });

  test("never downloads avatar.glb; waves, then idles", async ({ page }) => {
    const glb = trackGlb(page);
    await page.goto("/en");
    await expect(pose(page, "wave")).toBeVisible();
    await expect(pose(page, "idle")).toBeHidden();
    await page.evaluate(() => window.scrollBy(0, 40));
    await expect(graph(page)).toHaveAttribute("data-gate", "live", {
      timeout: 15_000
    });
    await expect(pose(page, "idle")).toBeVisible({ timeout: 4_000 });
    await expect(pose(page, "wave")).toBeHidden();
    await page.waitForTimeout(1000);
    expect(glb).toEqual([]);
  });

  test("the fallback image is smaller than the h1", async ({ page }) => {
    await page.goto("/en");
    const area = (selector: string) =>
      page.locator(selector).evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.width * r.height;
      });
    const h1 = await area("#hero-title");
    expect(
      await area('#hero-canvas-slot [data-avatar-pose="wave"]')
    ).toBeLessThan(h1);
    expect(
      await area('#hero-canvas-slot [data-avatar-pose="idle"]')
    ).toBeLessThan(h1);
  });
});

test.describe("avatar fallback on desktop", () => {
  test("is not shown while the 3D avatar can stand there", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator(".hero-avatar-fallback")).toBeHidden();
    await expect(graph(page)).toHaveAttribute("data-gate", "live", {
      timeout: 15_000
    });
    await expect(page.locator(".hero-avatar-fallback")).toBeHidden();
  });
});
```

Append to `e2e/hero-3d-no-webgl.spec.ts`:

```ts
test("without WebGL the avatar is the static idle image", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("[data-hero-graph]")).toHaveAttribute(
    "data-gate",
    "fallback"
  );
  await expect(
    page.locator('#hero-canvas-slot [data-avatar-pose="idle"]')
  ).toBeVisible();
  await expect(
    page.locator('#hero-canvas-slot [data-avatar-pose="wave"]')
  ).toBeHidden();
});
```

- [ ] **Step 8: Run the e2e tests**

Run: `pnpm build && pnpm exec playwright test e2e/hero-avatar.spec.ts e2e/hero-3d-no-webgl.spec.ts e2e/hero-3d.spec.ts -g "fallback|LCP|without WebGL|placeholder|reduced motion"`
Expected: PASS. The existing mobile LCP test (`expect(["H1","P"]).toContain(lcp.tag)` and `inSlot === false`) must still pass now that an image sits in the slot. If it fails, lower `AVATAR.fallback.heightSm` (e.g. 0.45) and rerun.

- [ ] **Step 9: Visually check the alignment, then update the snapshots**

Run `pnpm start` (after the build) and open `/en` at 390 px wide with reduced motion emulated (DevTools → Rendering). The idle figure's feet should sit near the bottom of the graph area, slightly right of centre. Then emulate no reduced motion and reload: the wave figure's body must line up with the idle figure when it swaps at 2 s. If the waving body is offset horizontally, adjust `fallback.wave.anchorX` (feet centre / image width); if it looks bigger or smaller, adjust `fallback.wave.scale`. Record the final values in the config.

Then update the local-only visual baselines (they now include the idle image) and look at each PNG before committing:

```bash
pnpm exec playwright test e2e/hero-3d-visual.spec.ts --update-snapshots
```

- [ ] **Step 10: Document the CSS exception**

In `CLAUDE.md`, in the bullet that starts "Effects never hide or move content…", change "The only exceptions: the inactive half of the hero graph's two-state SVG/caption toggle (`[data-graph-state]` / `[data-caption-line]`), hidden with `opacity: 0; visibility: hidden`, and `.hero-graph-canvas`, which JS creates only after the gate mounts it." to:

```markdown
The only exceptions: the inactive half of the hero graph's two-state SVG/caption toggle (`[data-graph-state]` / `[data-caption-line]`) and of the avatar fallback's wave/idle pair (`[data-avatar-pose]`), hidden with `opacity: 0; visibility: hidden`; `.hero-graph-canvas` and `.hero-avatar-bubble`, which JS creates; and `.hero-avatar-fallback`, which is `display: none` on desktop because the 3D avatar stands in its place.
```

- [ ] **Step 11: Lint, typecheck, unit tests, commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add src/features/hero/canvas/avatar/AvatarFallback.tsx src/features/hero/canvas/avatar/AvatarFallback.test.tsx src/features/hero/canvas/avatar/avatar.config.ts src/features/hero/HeroSection.tsx src/app/globals.css e2e/hero-avatar.spec.ts e2e/hero-3d-no-webgl.spec.ts e2e/hero-3d-visual.spec.ts-snapshots CLAUDE.md
git commit -m "feat(avatar): CSS-driven fallback images for Low/Off tiers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The `hero-avatar` chunk: load, place, light, budget

**Files:**

- Create: `src/features/hero/canvas/avatar/avatar-model.ts`, `avatar-model.test.ts`
- Create: `src/features/hero/canvas/avatar/useAvatarMixer.ts`, `useAvatarMixer.test.ts`
- Create: `src/features/hero/canvas/avatar/AvatarMount.tsx`, `src/features/hero/canvas/avatar/Avatar.tsx`
- Modify: `src/features/hero/canvas/HeroCanvas.tsx`, `src/features/hero/canvas/HeroScene.tsx`
- Modify: `e2e/helpers/scripts.ts`, `e2e/hero-3d.spec.ts`, `e2e/hero-avatar.spec.ts`
- Modify: `CLAUDE.md`, `docs/SPEC-phase-5b-avatar.en.md`

**Interfaces:**

- Consumes: `AVATAR`, `avatarFrame`, `ClipName` (Task 1); `useGraphColors` (`palette.app`, `palette.version`); `afterLoadIdle` from `../schedule`.
- Produces:
  - `avatar-model.ts`: `interface AvatarModel { root: Object3D; materials: Material[]; head: Object3D | null; headAnimated: boolean }`, `prepareAvatar(gltf: { scene: Object3D; animations: AnimationClip[] }): AvatarModel`, `setOpacity(materials: readonly Material[], opacity: number): void`, `disposeAvatar(model: AvatarModel): void`
  - `useAvatarMixer.ts`: `type AvatarActions = Partial<Record<ClipName, AnimationAction>>`, `createActions(mixer: AnimationMixer, clips: readonly AnimationClip[]): AvatarActions`, `playClip(actions: AvatarActions, from: ClipName | null, to: ClipName, fade: number): void`, `setWalkSpeed(actions: AvatarActions, timeScale: number): void`, `useAvatarMixer(root: Object3D, clips: AnimationClip[]): { mixer: AnimationMixer; actions: AvatarActions }`
  - `AvatarMount({ tier, slot, painted, bubble }: { tier: RenderTier; slot: HTMLElement; painted: boolean; bubble: string })`
  - `Avatar` default export, props `{ tier: RenderTier; slot: HTMLElement; bubble: string }`
  - `HeroScene` props gain `painted: boolean; avatarBubble: string`; `HeroCanvasProps` gains `avatarBubble: string` (Task 4 wires the value; this task passes `""`).
  - DOM: `#hero-canvas-slot[data-avatar-failed]` when the chunk or GLB fails.
  - e2e: `splitAvatarChunks(responses: Response[]): Promise<{ avatar: Response[]; rest: Response[] }>`

- [ ] **Step 1: Write the failing model and mixer tests**

Create `src/features/hero/canvas/avatar/avatar-model.test.ts`:

```ts
import {
  AnimationClip,
  Bone,
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  QuaternionKeyframeTrack
} from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AVATAR } from "./avatar.config";
import { disposeAvatar, prepareAvatar, setOpacity } from "./avatar-model";

function fakeGltf({ head = true, headTrack = true } = {}) {
  const shared = new MeshStandardMaterial();
  const scene = new Group();
  scene.add(
    new Mesh(new BoxGeometry(), shared),
    new Mesh(new BoxGeometry(), shared)
  );
  if (head) {
    const bone = new Bone();
    bone.name = AVATAR.HEAD_BONE;
    scene.add(bone);
  }
  const tracks = headTrack
    ? [
        new QuaternionKeyframeTrack(
          `${AVATAR.HEAD_BONE}.quaternion`,
          [0],
          [0, 0, 0, 1]
        )
      ]
    : [];
  return { scene, animations: [new AnimationClip("idle", 1, tracks)], shared };
}

afterEach(() => vi.restoreAllMocks());

describe("prepareAvatar", () => {
  it("clones the scene and gives the clone its own materials (one per shared original)", () => {
    const gltf = fakeGltf();
    const model = prepareAvatar(gltf);
    expect(model.root).not.toBe(gltf.scene);
    expect(model.materials).toHaveLength(1);
    expect(model.materials[0]).not.toBe(gltf.shared);
    const meshes = model.root.children.filter(
      (c): c is Mesh => (c as Mesh).isMesh
    );
    expect(meshes.every((m) => m.material === model.materials[0])).toBe(true);
  });

  it("finds the head bone and whether the clips animate it", () => {
    expect(prepareAvatar(fakeGltf()).head?.name).toBe(AVATAR.HEAD_BONE);
    expect(prepareAvatar(fakeGltf()).headAnimated).toBe(true);
    expect(prepareAvatar(fakeGltf({ headTrack: false })).headAnimated).toBe(
      false
    );
  });

  it("tolerates a model without the head bone", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(prepareAvatar(fakeGltf({ head: false })).head).toBeNull();
  });
});

describe("setOpacity", () => {
  it("is transparent only below 1 and flags a recompile only on change", () => {
    const { materials } = prepareAvatar(fakeGltf());
    const material = materials[0]!;
    const v0 = material.version;
    setOpacity(materials, 0.5);
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBe(0.5);
    const v1 = material.version;
    expect(v1).toBeGreaterThan(v0);
    setOpacity(materials, 0.6);
    expect(material.version).toBe(v1);
    setOpacity(materials, 1);
    expect(material.transparent).toBe(false);
  });
});

describe("disposeAvatar", () => {
  it("disposes the cloned materials only", () => {
    const gltf = fakeGltf();
    const model = prepareAvatar(gltf);
    const own = vi.spyOn(model.materials[0]!, "dispose");
    const shared = vi.spyOn(gltf.shared, "dispose");
    disposeAvatar(model);
    expect(own).toHaveBeenCalled();
    expect(shared).not.toHaveBeenCalled();
  });
});
```

Create `src/features/hero/canvas/avatar/useAvatarMixer.test.ts`:

```ts
import {
  AnimationClip,
  AnimationMixer,
  LoopOnce,
  NumberKeyframeTrack,
  Object3D
} from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createActions, playClip, setWalkSpeed } from "./useAvatarMixer";

const clip = (name: string, duration: number) =>
  new AnimationClip(name, duration, [
    new NumberKeyframeTrack(".position[x]", [0, duration], [0, 1])
  ]);

function setup() {
  const mixer = new AnimationMixer(new Object3D());
  const actions = createActions(mixer, [
    clip("walk", 1),
    clip("wave", 2),
    clip("idle", 2)
  ]);
  return { mixer, actions };
}

afterEach(() => vi.restoreAllMocks());

describe("createActions", () => {
  it("plays the wave once and holds its last frame", () => {
    const { actions } = setup();
    expect(actions.wave?.loop).toBe(LoopOnce);
    expect(actions.wave?.clampWhenFinished).toBe(true);
  });

  it("leaves out missing clips and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const actions = createActions(new AnimationMixer(new Object3D()), [
      clip("walk", 1)
    ]);
    expect(actions.wave).toBeUndefined();
    expect(actions.idle).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });
});

describe("playClip", () => {
  it("crossfades from the current clip", () => {
    const { mixer, actions } = setup();
    playClip(actions, null, "walk", 0);
    mixer.update(0.1);
    expect(actions.walk!.getEffectiveWeight()).toBe(1);
    playClip(actions, "walk", "wave", 0.3);
    mixer.update(0.5);
    expect(actions.walk!.getEffectiveWeight()).toBe(0);
    expect(actions.wave!.getEffectiveWeight()).toBe(1);
  });

  it("is a no-op for a missing clip", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const mixer = new AnimationMixer(new Object3D());
    const actions = createActions(mixer, [clip("walk", 1)]);
    expect(() => playClip(actions, "walk", "wave", 0.3)).not.toThrow();
  });
});

describe("setWalkSpeed", () => {
  it("sets the walk clip's time scale", () => {
    const { actions } = setup();
    setWalkSpeed(actions, 0.7);
    expect(actions.walk!.timeScale).toBe(0.7);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm exec vitest run src/features/hero/canvas/avatar/avatar-model.test.ts src/features/hero/canvas/avatar/useAvatarMixer.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `avatar-model.ts`**

```ts
import type {
  AnimationClip,
  Material,
  Mesh,
  Object3D,
  SkinnedMesh
} from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { AVATAR } from "./avatar.config";

export interface AvatarModel {
  root: Object3D;
  /** Cloned per mount, so opacity changes never leak into another mount. */
  materials: Material[];
  head: Object3D | null;
  /** False when no clip writes the head's rotation (look-at must reset it). */
  headAnimated: boolean;
}

// A view transition can show two Home pages at once and an Object3D has one
// parent, so every mount gets its own skeleton-aware clone. Geometries and
// textures stay shared with the loader cache.
export function prepareAvatar(gltf: {
  scene: Object3D;
  animations: AnimationClip[];
}): AvatarModel {
  const root = clone(gltf.scene);
  const copies = new Map<Material, Material>();
  const own = (material: Material) => {
    let copy = copies.get(material);
    if (!copy) {
      copy = material.clone();
      copies.set(material, copy);
    }
    return copy;
  };
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    // Bind-pose bounds go stale while animating.
    if ((mesh as SkinnedMesh).isSkinnedMesh) mesh.frustumCulled = false;
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(own)
      : own(mesh.material);
  });

  const head = root.getObjectByName(AVATAR.HEAD_BONE) ?? null;
  if (!head && process.env.NODE_ENV !== "production") {
    console.warn(`[hero-avatar] head bone "${AVATAR.HEAD_BONE}" not found`);
  }
  const headTrack = `${AVATAR.HEAD_BONE}.quaternion`;
  return {
    root,
    materials: [...copies.values()],
    head,
    headAnimated: gltf.animations.some((clip) =>
      clip.tracks.some((track) => track.name === headTrack)
    )
  };
}

export function setOpacity(materials: readonly Material[], opacity: number) {
  const transparent = opacity < 1;
  for (const material of materials) {
    if (material.transparent !== transparent) {
      material.transparent = transparent; // only while fading (sorting)
      material.needsUpdate = true;
    }
    material.opacity = opacity;
  }
}

export function disposeAvatar(model: AvatarModel) {
  for (const material of model.materials) material.dispose();
}
```

- [ ] **Step 4: Implement `useAvatarMixer.ts`**

```ts
import { useEffect, useMemo } from "react";
import {
  AnimationClip,
  AnimationMixer,
  LoopOnce,
  type AnimationAction,
  type Object3D
} from "three";
import { AVATAR } from "./avatar.config";
import type { ClipName } from "./choreography";

export type AvatarActions = Partial<Record<ClipName, AnimationAction>>;

const NAMES = Object.keys(AVATAR.CLIPS) as ClipName[];

export function createActions(
  mixer: AnimationMixer,
  clips: readonly AnimationClip[]
): AvatarActions {
  const actions: AvatarActions = {};
  for (const name of NAMES) {
    const clip = AnimationClip.findByName(
      clips as AnimationClip[],
      AVATAR.CLIPS[name]
    );
    if (!clip) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[hero-avatar] clip "${AVATAR.CLIPS[name]}" missing; static pose`
        );
      }
      continue;
    }
    actions[name] = mixer.clipAction(clip);
  }
  if (actions.wave) {
    actions.wave.setLoop(LoopOnce, 1);
    actions.wave.clampWhenFinished = true;
  }
  return actions;
}

export function playClip(
  actions: AvatarActions,
  from: ClipName | null,
  to: ClipName,
  fade: number
) {
  const next = actions[to];
  if (!next) return;
  next.reset().setEffectiveWeight(1).play();
  const previous = from ? actions[from] : undefined;
  if (!previous || previous === next) return;
  if (fade > 0) previous.crossFadeTo(next, fade, false);
  else previous.stop();
}

export function setWalkSpeed(actions: AvatarActions, timeScale: number) {
  if (actions.walk) actions.walk.timeScale = timeScale;
}

export function useAvatarMixer(root: Object3D, clips: AnimationClip[]) {
  const mixer = useMemo(() => new AnimationMixer(root), [root]);
  const actions = useMemo(() => createActions(mixer, clips), [mixer, clips]);
  useEffect(
    () => () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    },
    [mixer, root]
  );
  return { mixer, actions };
}
```

- [ ] **Step 5: Run the unit tests to verify they pass**

Run: `pnpm exec vitest run src/features/hero/canvas/avatar/`
Expected: PASS.

- [ ] **Step 6: Create `AvatarMount.tsx` (lives in the canvas chunk; keep it tiny)**

```tsx
import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useState,
  type ReactNode
} from "react";
import type { RenderTier } from "../../quality/detect-tier";
import { afterLoadIdle } from "../schedule";

// The avatar's own chunk (CLAUDE.md: the canvas chunk has ~0.2 KB headroom).
const Avatar = lazy(
  () => import(/* webpackChunkName: "hero-avatar" */ "./Avatar")
);

function markFailed(slot: HTMLElement, failed: boolean) {
  slot.toggleAttribute("data-avatar-failed", failed);
}

// A failed chunk or GLB must not take the graph down with it: the gate's
// CanvasBoundary would switch the whole canvas off. CSS then shows the
// static idle image (data-avatar-failed).
class AvatarBoundary extends Component<
  { slot: HTMLElement; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    markFailed(this.props.slot, true);
    if (process.env.NODE_ENV !== "production") {
      console.warn("[hero-avatar] failed, showing the static image", error);
    }
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Mounts once the canvas has painted and the main thread is idle (spec B.3,
// B.9 long-task rule), and only if the tier is High or Medium then. After
// that it stays mounted: Avatar fades itself out on a drop to Low.
export function AvatarMount({
  tier,
  slot,
  painted,
  bubble
}: {
  tier: RenderTier;
  slot: HTMLElement;
  painted: boolean;
  bubble: string;
}) {
  const [mounted, setMounted] = useState(false);
  const eligible = tier !== "low";

  useEffect(() => {
    if (!painted || !eligible || mounted) return;
    return afterLoadIdle(() => setMounted(true));
  }, [painted, eligible, mounted]);

  useEffect(() => () => markFailed(slot, false), [slot]);

  if (!mounted) return null;
  return (
    <AvatarBoundary slot={slot}>
      <Suspense fallback={null}>
        <Avatar tier={tier} slot={slot} bubble={bubble} />
      </Suspense>
    </AvatarBoundary>
  );
}
```

- [ ] **Step 7: Create the first `Avatar.tsx` (static idle at `end`; Task 4 adds the intro)**

```tsx
import { ContactShadows } from "@react-three/drei/core/ContactShadows";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { DirectionalLight } from "three";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { RenderTier } from "../../quality/detect-tier";
import { useGraphColors } from "../useGraphColors";
import { AVATAR } from "./avatar.config";
import { disposeAvatar, prepareAvatar } from "./avatar-model";
import { avatarFrame } from "./choreography";
import { playClip, useAvatarMixer } from "./useAvatarMixer";

// three's own loader + meshopt; drei's useGLTF would bundle DRACOLoader too.
function withMeshopt(loader: GLTFLoader) {
  loader.setMeshoptDecoder(MeshoptDecoder);
}

export interface AvatarProps {
  tier: RenderTier;
  slot: HTMLElement;
  bubble: string;
}

export default function Avatar({ tier }: AvatarProps) {
  const gltf = useLoader(GLTFLoader, AVATAR.url, withMeshopt);
  const model = useMemo(() => prepareAvatar(gltf), [gltf]);
  const { mixer, actions } = useAvatarMixer(model.root, gltf.animations);
  const palette = useGraphColors();
  const size = useThree((state) => state.size);
  const frame = useMemo(
    () => avatarFrame(size.width / Math.max(1, size.height)),
    [size]
  );
  const rimRef = useRef<DirectionalLight>(null);
  const paletteVersion = useRef(-1);

  useEffect(() => () => disposeAvatar(model), [model]);
  useEffect(() => playClip(actions, null, "idle", 0), [actions]);

  useFrame((_, delta) => {
    const rim = rimRef.current;
    if (rim && paletteVersion.current !== palette.version) {
      rim.color.copy(palette.app); // --accent, follows the theme
      paletteVersion.current = palette.version;
    }
    mixer.update(Math.min(delta, 0.1));
  });

  return (
    <group
      position={[AVATAR.end.x, frame.feetY, AVATAR.end.z]}
      scale={frame.scale}
    >
      <primitive object={model.root} />
      <directionalLight
        ref={rimRef}
        position={[...AVATAR.rim.position]}
        intensity={AVATAR.rim.intensity}
      />
      {tier === "high" && <ContactShadows {...AVATAR.contactShadows} />}
    </group>
  );
}
```

- [ ] **Step 8: Wire `painted` and the mount into the canvas**

In `src/features/hero/canvas/HeroCanvas.tsx`:

- add `avatarBubble: string;` to `HeroCanvasProps` and destructure it;
- add `const [painted, setPainted] = useState(false);` next to the other state;
- in `onCreated`, replace `requestAnimationFrame(() => onLive());` with:

```tsx
requestAnimationFrame(() => {
  onLive();
  setPainted(true);
});
```

- render `<HeroScene tier={tier.level} slot={slot} painted={painted} avatarBubble={avatarBubble} />`.

Replace `src/features/hero/canvas/HeroScene.tsx` with:

```tsx
import { tierFeatures, type RenderTier } from "../quality/detect-tier";
import { AvatarMount } from "./avatar/AvatarMount";
import { CameraRig } from "./CameraRig";
import { Graph } from "./Graph";

export function HeroScene({
  tier,
  slot,
  painted,
  avatarBubble
}: {
  tier: RenderTier;
  slot: HTMLElement;
  painted: boolean;
  avatarBubble: string;
}) {
  return (
    <>
      <CameraRig parallax={tierFeatures(tier).parallax} slot={slot} />
      <Graph tier={tier} slot={slot} />
      <AvatarMount
        tier={tier}
        slot={slot}
        painted={painted}
        bubble={avatarBubble}
      />
    </>
  );
}
```

In `src/features/hero/canvas/HeroCanvasGate.tsx`, pass `avatarBubble=""` to `<HeroCanvas … />` for now (Task 4 replaces it with the translated label).

- [ ] **Step 9: Build and check the chunk split**

```bash
pnpm build
ls .next/static/chunks | grep hero-avatar
grep -l "KHR_mesh_quantization" .next/static/chunks/*.js
```

Expected: one `hero-avatar.<hash>.js`; the `grep -l` lists only `hero-avatar.*.js` (GLTFLoader is not in the canvas chunk). If `grep -l` also lists another hashed chunk, webpack split a vendor chunk out of the avatar import — that is fine: `splitAvatarChunks` (next step) counts any chunk containing GLTFLoader as avatar code.

- [ ] **Step 10: Add the e2e chunk helper and split the budgets**

Append to `e2e/helpers/scripts.ts`:

```ts
// The avatar's lazy chunk (webpackChunkName "hero-avatar") and any vendor
// chunk webpack split out of it, recognised by GLTFLoader's extension name.
export async function splitAvatarChunks(
  responses: Response[]
): Promise<{ avatar: Response[]; rest: Response[] }> {
  const avatar: Response[] = [];
  const rest: Response[] = [];
  for (const response of responses) {
    const named = /\/hero-avatar\.[^/]+\.js$/.test(
      new URL(response.url()).pathname
    );
    const isAvatar =
      named || (await response.text()).includes("KHR_mesh_quantization");
    (isAvatar ? avatar : rest).push(response);
  }
  return { avatar, rest };
}
```

In `e2e/hero-3d.spec.ts`:

- import `splitAvatarChunks` from `./helpers/scripts`;
- in "the 3D chunk stays under 250 KB gzip and initial JS under 150 KB", replace `const lazyBytes = await gzipBytes(scripts.lazy());` with:

```ts
const { rest: canvasChunks } = await splitAvatarChunks(scripts.lazy());
const lazyBytes = await gzipBytes(canvasChunks);
```

and replace `expect(scripts.lazy().length).toBeGreaterThan(0);` with `expect(canvasChunks.length).toBeGreaterThan(0);`.

- in "draws in at most 6 draw calls": rename it to "draws in at most 9 draw calls with the avatar" and change `toBeLessThanOrEqual(6)` to `toBeLessThanOrEqual(9)`. (Task 4 adds a wait for `data-avatar-phase="idle"` so the count includes the avatar.)
- in "the graph geometry follows the morph while the slot is still on screen": change the first poll's `.toBe(3)` to `.toBeGreaterThanOrEqual(3)` (the avatar adds 1–2 calls). Change the second poll's `.toBe(2)` to `.toBeLessThanOrEqual(4)` — until Task 5 hides the avatar on scroll it is still drawn there. Task 5 restores `.toBe(2)`.

Add to `e2e/hero-avatar.spec.ts` (merge the imports with the existing ones):

```ts
import {
  collectConsoleProblems,
  gzipBytes,
  splitAvatarChunks,
  trackScripts
} from "./helpers/scripts";

// Measured in Task 3 + 3 KB (CLAUDE.md, design doc D2).
const AVATAR_BUDGET_BYTES = 40 * 1024;

test.describe("avatar 3D on desktop", () => {
  test("loads avatar.glb exactly once, after the canvas is live", async ({
    page
  }) => {
    const glb = trackGlb(page);
    const problems = collectConsoleProblems(page);
    const loaded = page.waitForResponse((r) => isGlb(r.url()), {
      timeout: 20_000
    });
    await page.goto("/en");
    await expect(graph(page)).toHaveAttribute("data-gate", "live", {
      timeout: 15_000
    });
    await loaded;
    await page.waitForTimeout(1000);
    expect(glb).toHaveLength(1);
    await expect(graph(page)).toHaveAttribute("data-tier", /^(high|medium)$/);
    expect(problems).toEqual([]);
  });

  test("the avatar chunk stays under its cap", async ({ page }) => {
    const scripts = trackScripts(page);
    const loaded = page.waitForResponse((r) => isGlb(r.url()), {
      timeout: 20_000
    });
    await scripts.goto("/en");
    await loaded;
    const { avatar } = await splitAvatarChunks(scripts.lazy());
    const bytes = await gzipBytes(avatar);
    console.log(
      `avatar chunk: ${(bytes / 1024).toFixed(1)} KB gzip (${avatar.length} file(s))`
    );
    expect(avatar.length).toBeGreaterThan(0);
    expect(bytes).toBeLessThanOrEqual(AVATAR_BUDGET_BYTES);
  });

  // Review Focus 1
  test("a failed avatar.glb leaves the graph live and shows the idle image", async ({
    page
  }) => {
    await page.route("**/models/avatar.glb", (route) =>
      route.fulfill({ status: 404 })
    );
    await page.goto("/en");
    await expect(graph(page)).toHaveAttribute("data-gate", "live", {
      timeout: 15_000
    });
    await expect(page.locator("#hero-canvas-slot")).toHaveAttribute(
      "data-avatar-failed",
      "",
      {
        timeout: 15_000
      }
    );
    await expect(pose(page, "idle")).toBeVisible();
    await expect(pose(page, "wave")).toBeHidden();
    await page.waitForTimeout(1000);
    await expect(graph(page)).toHaveAttribute("data-gate", "live");
    await expect(page.locator("#hero-canvas-slot canvas")).toHaveCount(1);
  });
});
```

- [ ] **Step 11: Measure and set the cap**

Run: `pnpm exec playwright test e2e/hero-avatar.spec.ts e2e/hero-3d.spec.ts`
Read the `avatar chunk: … KB gzip` line.

- If it is **over 40 KB**: stop, do not commit, and report the number and the chunk contents (`npx source-map-explorer` is not installed; list the big modules by grepping the chunk for `GLTFLoader`, `MeshoptDecoder`, `ContactShadows`, `SkeletonUtils`) to the human partner.
- Otherwise set `AVATAR_BUDGET_BYTES` to `Math.ceil(measuredKB + 3) * 1024` (write the literal, e.g. `const AVATAR_BUDGET_BYTES = 37 * 1024; // measured 33.6 KB + 3 KB`), rerun, and expect all green (the "3D chunk" log line must be unchanged at ≈ 249.8 KB).

- [ ] **Step 12: Record the budget**

In `CLAUDE.md`, under "Performance budget", after the lazy 3D chunk bullet, add:

```markdown
- Lazy avatar chunk (`hero-avatar`: avatar code + `GLTFLoader` + meshopt
  decoder + `SkeletonUtils` + `ContactShadows`) ≤ <N> KB gzip (measured <M> KB
  - 3 KB), enforced by `e2e/hero-avatar.spec.ts`. It is excluded from the 3D
    chunk check. Use three's `GLTFLoader` with `useLoader`, not drei's
    `useGLTF` (which bundles `DRACOLoader`).
```

with `<N>`/`<M>` replaced by the real numbers. In `docs/SPEC-phase-5b-avatar.en.md` §B.9, change the "Extra JS" row to `≤ <N> KB gzip in its own `hero-avatar` chunk (measured; the loaders are not in the canvas chunk — see the design doc D2)`.

- [ ] **Step 13: Manual look**

`pnpm start`, open `/en` on a desktop-size window: after load + idle the avatar stands in front of the graph, right of centre, feet ~15 % above the slot bottom, about 70 % of the slot tall, idling, with a soft gold rim and (High tier) a contact shadow. If the rim is too strong or invisible, tune `AVATAR.rim` only. Toggle the theme: the rim follows `--accent`.

- [ ] **Step 14: Full checks and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add src/features/hero/canvas e2e CLAUDE.md docs/SPEC-phase-5b-avatar.en.md
git commit -m "feat(avatar): load the avatar in its own lazy chunk inside the hero canvas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Intro choreography, speech bubble, repeat visits

**Files:**

- Create: `src/features/hero/canvas/avatar/useAvatarIntro.ts`, `src/features/hero/canvas/avatar/AvatarBubble.tsx`
- Modify: `src/features/hero/canvas/avatar/Avatar.tsx`
- Modify: `src/shared/i18n/messages/en.json`, `vi.json`, `src/features/hero/HeroSection.tsx`, `src/features/hero/canvas/HeroCanvasGate.tsx`
- Modify: `src/app/globals.css`
- Modify: `e2e/hero-avatar.spec.ts`, `e2e/hero-3d.spec.ts`

**Interfaces:**

- Consumes: `createIntro`, `IntroPose`, `AvatarPhase`, `ClipName` (Task 1); `AvatarActions`, `playClip`, `setWalkSpeed` (Task 3).
- Produces:
  - `useAvatarIntro(slot: HTMLElement, actions: AvatarActions): IntroController` with `interface IntroController { advance(dt: number, morph: number): IntroPose; rewave(): boolean }`
  - `AvatarBubble({ text, ref }: { text: string; ref?: Ref<HTMLDivElement> })`
  - DOM: `#hero-canvas-slot[data-avatar-phase="enter"|"walk"|"wave"|"idle"]`; `sessionStorage["avatar-greeted"] = "1"` once a wave starts.
  - `HeroCanvasGate({ avatarBubble }: { avatarBubble: string })`

- [ ] **Step 1: Write the failing e2e tests**

Add to `e2e/hero-avatar.spec.ts`:

```ts
const slot = (page: Page) => page.locator("#hero-canvas-slot");

// Records every data-avatar-phase value, in order, for each document.
async function recordPhases(page: Page) {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __avatarPhases: string[] }).__avatarPhases = seen;
    new MutationObserver(() => {
      const phase =
        document.getElementById("hero-canvas-slot")?.dataset.avatarPhase;
      if (phase && seen.at(-1) !== phase) seen.push(phase);
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-avatar-phase"]
    });
  });
  return () =>
    page.evaluate(
      () => (window as unknown as { __avatarPhases: string[] }).__avatarPhases
    );
}

test.describe("avatar intro on desktop", () => {
  test("walks, waves, then idles within 6 s of the model loading", async ({
    page
  }) => {
    const problems = collectConsoleProblems(page);
    const phases = await recordPhases(page);
    const loaded = page.waitForResponse((r) => isGlb(r.url()), {
      timeout: 20_000
    });
    await page.goto("/en");
    await (await loaded).finished();
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 6_000
    });
    expect(await phases()).toEqual(["enter", "walk", "wave", "idle"]);
    expect(problems).toEqual([]);
  });

  test("a reload in the same session only waves", async ({ page }) => {
    const phases = await recordPhases(page);
    await page.goto("/en");
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    await page.reload();
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    expect(await phases()).toEqual(["wave", "idle"]);
  });

  // Review Focus 2
  test("runs the full intro when sessionStorage throws", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "sessionStorage", {
        get() {
          throw new DOMException("blocked", "SecurityError");
        }
      });
    });
    const phases = await recordPhases(page);
    await page.goto("/en");
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    expect((await phases())[0]).toBe("enter");
  });

  // Review Focus 3
  test("switching locale keeps one canvas and only waves on the new page", async ({
    page
  }) => {
    const phases = await recordPhases(page);
    await page.goto("/en");
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    // A client navigation keeps `window`, so the recorder spans both pages;
    // only look at what happened after the switch.
    const before = (await phases()).length;
    await page.locator('a[hreflang="vi"]').first().click();
    await expect(page).toHaveURL(/\/vi/);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    await expect(page.locator("canvas")).toHaveCount(1);
    expect((await phases()).slice(before)).not.toContain("walk");
  });

  // Review Focus 4
  test("the theme toggle neither remounts the canvas nor replays the intro", async ({
    page
  }) => {
    await page.goto("/en");
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    const before = await page
      .locator("#hero-canvas-slot canvas")
      .elementHandle();
    await page.getByRole("button", { name: "Dark theme" }).click();
    await page.waitForTimeout(500);
    expect(await before?.evaluate((el) => el.isConnected)).toBe(true);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle");
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm build && pnpm exec playwright test e2e/hero-avatar.spec.ts -g "intro"`
Expected: FAIL — `data-avatar-phase` never appears.

- [ ] **Step 3: Add the message key**

In `src/shared/i18n/messages/en.json`, inside `"hero"` after `"graph": { … }`, add `"avatar": { "bubble": "Hi, I'm Dat" }`. In `vi.json`, at the same place, add `"avatar": { "bubble": "Chào, mình là Đạt" }`.

In `src/features/hero/HeroSection.tsx`, change `<HeroCanvasGate />` to `<HeroCanvasGate avatarBubble={t("avatar.bubble")} />`. In `HeroCanvasGate.tsx`, change the signature to `export function HeroCanvasGate({ avatarBubble }: { avatarBubble: string })` and pass `avatarBubble={avatarBubble}` to `<HeroCanvas>` (replacing `avatarBubble=""`).

Run: `pnpm exec vitest run src/shared/i18n` — Expected: PASS (shape parity between locales).

- [ ] **Step 4: Implement `useAvatarIntro.ts`**

```ts
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createIntro,
  type AvatarPhase,
  type ClipName,
  type IntroPose
} from "./choreography";
import { playClip, setWalkSpeed, type AvatarActions } from "./useAvatarMixer";

const GREETED_KEY = "avatar-greeted";

// Storage can throw (blocked site data, some private modes): then every
// visit gets the full intro.
function readMode(): "full" | "repeat" {
  try {
    return window.sessionStorage.getItem(GREETED_KEY) ? "repeat" : "full";
  } catch {
    return "full";
  }
}

function markGreeted() {
  try {
    window.sessionStorage.setItem(GREETED_KEY, "1");
  } catch {
    // Not remembered; the next visit replays the full intro.
  }
}

// Exposed for e2e (spec B.10), like data-gate.
function setPhase(slot: HTMLElement, phase: AvatarPhase | null) {
  if (phase) slot.dataset.avatarPhase = phase;
  else delete slot.dataset.avatarPhase;
}

export interface IntroController {
  advance(dt: number, morph: number): IntroPose;
  rewave(): boolean;
}

// Drives the mixer from the pure intro clock: clips change only on the
// clock's phase edges, never on the mixer's "finished" event.
export function useAvatarIntro(
  slot: HTMLElement,
  actions: AvatarActions
): IntroController {
  const [intro] = useState(() => createIntro(readMode()));
  const clip = useRef<ClipName | null>(null);
  const phase = useRef<AvatarPhase | null>(null);

  useEffect(() => () => setPhase(slot, null), [slot]);

  return useMemo(
    () => ({
      advance(dt, morph) {
        const pose = intro.step(dt, morph);
        if (pose.clip !== clip.current) {
          playClip(actions, clip.current, pose.clip, pose.fade);
          clip.current = pose.clip;
        }
        setWalkSpeed(actions, pose.walkTimeScale);
        if (pose.phase !== phase.current) {
          phase.current = pose.phase;
          setPhase(slot, pose.phase);
          if (pose.phase === "wave") markGreeted();
        }
        return pose;
      },
      rewave: () => intro.rewave()
    }),
    [intro, actions, slot]
  );
}
```

- [ ] **Step 5: Implement `AvatarBubble.tsx`**

```tsx
import { Html } from "@react-three/drei/web/Html";
import type { Ref } from "react";
import { AVATAR } from "./avatar.config";

// DOM bubble (not canvas text); the name is already the h1, so it is
// aria-hidden. Avatar toggles data-visible each frame from the intro pose.
export function AvatarBubble({
  text,
  ref
}: {
  text: string;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <Html
      position={[0, AVATAR.height + AVATAR.bubbleOffset, 0]}
      zIndexRange={[20, 10]}
      style={{ pointerEvents: "none" }}
    >
      <div ref={ref} className="hero-avatar-bubble" aria-hidden="true">
        {text}
      </div>
    </Html>
  );
}
```

Add to `src/app/globals.css`, after the avatar fallback block from Task 2:

```css
/* Speech bubble: created by JS inside the canvas (drei Html), never in SSR
   HTML, so it may start hidden. Avatar toggles data-visible. */
.hero-avatar-bubble {
  position: relative;
  translate: -50% -100%;
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elevated);
  color: var(--fg);
  font-family: var(--font-mono);
  font-size: 14px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.25s;
}

.hero-avatar-bubble[data-visible] {
  opacity: 1;
}

.hero-avatar-bubble::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -6px;
  width: 10px;
  height: 10px;
  translate: -50% 0;
  rotate: 45deg;
  background: var(--bg-elevated);
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
```

- [ ] **Step 6: Replace `Avatar.tsx` with the intro-driven version**

```tsx
import { ContactShadows } from "@react-three/drei/core/ContactShadows";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { DirectionalLight, Group } from "three";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useScrollStore } from "@/shared/lib/stores/scroll-store";
import type { RenderTier } from "../../quality/detect-tier";
import { useGraphColors } from "../useGraphColors";
import { AVATAR } from "./avatar.config";
import { disposeAvatar, prepareAvatar, setOpacity } from "./avatar-model";
import { AvatarBubble } from "./AvatarBubble";
import { avatarFrame } from "./choreography";
import { useAvatarIntro } from "./useAvatarIntro";
import { useAvatarMixer } from "./useAvatarMixer";

// three's own loader + meshopt; drei's useGLTF would bundle DRACOLoader too.
function withMeshopt(loader: GLTFLoader) {
  loader.setMeshoptDecoder(MeshoptDecoder);
}

export interface AvatarProps {
  tier: RenderTier;
  slot: HTMLElement;
  bubble: string;
}

// Entry of the hero-avatar chunk. Per frame it reads the scroll store with
// getState() and writes three objects and data-* attributes directly; no
// React state changes after mount.
export default function Avatar({ tier, slot, bubble }: AvatarProps) {
  const gltf = useLoader(GLTFLoader, AVATAR.url, withMeshopt);
  const model = useMemo(() => prepareAvatar(gltf), [gltf]);
  const { mixer, actions } = useAvatarMixer(model.root, gltf.animations);
  const intro = useAvatarIntro(slot, actions);
  const palette = useGraphColors();
  const size = useThree((state) => state.size);
  const frame = useMemo(
    () => avatarFrame(size.width / Math.max(1, size.height)),
    [size]
  );
  const rootRef = useRef<Group>(null);
  const rimRef = useRef<DirectionalLight>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const paletteVersion = useRef(-1);

  useEffect(() => () => disposeAvatar(model), [model]);

  useFrame((_, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const dt = Math.min(delta, 0.1); // no jump after a background tab
    const rim = rimRef.current;
    if (rim && paletteVersion.current !== palette.version) {
      rim.color.copy(palette.app); // --accent, follows the theme
      paletteVersion.current = palette.version;
    }

    const morph = useScrollStore.getState().heroMorph;
    const pose = intro.advance(dt, morph);
    const opacity = pose.opacity;
    const visible = opacity > 0;
    root.visible = visible;
    bubbleRef.current?.toggleAttribute("data-visible", visible && pose.bubble);
    if (!visible) return;

    root.position.set(AVATAR.end.x, frame.feetY, pose.z);
    setOpacity(model.materials, opacity);
    mixer.update(dt);
  });

  return (
    <group ref={rootRef} scale={frame.scale} visible={false}>
      <primitive object={model.root} />
      <directionalLight
        ref={rimRef}
        position={[...AVATAR.rim.position]}
        intensity={AVATAR.rim.intensity}
      />
      {tier === "high" && <ContactShadows {...AVATAR.contactShadows} />}
      <AvatarBubble ref={bubbleRef} text={bubble} />
    </group>
  );
}
```

- [ ] **Step 7: Run the intro e2e tests**

Run: `pnpm build && pnpm exec playwright test e2e/hero-avatar.spec.ts`
Expected: PASS.

Now add the line deferred in Task 3 to "draws in at most 9 draw calls with the avatar" in `e2e/hero-3d.spec.ts`, right after `await waitLive(page);`:

```ts
await expect(page.locator("#hero-canvas-slot")).toHaveAttribute(
  "data-avatar-phase",
  "idle",
  { timeout: 20_000 }
);
```

Run: `pnpm exec playwright test e2e/hero-3d.spec.ts -g "draw calls"` — Expected: PASS.

- [ ] **Step 8: Tune foot sliding (manual)**

`pnpm start`, open `/en` in a fresh private window (no session flag) and watch the walk, slowed down if needed (DevTools → Animations doesn't affect WebGL; use a screen recording at 0.25×). Feet planted on the ground must not visibly slide. If they slide forward, raise `AVATAR.walkTimeScale` in 0.05 steps; if they moonwalk, lower it. Keep `(end.z − start.z) ≈ 1.3 × timings.walk` as the config comment says. Write the final value and a one-line note ("tuned 2026-10-0X by eye at 1440 px") into `avatar.config.ts`. Also confirm the crossfades walk → wave → idle have no pops and the bubble appears over the head while waving, then fades.

- [ ] **Step 9: Lint, typecheck, unit tests, commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add src/features/hero src/shared/i18n/messages src/app/globals.css e2e
git commit -m "feat(avatar): walk-out intro, speech bubble and same-session short wave

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Scroll coupling, tier downgrade, leak check

**Files:**

- Modify: `src/features/hero/canvas/avatar/Avatar.tsx`
- Modify: `e2e/hero-avatar.spec.ts`, `e2e/hero-3d.spec.ts`

**Interfaces:**

- Consumes: `scrollPose` (Task 1); `AVATAR.tierFadeOut`.
- Produces: DOM `#hero-canvas-slot[data-avatar-hidden]` while the 3D avatar is hidden (scroll ≥ 0.5 or faded out on Low).

- [ ] **Step 1: Write the failing e2e test**

Add to `e2e/hero-avatar.spec.ts`:

```ts
test.describe("avatar and scroll", () => {
  test("recedes and hides by morph 0.5, returns on scroll up, never replays", async ({
    page
  }) => {
    const phases = await recordPhases(page);
    await page.goto("/en");
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    await page.mouse.move(200, 200);
    await expect(page.locator("html")).toHaveAttribute(
      "data-motion-ready",
      "",
      {
        timeout: 10_000
      }
    );
    const heroHeight = await page
      .locator("#top")
      .evaluate((el) => el.getBoundingClientRect().height);
    await page.mouse.wheel(0, heroHeight);
    await expect(slot(page)).toHaveAttribute("data-avatar-hidden", "", {
      timeout: 10_000
    });
    await page.mouse.wheel(0, -heroHeight);
    await expect(slot(page)).not.toHaveAttribute("data-avatar-hidden", {
      timeout: 10_000
    });
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle");
    expect((await phases()).filter((p) => p === "walk")).toHaveLength(1);
  });
});
```

Run: `pnpm build && pnpm exec playwright test e2e/hero-avatar.spec.ts -g "scroll"` — Expected: FAIL (`data-avatar-hidden` never set).

- [ ] **Step 2: Apply the scroll pose and the tier fade in `Avatar.tsx`**

Add `scrollPose` to the `./choreography` import. Add this module-level helper under `withMeshopt`:

```ts
// Exposed for e2e: present while the 3D avatar is hidden.
function setHidden(slot: HTMLElement, hidden: boolean) {
  slot.toggleAttribute("data-avatar-hidden", hidden);
}
```

Inside the component, after `const paletteVersion = useRef(-1);`, add:

```ts
const tierRef = useRef(tier);
const tierOpacity = useRef(1);

useEffect(() => {
  tierRef.current = tier;
}, [tier]);
```

and change the dispose effect to also clear the attribute:

```ts
useEffect(
  () => () => {
    disposeAvatar(model);
    setHidden(slot, false);
  },
  [model, slot]
);
```

Replace the block from `const morph = useScrollStore.getState().heroMorph;` through `mixer.update(dt);` with:

```ts
const morph = useScrollStore.getState().heroMorph;
const scroll = scrollPose(morph);
const pose = intro.advance(dt, morph);
// Runtime drop to Low (PerformanceMonitor): fade out; CSS shows the image.
if (tierRef.current === "low") {
  tierOpacity.current = Math.max(
    0,
    tierOpacity.current - dt / AVATAR.tierFadeOut
  );
}
const opacity = pose.opacity * scroll.opacity * tierOpacity.current;
const visible = scroll.visible && opacity > 0;
if (visible !== root.visible) {
  root.visible = visible;
  setHidden(slot, !visible);
}
bubbleRef.current?.toggleAttribute("data-visible", visible && pose.bubble);
if (!visible) return; // hidden: the mixer is paused too (spec B.7)

root.position.set(AVATAR.end.x, frame.feetY, pose.z + scroll.zOffset);
setOpacity(model.materials, opacity);
mixer.update(dt);
```

(The first frame flips `root.visible` from the JSX's `false`, so `data-avatar-hidden` starts absent; during the full intro's first frame `opacity` is 0, so it is briefly set and then cleared — harmless.)

- [ ] **Step 3: Restore the exact morph check and make the leak test avatar-aware**

In `e2e/hero-3d.spec.ts`:

- in "the graph geometry follows the morph…", restore the second poll to `.toBe(2)` (the avatar is hidden at morph ≥ 0.5).
- in "10 round trips to a case study…": right after the first `await waitLive(page);` add

```ts
const avatarIdle = () =>
  expect(page.locator("#hero-canvas-slot")).toHaveAttribute(
    "data-avatar-phase",
    "idle",
    { timeout: 20_000 }
  );
await avatarIdle();
```

In `backToTopLive`, after `await waitLive(page);` add `await avatarIdle();` (move the `avatarIdle` definition above `backToTopLive`). Replace `expect(await stats()).toEqual(baseline);` with `await expect.poll(stats).toEqual(baseline);` (GlStats publishes every 30 frames).

- [ ] **Step 4: Run the tests**

Run: `pnpm build && pnpm exec playwright test e2e/hero-avatar.spec.ts e2e/hero-3d.spec.ts`
Expected: PASS, including the 10-navigation leak test (stable geometries/textures, one live GL context).

- [ ] **Step 5: Manual downgrade check**

In DevTools → Performance, set CPU throttling to 6× on `/en` (desktop). When the PerformanceMonitor drops the tier to Low (`data-tier="low"` on `[data-hero-graph]`), the 3D avatar fades out over 0.3 s and the static idle image appears in the same spot (no wave replay, because `data-avatar-phase` is set). If the image and the 3D avatar don't line up, recheck `AVATAR.fallback.*.anchorX` from Task 2.

- [ ] **Step 6: Lint, typecheck, unit tests, commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add src/features/hero/canvas/avatar/Avatar.tsx e2e
git commit -m "feat(avatar): recede on scroll, fade out on a drop to Low

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Head look-at (cut line: may be dropped)

**Files:**

- Create: `src/features/hero/canvas/avatar/useHeadLook.ts`
- Modify: `src/features/hero/canvas/avatar/Avatar.tsx`

**Interfaces:**

- Consumes: `lookTarget` (Task 1), `AvatarModel` (`head`, `headAnimated`) (Task 3), `usePointerInside(el, enabled)` from `../usePointerInside`, `damp` from `@/shared/lib/math`.
- Produces: `useHeadLook(model: AvatarModel, slot: HTMLElement): (dt: number, active: boolean, pointer: { x: number; y: number }) => void`

The clamp and pointer mapping are already unit-tested in Task 1 (`clampLook`, `lookTarget`). This task's logic is the damped application to a bone, verified visually.

- [ ] **Step 1: Implement `useHeadLook.ts`**

```ts
import { useCallback, useRef } from "react";
import { Euler, Quaternion } from "three";
import { damp } from "@/shared/lib/math";
import { usePointerInside } from "../usePointerInside";
import type { AvatarModel } from "./avatar-model";
import { AVATAR } from "./avatar.config";
import { lookTarget } from "./choreography";

// Runs after mixer.update(): adds a damped offset on top of the clip's head
// rotation. If no clip animates the head, the rest pose is restored first so
// the offset doesn't accumulate frame after frame.
export function useHeadLook(model: AvatarModel, slot: HTMLElement) {
  const inside = usePointerInside(slot, true);
  const look = useRef({ yaw: 0, pitch: 0 });
  const scratch = useRef<{
    euler: Euler;
    offset: Quaternion;
    rest: Quaternion | null;
  } | null>(null);

  return useCallback(
    (dt: number, active: boolean, pointer: { x: number; y: number }) => {
      const head = model.head;
      if (!head) return;
      scratch.current ??= {
        euler: new Euler(),
        offset: new Quaternion(),
        rest: model.headAnimated ? null : head.quaternion.clone()
      };
      const { euler, offset, rest } = scratch.current;
      const target =
        active && inside.current
          ? lookTarget(pointer.x, pointer.y)
          : { yaw: 0, pitch: 0 };
      const { damping } = AVATAR.lookAt;
      look.current.yaw = damp(look.current.yaw, target.yaw, damping, dt);
      look.current.pitch = damp(look.current.pitch, target.pitch, damping, dt);
      if (rest) head.quaternion.copy(rest);
      euler.set(look.current.pitch, look.current.yaw, 0);
      head.quaternion.multiply(offset.setFromEuler(euler));
    },
    [model, inside]
  );
}
```

- [ ] **Step 2: Call it from `Avatar.tsx`**

Import `useHeadLook` from `"./useHeadLook"`. After `const intro = useAvatarIntro(slot, actions);` add `const lookAt = useHeadLook(model, slot);`. Change the frame callback's signature from `useFrame((_, delta) => {` to `useFrame(({ pointer }, delta) => {`, and after `mixer.update(dt);` add:

```ts
lookAt(dt, pose.phase === "idle" && scroll.lookAt, pointer);
```

(`pointer` is R3F's slot-relative NDC because the canvas's `eventSource` is the slot; touch devices never reach this code — a coarse pointer is always tier Low.)

- [ ] **Step 3: Visual check**

`pnpm build && pnpm start`, `/en` on desktop, wait for idle. Move the mouse to each corner of the slot:

- right → the avatar looks towards the viewer's right; up → it looks up. If either is inverted, flip `AVATAR.lookAt.yawSign` / `pitchSign` (the rig's head bone axes decide this) and note it in the config.
- The head turns at most ~30° sideways / ~15° up-down and eases (no snapping).
- Leave the slot → the head eases back to straight. Scroll a little (morph > 0) → it eases back too.
- During walk/wave the head does not track.

- [ ] **Step 4: Full checks and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm build && pnpm exec playwright test e2e/hero-avatar.spec.ts
git add src/features/hero/canvas/avatar
git commit -m "feat(avatar): damped head look-at in idle

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Click-to-wave and the avatar cursor (cut line: may be dropped)

**Files:**

- Create: `src/features/hero/canvas/avatar/AvatarHitProxy.tsx`
- Modify: `src/features/hero/canvas/avatar/Avatar.tsx`, `src/features/hero/canvas/Graph.tsx`
- Modify: `src/shared/animation/effects/cursor.ts`, `src/shared/animation/effects/cursor.test.ts`
- Modify: `e2e/hero-avatar.spec.ts`

**Interfaces:**

- Consumes: `IntroController.rewave()` (Task 4).
- Produces: `AvatarHitProxy({ slot, active, onWave }: { slot: HTMLElement; active: () => boolean; onWave: () => void })`; DOM `#hero-canvas-slot[data-cursor="avatar"]` while hovering the avatar.

- [ ] **Step 1: Write the failing cursor unit test**

Add to the `describe("startCursor")` block in `src/shared/animation/effects/cursor.test.ts`:

```ts
it("grows over the avatar in the hero canvas", () => {
  start();
  document.body.insertAdjacentHTML(
    "beforeend",
    '<div id="slot" data-cursor="avatar"><canvas></canvas></div>'
  );
  document
    .querySelector("#slot canvas")!
    .dispatchEvent(pointer("pointermove", { clientX: 5, clientY: 5 }));
  expect(ring()?.hasAttribute("data-node")).toBe(true);
});
```

Run: `pnpm exec vitest run src/shared/animation/effects/cursor.test.ts` — Expected: FAIL on the new test.

- [ ] **Step 2: React to the avatar in `cursor.ts`**

Replace the `node` lookup in `onMove`:

```ts
// pointerover doesn't refire while moving within one canvas, so the hero
// canvas's targets (graph nodes, the avatar) are checked on every move.
const node =
  event.target instanceof Element &&
  event.target.closest('[data-cursor="node"], [data-cursor="avatar"]');
```

Run the cursor test again — Expected: PASS.

- [ ] **Step 3: Keep the graph from clearing the avatar cursor**

In `src/features/hero/canvas/Graph.tsx`, replace `setNodeCursor` with:

```ts
// The slot is an external DOM node; the cursor effect reads this attribute.
// The avatar stands in front of the graph, so its "avatar" value wins.
function setNodeCursor(slot: HTMLElement, on: boolean) {
  if (slot.dataset.cursor === "avatar") return;
  if (on) slot.dataset.cursor = "node";
  else if (slot.dataset.cursor === "node") delete slot.dataset.cursor;
}
```

- [ ] **Step 4: Write the failing e2e test**

Add to `e2e/hero-avatar.spec.ts`:

```ts
test.describe("avatar interaction", () => {
  test("clicking the avatar in idle waves again; the cursor reacts on hover", async ({
    page
  }) => {
    const phases = await recordPhases(page);
    await page.goto("/en");
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    // The avatar's body: horizontally at --avatar-left-md, vertically mid-figure.
    const target = await slot(page).evaluate((el) => {
      const r = el.getBoundingClientRect();
      const left = parseFloat(
        getComputedStyle(
          el.querySelector(".hero-avatar-fallback")!
        ).getPropertyValue("--avatar-left-md")
      );
      return { x: r.left + (r.width * left) / 100, y: r.top + r.height * 0.5 };
    });
    await page.mouse.move(target.x, target.y);
    await expect(slot(page)).toHaveAttribute("data-cursor", "avatar");
    const before = (await phases()).length;
    await page.mouse.click(target.x, target.y);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "wave");
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 5_000
    });
    expect((await phases()).slice(before)).toEqual(["wave", "idle"]);
    await page.mouse.move(5, 5);
    await expect(slot(page)).not.toHaveAttribute("data-cursor", "avatar");
  });
});
```

Run: `pnpm build && pnpm exec playwright test e2e/hero-avatar.spec.ts -g "interaction"` — Expected: FAIL (no `data-cursor="avatar"`).

- [ ] **Step 5: Implement `AvatarHitProxy.tsx`**

```tsx
import { useEffect } from "react";
import { AVATAR } from "./avatar.config";

// The slot is an external DOM node; the cursor effect reads this attribute.
function setAvatarCursor(slot: HTMLElement, on: boolean) {
  if (on) slot.dataset.cursor = "avatar";
  else if (slot.dataset.cursor === "avatar") delete slot.dataset.cursor;
}

// Invisible capsule around the body: cheap raycasts instead of testing the
// skinned mesh (spec B.6). Draws nothing (material.visible = false) but
// still receives R3F pointer events. Lives inside the avatar's scaled group.
export function AvatarHitProxy({
  slot,
  active,
  onWave
}: {
  slot: HTMLElement;
  active: () => boolean;
  onWave: () => void;
}) {
  useEffect(() => () => setAvatarCursor(slot, false), [slot]);
  const { radius } = AVATAR.hitCapsule;
  return (
    <mesh
      position={[0, AVATAR.height / 2, 0]}
      onPointerOver={(event) => {
        event.stopPropagation();
        setAvatarCursor(slot, active());
      }}
      onPointerOut={() => setAvatarCursor(slot, false)}
      onClick={(event) => {
        event.stopPropagation();
        if (active()) onWave();
      }}
    >
      <capsuleGeometry args={[radius, AVATAR.height - 2 * radius, 4, 8]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}
```

In `Avatar.tsx`, import `AvatarHitProxy` and render it inside the group, before `<AvatarBubble …/>`:

```tsx
<AvatarHitProxy
  slot={slot}
  active={() => rootRef.current?.visible === true}
  onWave={intro.rewave}
/>
```

(`rewave()` itself ignores clicks while entering, walking or waving.)

- [ ] **Step 6: Run the tests**

Run: `pnpm build && pnpm exec playwright test e2e/hero-avatar.spec.ts e2e/hero-3d.spec.ts && pnpm exec vitest run src/shared/animation`
Expected: PASS. Also re-run "draws in at most 9 draw calls" — the invisible capsule adds no draw call.

- [ ] **Step 7: Lint, typecheck, commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add src/features/hero src/shared/animation/effects e2e
git commit -m "feat(avatar): click-to-wave on an invisible hit capsule, avatar cursor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Final verification and docs

**Files:**

- Modify: `CLAUDE.md`, `docs/SPEC-phase-5b-avatar.en.md` (acceptance checkboxes only)

- [ ] **Step 1: Update CLAUDE.md conventions**

In "3D and animation conventions":

- after the "Scroll/section progress state…" bullet, add:

```markdown
- The Phase 5B avatar's intro is not a GSAP timeline: a clock in `useFrame`
  evaluates the pure `features/hero/canvas/avatar/choreography.ts`, and clips
  change only on its phase edges. The avatar exposes `data-avatar-phase`
  (and `data-avatar-hidden` / `data-avatar-failed`) on `#hero-canvas-slot`
  for tests and CSS.
- `data-cursor` on the hero slot is `"node"` (graph) or `"avatar"`; the
  avatar wins because it stands in front.
```

- in the `"use client"` list paragraph, nothing changes (avatar files are inside the client canvas tree and need no directive).

- [ ] **Step 2: Run the whole gate**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:e2e
pnpm lhci
```

Expected: all green; Lighthouse mobile Performance ≥ 90, CLS ≤ 0.1, thresholds untouched. Copy the "3D chunk", "initial" and "avatar chunk" log lines into the commit message body.

- [ ] **Step 3: Check `pnpm dev` (Turbopack)**

`pnpm dev`, open `http://localhost:3000/en` in a fresh private window: the full intro plays, bubble shows, idle + look-at + click-to-wave work, no console errors (React dev warnings from our own `[hero-avatar]` logs only if something is genuinely missing). `/vi` shows "Chào, mình là Đạt". Stop the server.

- [ ] **Step 4: Tick the spec's acceptance list**

In `docs/SPEC-phase-5b-avatar.en.md` → "Acceptance criteria", tick each item that is now verified; mark "Attribution present if…" as `n/a (paid plan)`.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md docs/SPEC-phase-5b-avatar.en.md
git commit -m "docs(avatar): record the avatar conventions and close Phase 5B acceptance

<paste the chunk size log lines here>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
