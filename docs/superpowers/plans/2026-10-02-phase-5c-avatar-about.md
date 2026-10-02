# Phase 5C — Avatar in About Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Phase 5B 3D avatar out of the Hero and into the About section's visual slot, with its own lazy canvas, a once-per-page-view intro triggered at 70 % of the viewport, and the About counters starting after the wave.

**Architecture:** The avatar folder moves to `src/features/about/avatar/`. A server slot renders the fallback images; a small client gate (initial bundle) picks fallback / Low (images) / 3D, and on the 3D path mounts a lazy `about-avatar` chunk (`<Canvas>` + `Avatar`) after the first scroll once the slot is within 400px. Gate and canvas talk through a plain `AvatarSignals` object that writes `data-*` attributes (CSS image ↔ canvas swap, counter hold). The quality tier becomes a shared vanilla Zustand store in `src/shared/three/`.

**Tech Stack:** Next 16 (webpack build), React 19, React Three Fiber 9, drei 10 (per-file imports), three 0.186, Zustand 5 (`zustand/vanilla` + `useStore`), GSAP (motion chunk only), Vitest + jsdom, Playwright.

**Spec:** `docs/SPEC-phase-5c-avatar-about.en.md` (behavior) + `docs/superpowers/specs/2026-10-02-phase-5c-avatar-about-design.md` (reconciliation; wins where they differ). Read both, plus `CLAUDE.md`.

## Global Constraints

- Work directly on the checked-out branch `phase-5b`. No new branches, no worktrees. One Conventional Commit per task, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Layering `app → features → shared`; `features/about` never imports `features/hero` (not even types after Task 2).
- `gsap`/`lenis` runtime imports only in `app/[locale]/_motion/motion-entry.ts`; the avatar uses no GSAP.
- Canvas: `<Canvas flat>`, `aria-hidden="true"`, loaded via `dynamic(..., { ssr: false })`; drei imported per file (`@react-three/drei/core/…`, `@react-three/drei/web/Html`); GLB via R3F `useLoader` + three's `GLTFLoader` + `MeshoptDecoder` (never `useGLTF`).
- Tiers only step down within a session; Off is each canvas gate's own fallback, decided by `perf-policy` (never drei `flipflops`/`onFallback`).
- Budgets: initial JS ≤ 150 KB gzip; Hero 3D lazy JS ≤ 250 KB gzip; `about-avatar` lazy JS (everything loaded by scrolling to About after the Hero is live) ≤ 26 KB gzip; `avatar.glb` ≤ 1.5 MB. Over budget → stop and report. Never touch `lighthouserc.json`.
- No hardcoded copy: `about.avatar.bubble` in both `en.json` ("Hi, I'm Dat") and `vi.json` ("Chào, mình là Đạt").
- Nothing starts at `opacity: 0` in HTML/CSS except the inactive wave/idle `[data-avatar-pose]` image (hidden with `opacity: 0; visibility: hidden`).
- Done per task: `pnpm lint && pnpm typecheck && pnpm test` green; tasks touching runtime behavior also run the e2e files they list (`pnpm build && pnpm test:e2e <file>`). Stop any running `pnpm dev`/`pnpm start` first: Playwright reuses a server already on :3000, which would test a stale build.

## Review Focus

1. **The Hero canvas downgrades the shared tier to Low before About mounts** → About must not download `avatar.glb`; it shows the Low image path. (Task 5: gate re-reads the store at mount time; unit test on `decideAvatarPath`; Task 3 store test.)
2. **Landing on `/en#contact` (or `/en#work`)** → no `avatar.glb` until the visitor scrolls back near About, and the slot counts as "already past" (`skip`). (Task 7 e2e.)
3. **Theme toggle while the About avatar is live** → rim light follows `--accent`, canvas not remounted, intro not replayed. (Task 7 e2e; Task 1 `AccentColor` unit test.)
4. **Locale switch (view transition shows two Home pages) while About is idle** → one About canvas afterwards, no `walk` after the switch. (Task 7 e2e.)
5. **`avatar.glb` fails (404) or the context is lost** → About shows the static idle image, counters still run to their final values, the Hero stays live. (Task 7 e2e; Task 4 signals unit test for release.)

---

### Task 1: Move the avatar to `features/about` and take it out of the Hero

Moves the folder, removes every avatar trace from the Hero, deletes the scroll coupling, and switches the pure model to About framing and start modes. After this task the avatar is mounted nowhere (Task 5 mounts it); the Hero is graph-only.

**Files:**
- Move: `src/features/hero/canvas/avatar/*` → `src/features/about/avatar/` (`git mv`)
- Delete: `src/features/about/avatar/AvatarMount.tsx`, `e2e/hero-avatar.spec.ts`
- Create: `src/features/about/avatar/useAccentColor.ts`, `src/features/about/avatar/useAccentColor.test.ts`
- Modify: `src/features/about/avatar/{avatar.config.ts,choreography.ts,choreography.test.ts,useAvatarIntro.ts,Avatar.tsx,AvatarBubble.tsx,AvatarFallback.tsx,AvatarFallback.test.tsx,useAvatarMixer.ts,avatar-model.ts}`
- Modify: `src/features/hero/{HeroSection.tsx,canvas/HeroScene.tsx,canvas/HeroCanvas.tsx,canvas/HeroCanvasGate.tsx}`
- Modify: `src/shared/i18n/messages/{en,vi}.json`, `src/app/globals.css`, `e2e/hero-3d.spec.ts`

**Interfaces:**
- Produces (used by Tasks 3–7):
  - `AVATAR` config: `start {x:0,z:-1.2}`, `end {x:0,z:1.6}`, `timings.countersStart = 2.5`, `screenHeight = 0.8`, `feetFromBottom = 0.06`, `camera.fov = 30`; removed: `receded`, `skipIntroAtMorph`, `slotAspect`, `fallback.heightSm`.
  - `type StartMode = "full" | "repeat" | "skip"`; `startMode({ alreadyPast, greeted }): StartMode`; `createIntro(mode: StartMode): Intro` with `step(dt: number): IntroPose`; `IntroPose.counters: boolean`; `aboutFrame(fovDeg: number): { cameraZ: number; cameraY: number }`.
  - `useAvatarIntro(slot, actions): IntroController` with `start(alreadyPast: boolean): StartMode`, `started(): boolean`, `advance(dt: number): IntroPose`, `rewave(): boolean`.
  - `class AccentColor { color: Color; version: number; refresh(root?) }`, `useAccentColor(): AccentColor`.
  - `AvatarFallback()` renders `.about-avatar-fallback` with `--avatar-bottom`, `--avatar-h`, `--avatar-swap`, anchors.
  - CSS class `.about-avatar-bubble` (was `.hero-avatar-bubble`).

- [ ] **Step 1: Move the folder and drop the Hero mount**

```bash
git mv src/features/hero/canvas/avatar src/features/about/avatar
git rm -q src/features/about/avatar/AvatarMount.tsx e2e/hero-avatar.spec.ts
```

`src/features/hero/canvas/HeroScene.tsx` becomes:

```tsx
import { tierFeatures, type RenderTier } from "../quality/detect-tier";
import { CameraRig } from "./CameraRig";
import { Graph } from "./Graph";

export function HeroScene({
  tier,
  slot
}: {
  tier: RenderTier;
  slot: HTMLElement;
}) {
  return (
    <>
      <CameraRig parallax={tierFeatures(tier).parallax} slot={slot} />
      <Graph tier={tier} slot={slot} />
    </>
  );
}
```

In `HeroCanvas.tsx`: delete `avatarBubble` from `HeroCanvasProps`, from the destructured props, and render `<HeroScene tier={tier.level} slot={slot} />`.
In `HeroCanvasGate.tsx`: `export function HeroCanvasGate() {` (no props) and drop `avatarBubble={avatarBubble}` from `<HeroCanvas … />`.
In `HeroSection.tsx`: delete the `AvatarFallback` import and `<AvatarFallback />`; render `<HeroCanvasGate />`.

- [ ] **Step 2: Move the bubble message**

In both `src/shared/i18n/messages/en.json` and `vi.json`, delete `hero.avatar` and add under `about` (after `"label"`):

```json
    "avatar": {
      "bubble": "Hi, I'm Dat"
    },
```

(vi: `"bubble": "Chào, mình là Đạt"`.)

- [ ] **Step 3: Write the failing choreography tests**

In `src/features/about/avatar/choreography.test.ts`: change the import block to

```ts
import { describe, expect, it } from "vitest";
import { AVATAR } from "./avatar.config";
import {
  CRUISE_SPEED,
  FULL_IDLE_AT,
  aboutFrame,
  clampLook,
  createIntro,
  lookTarget,
  poseAt,
  startMode
} from "./choreography";

const deg = (d: number) => (d * Math.PI) / 180;
```

Delete the `frameFor` helper, the whole `describe("scrollPose")`, the whole `describe("avatarFrame")`, and the two morph tests in `describe("createIntro")` ("starts in idle when the visitor has already scrolled", "jumps to idle when the visitor scrolls past during the walk"). In the remaining `createIntro` tests replace every `intro.step(x, 0)` with `intro.step(x)` and `createIntro("repeat").step(0, 0)` with `createIntro("repeat").step(0)`. Then append:

```ts
describe("startMode", () => {
  it("already past About → skip (straight to idle)", () => {
    expect(startMode({ alreadyPast: true, greeted: false })).toBe("skip");
    expect(startMode({ alreadyPast: true, greeted: true })).toBe("skip");
    expect(poseAt(0, startMode({ alreadyPast: true, greeted: false })).phase).toBe("idle");
  });

  it("greeted this session → repeat, else full", () => {
    expect(startMode({ alreadyPast: false, greeted: true })).toBe("repeat");
    expect(startMode({ alreadyPast: false, greeted: false })).toBe("full");
  });
});

describe("createIntro (start modes)", () => {
  it("skip starts in idle and never walks", () => {
    const intro = createIntro("skip");
    expect(intro.step(0).phase).toBe("idle");
    expect(intro.step(1).phase).toBe("idle");
  });

  it("time only moves forward: idle stays idle", () => {
    const intro = createIntro("full");
    intro.step(0);
    intro.step(FULL_IDLE_AT + 0.1);
    for (let i = 0; i < 100; i += 1) expect(intro.step(0.1).phase).toBe("idle");
  });
});

describe("counters", () => {
  it("full intro: due at timings.countersStart (2.5 s), right after the wave starts", () => {
    expect(AVATAR.timings.countersStart).toBe(2.5);
    expect(poseAt(2.49, "full").counters).toBe(false);
    expect(poseAt(2.5, "full").counters).toBe(true);
  });

  it("repeat and skip: due at once", () => {
    expect(poseAt(0, "repeat").counters).toBe(true);
    expect(poseAt(0, "skip").counters).toBe(true);
  });
});

describe("aboutFrame", () => {
  // Hand-computed: visible height = 1.70 / 0.8 = 2.125 m; tan(15°) = 0.267949.
  it("fits the avatar at end.z to 80 % of the slot height, feet 6 % up", () => {
    const frame = aboutFrame(30);
    expect(frame.cameraZ).toBeCloseTo(1.6 + 2.125 / (2 * 0.267949), 4); // 5.5653
    expect(frame.cameraY).toBeCloseTo(2.125 * (0.5 - 0.06), 4); // 0.935
  });
});
```

- [ ] **Step 4: Run them to verify they fail**

Run: `pnpm vitest run src/features/about/avatar/choreography.test.ts`
Expected: FAIL (`startMode`/`aboutFrame` not exported, `counters` undefined).

- [ ] **Step 5: Update the config**

In `src/features/about/avatar/avatar.config.ts`:
- Replace the `start`/`end`/`receded`/`skipIntroAtMorph` block with:

```ts
  /**
   * About framing: the avatar walks toward the camera from the back of the slot.
   * Walk distance matches the clip's natural speed (1.36 m/s × ~2.1 s ≈ 2.8 m) so feet don't slide.
   * If you change timings.walk, keep (end.z - start.z) ≈ 1.3 × timings.walk.
   */
  start: { x: 0, z: -1.2 },
  end: { x: 0, z: 1.6 },
```

- In `timings`, add after `bubbleOut: 4.4`: `countersStart: 2.5 // About stat counters start (spec §6)`.
- Replace `screenHeight`, `feetFromBottom`, `slotAspect` with:

```ts
  /** On-screen size at `end.z`: fraction of the slot height, feet this far above the slot bottom (spec §2: ≈ 80 %). */
  screenHeight: 0.8,
  feetFromBottom: 0.06,
  /** Vertical fov; the camera looks straight ahead (aboutFrame), so framing doesn't depend on the slot's aspect. */
  camera: { fov: 30 },
```

- In `fallback`, delete `heightSm` and its comment; change the doc comment to `/** Server-rendered WebP fallback (no JS, reduced motion, Low tier, failed 3D). anchorX = feet centre as a fraction of the image width. */`.
- Change the `rim` comment to `/** Rim light behind the avatar, colored --accent. */` and the `lookAt` block stays.
- First comment line: keep the asset facts; replace "Start sits inside the graph's tangle…" sentences (already removed above).

- [ ] **Step 6: Update `choreography.ts`**

- Header comment → `// Pure model of the avatar's motion (spec 5B §B.5/B.6, 5C §5). No three.js: the frame loop in Avatar.tsx evaluates it and applies the result.` Drop the canvas-chunk paragraph.
- `IntroPose` gains `/** About counters may start (spec §6). */ counters: boolean;`.
- Add `export type StartMode = "full" | "repeat" | "skip";` under `IntroMode`.
- In `settled(...)` add a `counters: boolean` parameter after `bubble` and return it; in `poseAt`:
  - `skip` → `settled("idle", 1, false, true)`
  - full walk branch: add `counters: false` to the returned object
  - full settled branch → `settled(t < FULL_IDLE_AT ? "wave" : "idle", 1, bubble, t >= T.countersStart)`
  - repeat/rewave → `settled(t < SHORT_IDLE_AT ? "wave" : "idle", opacity, t < BUBBLE_LENGTH, true)`
- Replace `Intro`/`createIntro` with:

```ts
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
      if (!started) started = true; // the first frame is t = 0
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
```

- Delete `ScrollPose`, `scrollPose`, `AvatarFrame`, `avatarFrame`. Append:

```ts
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
```

(`toRad` is already defined above `clampLook`; move `const toRad` above `aboutFrame` if needed.)

- [ ] **Step 7: Run the choreography tests**

Run: `pnpm vitest run src/features/about/avatar/choreography.test.ts`
Expected: PASS.

- [ ] **Step 8: Update `useAvatarIntro.ts`**

Replace from `export interface IntroController` to the end with:

```ts
export interface IntroController {
  /** Starts the clock (first visible frame). alreadyPast → skip to idle. */
  start(alreadyPast: boolean): StartMode;
  started(): boolean;
  advance(dt: number): IntroPose;
  rewave(): boolean;
}

// Drives the mixer from the pure intro clock: clips change only on the
// clock's phase edges, never on the mixer's "finished" event.
export function useAvatarIntro(
  slot: HTMLElement,
  actions: AvatarActions
): IntroController {
  const intro = useRef<Intro | null>(null);
  const clip = useRef<ClipName | null>(null);
  const phase = useRef<AvatarPhase | null>(null);

  useEffect(() => () => setPhase(slot, null), [slot]);

  return useMemo(
    () => ({
      start(alreadyPast) {
        const mode = startMode({
          alreadyPast,
          greeted: readMode() === "repeat"
        });
        intro.current = createIntro(mode);
        return mode;
      },
      started: () => intro.current !== null,
      advance(dt) {
        const pose = intro.current!.step(dt);
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
      rewave: () => intro.current?.rewave() ?? false
    }),
    [actions, slot]
  );
}
```

Imports at the top become `import { useEffect, useMemo, useRef } from "react";` and `import { createIntro, startMode, type AvatarPhase, type ClipName, type Intro, type IntroPose, type StartMode } from "./choreography";`. Update the `setPhase` comment to `// Exposed on the About slot for e2e and CSS (spec §5.3).`

- [ ] **Step 9: Write the failing `AccentColor` test**

`src/features/about/avatar/useAccentColor.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { AccentColor } from "./useAccentColor";

afterEach(() => {
  document.documentElement.style.removeProperty("--accent");
});

describe("AccentColor", () => {
  it("reads --accent and bumps its version on every refresh", () => {
    document.documentElement.style.setProperty("--accent", "#ff0000");
    const accent = new AccentColor();
    accent.refresh();
    expect(accent.color.getHexString()).toBe("ff0000");
    expect(accent.version).toBe(1);

    document.documentElement.style.setProperty("--accent", "#00ff00");
    accent.refresh();
    expect(accent.color.getHexString()).toBe("00ff00");
    expect(accent.version).toBe(2);
  });
});
```

Run: `pnpm vitest run src/features/about/avatar/useAccentColor.test.ts` → FAIL (module missing).

- [ ] **Step 10: Implement `useAccentColor.ts`**

```ts
import { useEffect, useState } from "react";
import { Color } from "three";

// --accent as a THREE.Color, mutated in place on theme change so nothing
// remounts; readers compare `version` to know when to re-apply. About's own
// copy of the Hero's useGraphColors idea (features/about can't import hero).
export class AccentColor {
  readonly color = new Color();
  version = 0;

  refresh(root: HTMLElement = document.documentElement) {
    const value =
      root.style.getPropertyValue("--accent").trim() ||
      getComputedStyle(root).getPropertyValue("--accent").trim();
    if (value) this.color.set(value);
    this.version += 1;
  }
}

export function useAccentColor(): AccentColor {
  const [accent] = useState(() => {
    const created = new AccentColor();
    created.refresh();
    return created;
  });
  useEffect(() => {
    const observer = new MutationObserver(() => accent.refresh());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"]
    });
    return () => observer.disconnect();
  }, [accent]);
  return accent;
}
```

Run the test → PASS.

- [ ] **Step 11: Strip the scroll coupling from `Avatar.tsx`**

- Imports: drop `useScrollStore`, `PerspectiveCamera`, `GraphPalette`, and `avatarFrame, scrollPose`; add `import type { AccentColor } from "./useAccentColor";`. Change `import type { RenderTier } from "../../quality/detect-tier";` to `import type { RenderTier } from "@/features/hero/quality/detect-tier";` (type-only, temporary — Task 2 moves it to `@/shared/three/detect-tier`).
- `AvatarProps`: replace `palette: GraphPalette` with `/** Theme accent (rim light). */ accent: AccentColor;`.
- Comment above `AvatarScene` → `// Per frame this writes three objects and data-* attributes directly; no React state changes after mount.`
- Rename `paletteVersion` → `accentVersion`. Replace the whole `useFrame` callback with:

```ts
  useFrame(({ pointer }, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const dt = Math.min(delta, 0.1); // no jump after a background tab
    const rim = rimRef.current;
    if (rim && accentVersion.current !== accent.version) {
      rim.color.copy(accent.color); // follows the theme
      accentVersion.current = accent.version;
    }

    if (!intro.started()) intro.start(false); // Task 5 gates this on the 70 % trigger
    const pose = intro.advance(dt);
    // Runtime drop to Low (PerformanceMonitor): fade out.
    if (tierRef.current === "low") {
      tierOpacity.current = Math.max(
        0,
        tierOpacity.current - dt / AVATAR.tierFadeOut
      );
    }
    const opacity = pose.opacity * tierOpacity.current;
    const visible = opacity > 0;
    if (visible !== root.visible) {
      root.visible = visible;
      setHidden(slot, !visible);
    }
    bubbleRef.current?.toggleAttribute("data-visible", visible && pose.bubble);
    if (!visible) return;

    root.position.set(AVATAR.end.x, 0, pose.z);
    setOpacity(model.materials, opacity);
    mixer.update(dt);
    // pointer: slot-relative NDC (eventSource is the slot).
    lookAt(dt, pose.phase === "idle", pointer);
  });
```

- Rim light comment → `{/* Outside the visibility-toggled group so hiding the avatar never changes the scene's light count (a recompile would flash). */}`.
- `AvatarBoundary` warn prefix `[hero-avatar]` → `[about-avatar]`; the class comment → `// A failed GLB shows the static idle image (data-avatar-failed).`; `// Entry of the hero-avatar chunk.` → `// Rendered inside AboutAvatarCanvas (about-avatar chunk).`
- Function signature `function AvatarScene({ tier, slot, bubble, accent }: AvatarProps)`.

- [ ] **Step 12: Rename the remaining hero strings**

- `useAvatarMixer.ts` and `avatar-model.ts`: `[hero-avatar]` → `[about-avatar]` in the warn messages.
- `AvatarBubble.tsx`: `className="hero-avatar-bubble"` → `className="about-avatar-bubble"`.
- `src/app/globals.css`: rename `.hero-avatar-bubble` → `.about-avatar-bubble` (3 selectors), and **delete** the whole hero fallback block from the comment `/* Hero avatar fallback (features/hero/canvas/avatar/AvatarFallback)…` through `@keyframes hero-avatar-bob { … }` (Task 3 adds the About rules).
- Grep must be clean: `grep -rn "hero-avatar\|hero\.avatar\|avatarBubble" src e2e` → only no matches.

- [ ] **Step 13: Rewrite `AvatarFallback.tsx` and its test for About**

Test first — replace `AvatarFallback.test.tsx`'s second `it` and the imports/selector:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AVATAR } from "./avatar.config";
import { AvatarFallback } from "./AvatarFallback";

function render() {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(<AvatarFallback />);
  return host.querySelector<HTMLElement>(".about-avatar-fallback")!;
}
```

(keep the first `it` unchanged) and

```tsx
  it("stands where the 3D avatar's feet land (same config as aboutFrame)", () => {
    const style = render().style;
    expect(style.getPropertyValue("--avatar-bottom")).toBe("6.00%");
    expect(style.getPropertyValue("--avatar-h")).toBe("80.00%");
    expect(style.getPropertyValue("--avatar-swap")).toBe("2s");
    expect(style.getPropertyValue("--avatar-idle-anchor")).toBe("0.5");
  });
```

Run: `pnpm vitest run src/features/about/avatar/AvatarFallback.test.tsx` → FAIL. Then `AvatarFallback.tsx`:

```tsx
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
```

Run the test → PASS.

- [ ] **Step 14: Hero e2e no longer expects an avatar**

In `e2e/hero-3d.spec.ts`:
- Replace the test `"draws in at most 9 draw calls with the avatar"` with:

```ts
  test("draws in at most 6 draw calls and has no avatar", async ({ page }) => {
    const glb: string[] = [];
    page.on("request", (request) => {
      if (request.url().endsWith("/models/avatar.glb")) glb.push(request.url());
    });
    await page.goto("/en");
    await waitLive(page);
    await expect
      .poll(async () => Number(await graph(page).getAttribute("data-gl-calls")))
      .toBeGreaterThan(0);
    const calls = Number(await graph(page).getAttribute("data-gl-calls"));
    expect(calls).toBeLessThanOrEqual(6);
    await expect(
      page.locator("#top [data-avatar-pose], #top [data-avatar-phase]")
    ).toHaveCount(0);
    await page.waitForTimeout(1000);
    expect(glb).toEqual([]);
  });
```

- In the 10-round-trip test delete the `avatarIdle` helper and both `await avatarIdle();` calls.

- [ ] **Step 15: Verify**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: green. (`knip` may report the moved avatar files as unused until Task 5 — expected, don't fix.)
Run: `pnpm build && pnpm test:e2e e2e/hero-3d.spec.ts e2e/home.spec.ts`
Expected: green; the budget test logs the 3D chunk — record the number (it should drop below 255,954 B).

- [ ] **Step 16: Commit**

```bash
git add -A src e2e
git commit -m "refactor(avatar): move the avatar to features/about, Hero is graph-only

The Hero no longer mounts the avatar; scroll coupling (heroMorph recede,
skip at morph) is gone. The pure model gains start modes, a counters flag
and aboutFrame for About's own camera.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Shared quality tier (`src/shared/three/`)

**Files:**
- Move: `src/features/hero/quality/detect-tier.ts` → `src/shared/three/detect-tier.ts` (+ test), `src/features/hero/quality/perf-policy.ts` → `src/shared/three/perf-policy.ts` (+ test), `src/features/hero/canvas/decide-gate.ts` → `src/shared/three/decide-gate.ts` (+ test)
- Create: `src/shared/three/quality-store.ts`, `src/shared/three/quality-store.test.ts`, `src/features/hero/quality/tier-features.ts`, `src/features/hero/quality/tier-features.test.ts`
- Modify: `src/features/hero/quality/useQualityTier.ts`, `src/features/hero/canvas/{HeroCanvas.tsx,HeroCanvasGate.tsx,HeroScene.tsx,Graph.tsx}`, `src/features/about/avatar/Avatar.tsx`

**Interfaces:**
- Produces:
  - `@/shared/three/detect-tier`: `type RenderTier`, `interface TierEnv { finePointer; cores?; memory? }`, `LOW_FPS_FLOOR`, `detectTier(env)`, `downgradeTier(level)`, `lowerTier(a, b)`, `capForSlot(level, slotWidth, minWidth)`, `TIER_DPR`, `readTierEnv(win?)`.
  - `@/shared/three/quality-store`: `qualityStore` (vanilla Zustand) with state `{ level: RenderTier | null; init(env: TierEnv): RenderTier; downgrade(): void }`.
  - `@/shared/three/perf-policy`: unchanged `monitorBounds`, `declineAction`.
  - `@/shared/three/decide-gate`: unchanged `decideGate`, `probeWebGL`, `readGateEnv`, `GateEnv`, `GateDecision`.
  - `@/features/hero/quality/tier-features`: `tierFeatures(level)`, `HERO_MIN_SLOT_WIDTH = 480`.

- [ ] **Step 1: Move files**

```bash
mkdir -p src/shared/three
git mv src/features/hero/quality/detect-tier.ts src/shared/three/detect-tier.ts
git mv src/features/hero/quality/detect-tier.test.ts src/shared/three/detect-tier.test.ts
git mv src/features/hero/quality/perf-policy.ts src/shared/three/perf-policy.ts
git mv src/features/hero/quality/perf-policy.test.ts src/shared/three/perf-policy.test.ts
git mv src/features/hero/canvas/decide-gate.ts src/shared/three/decide-gate.ts
git mv src/features/hero/canvas/decide-gate.test.ts src/shared/three/decide-gate.test.ts
```

- [ ] **Step 2: Write the failing tier tests**

Replace `src/shared/three/detect-tier.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import {
  TIER_DPR,
  capForSlot,
  detectTier,
  downgradeTier,
  lowerTier,
  type TierEnv
} from "./detect-tier";

const desktop: TierEnv = { finePointer: true, cores: 8, memory: undefined };

describe("detectTier (device only)", () => {
  it.each([
    [{}, "high"],
    [{ memory: 8 }, "high"],
    [{ memory: 16 }, "high"],
    [{ memory: 4 }, "medium"],
    [{ cores: 4 }, "medium"],
    [{ cores: undefined }, "medium"],
    [{ finePointer: false }, "low"]
  ] as const)("%o → %s", (override, expected) => {
    expect(detectTier({ ...desktop, ...override })).toBe(expected);
  });
});

describe("capForSlot", () => {
  it("drops to low below the slot's minimum width, else keeps the level", () => {
    expect(capForSlot("high", 479, 480)).toBe("low");
    expect(capForSlot("high", 480, 480)).toBe("high");
    expect(capForSlot("medium", 1000, 480)).toBe("medium");
  });
});

describe("lowerTier", () => {
  it("returns the lower of two tiers", () => {
    expect(lowerTier("high", "medium")).toBe("medium");
    expect(lowerTier("low", "high")).toBe("low");
    expect(lowerTier("medium", "medium")).toBe("medium");
  });
});

describe("downgradeTier", () => {
  it("steps down one tier and stops at low", () => {
    expect(downgradeTier("high")).toBe("medium");
    expect(downgradeTier("medium")).toBe("low");
    expect(downgradeTier("low")).toBe("low");
  });
});

describe("tier table", () => {
  it("matches the spec's dpr column", () => {
    expect(TIER_DPR).toEqual({ high: [1, 1.5], medium: [1, 1.25], low: 1 });
  });
});
```

`src/features/hero/quality/tier-features.test.ts` (moved from the old file):

```ts
import { describe, expect, it } from "vitest";
import { LOW_TIER_NODE_IDS } from "../graph/graph-data";
import { HERO_MIN_SLOT_WIDTH, tierFeatures } from "./tier-features";

describe("tierFeatures", () => {
  it("low drops labels, interaction, parallax and three nodes", () => {
    expect(tierFeatures("low")).toEqual({
      labels: false,
      interactive: false,
      parallax: false,
      nodeIds: LOW_TIER_NODE_IDS
    });
    expect(tierFeatures("medium")).toEqual({
      labels: true,
      interactive: true,
      parallax: true,
      nodeIds: undefined
    });
  });

  it("keeps the Phase 5 slot rule", () => {
    expect(HERO_MIN_SLOT_WIDTH).toBe(480);
  });
});
```

`src/shared/three/quality-store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import type { TierEnv } from "./detect-tier";
import { qualityStore } from "./quality-store";

const strong: TierEnv = { finePointer: true, cores: 8 };
const weak: TierEnv = { finePointer: true, cores: 4 };

beforeEach(() => qualityStore.setState({ level: null }));

describe("qualityStore", () => {
  it("detects once; the first caller wins", () => {
    expect(qualityStore.getState().init(strong)).toBe("high");
    expect(qualityStore.getState().init(weak)).toBe("high");
    expect(qualityStore.getState().level).toBe("high");
  });

  it("steps High → Medium → Low and stays at Low", () => {
    qualityStore.getState().init(strong);
    qualityStore.getState().downgrade();
    expect(qualityStore.getState().level).toBe("medium");
    qualityStore.getState().downgrade();
    expect(qualityStore.getState().level).toBe("low");
    qualityStore.getState().downgrade();
    expect(qualityStore.getState().level).toBe("low");
  });

  it("never upgrades: init after a downgrade returns the current level", () => {
    qualityStore.getState().init(strong);
    qualityStore.getState().downgrade();
    expect(qualityStore.getState().init(strong)).toBe("medium");
  });

  it("downgrade before init does nothing", () => {
    qualityStore.getState().downgrade();
    expect(qualityStore.getState().level).toBeNull();
  });
});
```

Run: `pnpm vitest run src/shared/three src/features/hero/quality` → FAIL.

- [ ] **Step 3: Implement `detect-tier.ts` (shared)**

```ts
/** Rendering tiers. "Off" is not a tier: it is each canvas gate's fallback state. */
export type RenderTier = "high" | "medium" | "low";

/** Device facts only. Each canvas applies its own slot cap (capForSlot). */
export interface TierEnv {
  finePointer: boolean;
  cores?: number;
  memory?: number;
}

/** In the Low tier, sustained fps below this switches a canvas Off. */
export const LOW_FPS_FLOOR = 25;

export function detectTier(env: TierEnv): RenderTier {
  if (!env.finePointer) return "low";
  const strongCpu = (env.cores ?? 0) >= 8;
  const enoughMemory = env.memory === undefined || env.memory >= 8;
  return strongCpu && enoughMemory ? "high" : "medium";
}

export function downgradeTier(level: RenderTier): RenderTier {
  return level === "high" ? "medium" : "low";
}

const RANK: Record<RenderTier, number> = { low: 0, medium: 1, high: 2 };

export function lowerTier(a: RenderTier, b: RenderTier): RenderTier {
  return RANK[a] <= RANK[b] ? a : b;
}

/** A slot narrower than minWidth renders at Low whatever the device can do. */
export function capForSlot(
  level: RenderTier,
  slotWidth: number,
  minWidth: number
): RenderTier {
  return slotWidth < minWidth ? "low" : level;
}

export const TIER_DPR: Record<RenderTier, number | [number, number]> = {
  high: [1, 1.5],
  medium: [1, 1.25],
  low: 1
};

export function readTierEnv(win: Window = window): TierEnv {
  const nav = win.navigator as Navigator & { deviceMemory?: number };
  return {
    finePointer: win.matchMedia("(pointer: fine)").matches,
    cores: nav.hardwareConcurrency || undefined,
    memory: nav.deviceMemory
  };
}
```

`src/features/hero/quality/tier-features.ts`:

```ts
import type { RenderTier } from "@/shared/three/detect-tier";
import { LOW_TIER_NODE_IDS } from "../graph/graph-data";

/** Phase 5 rule: a hero slot narrower than this renders at Low. */
export const HERO_MIN_SLOT_WIDTH = 480;

export function tierFeatures(level: RenderTier) {
  const full = level !== "low";
  return {
    labels: full,
    interactive: full,
    parallax: full,
    nodeIds: full ? undefined : LOW_TIER_NODE_IDS
  };
}
```

`src/shared/three/quality-store.ts`:

```ts
import { createStore } from "zustand/vanilla";
import {
  detectTier,
  downgradeTier,
  type RenderTier,
  type TierEnv
} from "./detect-tier";

interface QualityState {
  /** Device tier for this session; null until a canvas gate asks. */
  level: RenderTier | null;
  /** Detects once; later calls return the current (maybe downgraded) level. */
  init(env: TierEnv): RenderTier;
  /** One step down (High → Medium → Low). Nothing ever steps up. */
  downgrade(): void;
}

// One store for both canvases (Hero graph, About avatar): a decline in either
// lowers both. Vanilla so the About gate in the initial bundle can read it
// without React bindings; canvases subscribe with zustand's useStore.
export const qualityStore = createStore<QualityState>((set, get) => ({
  level: null,
  init(env) {
    const current = get().level;
    if (current) return current;
    const level = detectTier(env);
    set({ level });
    return level;
  },
  downgrade() {
    const { level } = get();
    if (level) set({ level: downgradeTier(level) });
  }
}));
```

`perf-policy.ts` needs no change (its import `./detect-tier` still resolves). In `perf-policy.test.ts` nothing changes either.

Run: `pnpm vitest run src/shared/three src/features/hero/quality` → PASS.

- [ ] **Step 4: Hero uses the store (no behavior change)**

`src/features/hero/quality/useQualityTier.ts`:

```ts
import { useCallback, useState } from "react";
import { useStore } from "zustand";
import {
  TIER_DPR,
  capForSlot,
  lowerTier,
  readTierEnv
} from "@/shared/three/detect-tier";
import { qualityStore } from "@/shared/three/quality-store";
import { HERO_MIN_SLOT_WIDTH } from "./tier-features";

// Device tier from the shared store (About's canvas sees the same
// downgrades), capped to Low when the hero slot is narrow (Phase 5 rule).
// Tiers only step down within a session (spec §9).
export function useQualityTier(slot: HTMLElement) {
  const [cap] = useState(() => {
    qualityStore.getState().init(readTierEnv());
    return capForSlot(
      "high",
      slot.getBoundingClientRect().width,
      HERO_MIN_SLOT_WIDTH
    );
  });
  const device = useStore(qualityStore, (state) => state.level ?? "low");
  const level = lowerTier(device, cap);
  const downgrade = useCallback(() => qualityStore.getState().downgrade(), []);
  return { level, dpr: TIER_DPR[level], downgrade };
}
```

`HeroCanvas.tsx`: delete the `detectTier, readTierEnv` import and `const [initial] = useState(...)`; use `const tier = useQualityTier(slot);`; change imports to `import type { RenderTier } from "@/shared/three/detect-tier";` and `import { declineAction, monitorBounds } from "@/shared/three/perf-policy";`. `useState` stays imported (used by `useInView`).
`HeroCanvasGate.tsx`: `import type { RenderTier } from "@/shared/three/detect-tier";` and `import { decideGate, readGateEnv } from "@/shared/three/decide-gate";`.
`HeroScene.tsx` and `Graph.tsx`: `import type { RenderTier } from "@/shared/three/detect-tier";` + `import { tierFeatures } from "../quality/tier-features";`.
`src/features/about/avatar/Avatar.tsx`: `import type { RenderTier } from "@/shared/three/detect-tier";` (removes the temporary hero import).
Check: `grep -rn "features/hero" src/features/about` → no matches.

- [ ] **Step 5: Verify, including the Hero 3D budget**

Run: `pnpm lint && pnpm typecheck && pnpm test` → green.
Run: `pnpm build && pnpm test:e2e e2e/hero-3d.spec.ts e2e/hero-3d-no-webgl.spec.ts`
Expected: green; the 3D chunk stays ≤ 250 KB (log it). If it is over, stop and report the number.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "refactor(3d): shared quality tier store and gate helpers in shared/three

Device tier lives in one vanilla Zustand store so the Hero and About
canvases see the same downgrades; the Hero keeps its 480px slot cap.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: About slot, fallback CSS, layout

Replaces the placeholder with the avatar slot (server only). After this task About shows the static idle image everywhere; the gate comes in Task 5.

**Files:**
- Create: `src/features/about/avatar/AboutAvatarSlot.tsx`, `src/features/about/avatar/AboutAvatarSlot.test.tsx`
- Modify: `src/features/about/AboutSection.tsx`, `src/app/globals.css`
- Delete: `src/shared/ui/PlaceholderSlot.tsx` and its `describe("PlaceholderSlot")` block + import in `src/shared/ui/primitives.test.tsx`

**Interfaces:**
- Produces: `<AboutAvatarSlot bubble={string} />` rendering `div#about-avatar-slot[data-avatar-slot][aria-hidden="true"].about-avatar-slot` containing `.about-avatar-fallback`. Task 5 adds `<AboutAvatarGate bubble={bubble} />` inside it.

- [ ] **Step 1: Write the failing slot test**

`src/features/about/avatar/AboutAvatarSlot.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The gate is a client component with effects; the server markup is what matters here.
vi.mock("./AboutAvatarGate", () => ({ AboutAvatarGate: () => null }));

const { AboutAvatarSlot } = await import("./AboutAvatarSlot");

describe("AboutAvatarSlot", () => {
  it("is a decorative, fixed-size slot holding the fallback images", () => {
    const host = document.createElement("div");
    host.innerHTML = renderToStaticMarkup(<AboutAvatarSlot bubble="Hi" />);
    const slot = host.querySelector<HTMLElement>("#about-avatar-slot")!;
    expect(slot.getAttribute("aria-hidden")).toBe("true");
    expect(slot.hasAttribute("data-avatar-slot")).toBe(true);
    expect(slot.className).toContain("h-80");
    expect(slot.className).toContain("md:aspect-[4/5]");
    expect(slot.querySelectorAll(".about-avatar-fallback img")).toHaveLength(2);
    expect(host.textContent).toBe(""); // no visible copy, no alt text
  });
});
```

Note: in this task `AboutAvatarGate` doesn't exist yet, so create the slot **without** the gate import and remove the `vi.mock` line until Task 5 (Task 5 Step 7 adds both back).

Run: `pnpm vitest run src/features/about/avatar/AboutAvatarSlot.test.tsx` → FAIL.

- [ ] **Step 2: Implement the slot**

`src/features/about/avatar/AboutAvatarSlot.tsx`:

```tsx
import { AvatarFallback } from "./AvatarFallback";

// Server shell in the portrait's place (spec §2): fixed size from SSR so
// nothing shifts; decorative, since the About heading and text carry the
// meaning. The idle image shows until the 3D avatar takes over.
export function AboutAvatarSlot({ bubble: _bubble }: { bubble: string }) {
  return (
    <div
      id="about-avatar-slot"
      data-avatar-slot=""
      aria-hidden="true"
      className="about-avatar-slot bg-bg-elevated rounded-card relative h-80 w-full md:col-span-4 md:aspect-[4/5] md:h-auto md:max-h-[560px] md:self-start"
    >
      <AvatarFallback />
    </div>
  );
}
```

(`bubble` is wired to the gate in Task 5; the `_bubble` rename keeps lint quiet until then.)

`AboutSection.tsx`: replace the `PlaceholderSlot` import with `import { AboutAvatarSlot } from "./avatar/AboutAvatarSlot";`, and the comment + `<PlaceholderSlot … />` with `<AboutAvatarSlot bubble={t("avatar.bubble")} />`.

Delete `src/shared/ui/PlaceholderSlot.tsx` and its test block/import in `primitives.test.tsx`.

Run the slot test → PASS.

- [ ] **Step 3: Add the About CSS**

Append to `src/app/globals.css` (where the hero fallback block used to be):

```css
/* About avatar slot (features/about/avatar). A soft floor under the feet;
   painted before the images and the canvas. */
.about-avatar-slot::before {
  content: "";
  position: absolute;
  inset: auto 0 0;
  height: 30%;
  border-radius: inherit;
  background: linear-gradient(to top, var(--bg), transparent);
  pointer-events: none;
}

/* Fallback images. Inline custom properties carry the placement from
   avatar.config (same numbers as aboutFrame). CSS alone picks the pose: idle
   by default (no JS, reduced motion, gate fallback, failed 3D); wave → idle
   on the Low tier once the slot crosses the 70 % line; hidden while the 3D
   avatar stands here. The inactive pose is hidden with opacity 0 +
   visibility hidden (CLAUDE.md exception). */
.about-avatar-fallback {
  position: absolute;
  left: 50%;
  bottom: var(--avatar-bottom);
  height: var(--avatar-h);
  pointer-events: none;
  transition:
    opacity 0.4s,
    visibility 0s;
}

.about-avatar-fallback img {
  position: absolute;
  bottom: 0;
  left: 0;
  width: auto;
  max-width: none;
}

.about-avatar-fallback [data-avatar-pose="idle"] {
  height: 100%;
  translate: calc(-100% * var(--avatar-idle-anchor)) 0;
}

.about-avatar-fallback [data-avatar-pose="wave"] {
  height: calc(100% * var(--avatar-wave-scale));
  translate: calc(-100% * var(--avatar-wave-anchor)) 0;
  opacity: 0;
  visibility: hidden;
}

@media (scripting: enabled) and (prefers-reduced-motion: no-preference) {
  [data-avatar-slot][data-tier="low"]:not([data-gate="fallback"])
    [data-avatar-pose="wave"] {
    opacity: 1;
    visibility: visible;
  }

  [data-avatar-slot][data-tier="low"]:not([data-gate="fallback"])
    [data-avatar-pose="idle"] {
    opacity: 0;
    visibility: hidden;
  }

  [data-avatar-slot][data-tier="low"][data-avatar-inview]:not(
      [data-gate="fallback"]
    )
    .about-avatar-fallback {
    animation: about-avatar-bob 4s ease-in-out var(--avatar-swap) infinite;
  }

  [data-avatar-slot][data-tier="low"][data-avatar-inview]:not(
      [data-gate="fallback"]
    )
    [data-avatar-pose="wave"] {
    animation: about-avatar-pose-out 0s var(--avatar-swap) forwards;
  }

  [data-avatar-slot][data-tier="low"][data-avatar-inview]:not(
      [data-gate="fallback"]
    )
    [data-avatar-pose="idle"] {
    animation: about-avatar-pose-in 0s var(--avatar-swap) forwards;
  }
}

/* The 3D avatar stands here: fade the image out under it. */
[data-avatar-slot][data-avatar-stage="3d"] .about-avatar-fallback {
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.4s,
    visibility 0s 0.4s;
}

@keyframes about-avatar-pose-out {
  to {
    opacity: 0;
    visibility: hidden;
  }
}

@keyframes about-avatar-pose-in {
  to {
    opacity: 1;
    visibility: visible;
  }
}

@keyframes about-avatar-bob {
  50% {
    translate: 0 -2px;
  }
}
```

- [ ] **Step 4: Verify and look at it**

Run: `pnpm lint && pnpm typecheck && pnpm test` → green.
Run `pnpm dev`, open `http://localhost:3000/en#about` at 1440 and 390 widths: the slot is a rounded elevated card (4:5 on desktop, 320px tall on mobile), the idle image stands centred with its feet ~6 % above the bottom over the floor gradient, nothing shifts on load. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "feat(about): avatar slot with fallback images in place of the placeholder

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Avatar path decision and gate ↔ canvas signals

Pure, unit-tested pieces the gate (initial bundle) uses: which path to take, and the `AvatarSignals` object that owns the slot's `data-avatar-stage` / `data-avatar-inview` and `#about`'s `data-count-hold`.

**Files:**
- Create: `src/features/about/avatar/avatar-path.ts`, `avatar-path.test.ts`, `avatar-signals.ts`, `avatar-signals.test.ts`

**Interfaces:**
- Consumes: `GateEnv`, `decideGate` (`@/shared/three/decide-gate`), `RenderTier`.
- Produces:
  - `type AvatarPath = "fallback" | "low" | "3d"`; `decideAvatarPath(env: GateEnv, tier: RenderTier): AvatarPath`.
  - `MOUNT_MARGIN = "400px 0px"`, `START_MARGIN = "0px 0px -30% 0px"`, `GLB_GRACE_MS = 1500`.
  - `interface AvatarSignals { readonly triggered: boolean; readonly inView: boolean; ready(): { alreadyPast: boolean }; started(): void; counters(): void; lost(): void; }`
  - `interface GateSignals extends AvatarSignals { hold(): void; setTriggered(): void; setInView(inView: boolean): void; dispose(): void; }`
  - `createAvatarSignals(slot: HTMLElement, section: HTMLElement | null, clock?: Clock): GateSignals` where `type Clock = Pick<Window, "setTimeout" | "clearTimeout">`.

- [ ] **Step 1: Write the failing tests**

`avatar-path.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { GateEnv } from "@/shared/three/decide-gate";
import { decideAvatarPath } from "./avatar-path";

const desktop: GateEnv = {
  reduceMotion: false,
  hasWebGL: true,
  saveData: false,
  isDesktop: true
};

describe("decideAvatarPath", () => {
  it.each([
    [{}, "high", "3d"],
    [{}, "medium", "3d"],
    [{}, "low", "low"], // Review Focus 1: Hero already dropped the shared tier
    [{ isDesktop: false }, "high", "low"],
    [{ reduceMotion: true }, "high", "fallback"],
    [{ hasWebGL: false }, "high", "fallback"],
    [{ saveData: true }, "high", "fallback"],
    [{ reduceMotion: true, isDesktop: false }, "low", "fallback"]
  ] as const)("%o at %s → %s", (override, tier, expected) => {
    expect(decideAvatarPath({ ...desktop, ...override }, tier)).toBe(expected);
  });
});
```

`avatar-signals.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GLB_GRACE_MS, createAvatarSignals } from "./avatar-signals";

let section: HTMLElement;
let slot: HTMLElement;

beforeEach(() => {
  vi.useFakeTimers();
  section = document.createElement("section");
  slot = document.createElement("div");
  section.append(slot);
  document.body.append(section);
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

const holding = () => section.hasAttribute("data-count-hold");
const stage = () => slot.dataset.avatarStage;

describe("AvatarSignals", () => {
  it("marks the 70 % crossing on the slot", () => {
    const s = createAvatarSignals(slot, section);
    expect(s.triggered).toBe(false);
    s.setTriggered();
    expect(s.triggered).toBe(true);
    expect(slot.hasAttribute("data-avatar-inview")).toBe(true);
  });

  it("ready while off screen: swap to 3D at once; already past if triggered", () => {
    const s = createAvatarSignals(slot, section);
    s.setTriggered();
    s.setInView(false);
    expect(s.ready()).toEqual({ alreadyPast: true });
    expect(stage()).toBe("3d");
  });

  it("ready while on screen: keep the image until the intro starts", () => {
    const s = createAvatarSignals(slot, section);
    s.setInView(true);
    expect(s.ready()).toEqual({ alreadyPast: false });
    expect(stage()).toBeUndefined();
    s.started();
    expect(stage()).toBe("3d");
  });

  it("holds the counters until the avatar says so", () => {
    const s = createAvatarSignals(slot, section);
    s.hold();
    expect(holding()).toBe(true);
    s.setTriggered();
    s.started();
    vi.advanceTimersByTime(GLB_GRACE_MS * 2);
    expect(holding()).toBe(true); // intro running: the grace timer is off
    s.counters();
    expect(holding()).toBe(false);
  });

  it("releases the counters 1.5 s after the trigger if the intro hasn't started", () => {
    const s = createAvatarSignals(slot, section);
    s.hold();
    s.setTriggered();
    vi.advanceTimersByTime(GLB_GRACE_MS - 1);
    expect(holding()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(holding()).toBe(false);
  });

  it("lost: image back, counters free, and no new hold afterwards", () => {
    const s = createAvatarSignals(slot, section);
    s.hold();
    s.setInView(false);
    s.ready();
    s.lost();
    expect(stage()).toBeUndefined();
    expect(holding()).toBe(false);
    s.hold();
    expect(holding()).toBe(false);
  });

  it("dispose clears its attributes and timers", () => {
    const s = createAvatarSignals(slot, section);
    s.hold();
    s.setTriggered();
    s.started();
    s.dispose();
    expect(holding()).toBe(false);
    expect(stage()).toBeUndefined();
    expect(slot.hasAttribute("data-avatar-inview")).toBe(false);
  });
});
```

Run: `pnpm vitest run src/features/about/avatar/avatar-path.test.ts src/features/about/avatar/avatar-signals.test.ts` → FAIL.

- [ ] **Step 2: Implement**

`avatar-path.ts`:

```ts
import { decideGate, type GateEnv } from "@/shared/three/decide-gate";
import type { RenderTier } from "@/shared/three/detect-tier";

export type AvatarPath = "fallback" | "low" | "3d";

/**
 * fallback: static idle image (reduced motion, no WebGL, Save-Data).
 * low: image animation only, never downloads avatar.glb (touch, small, or
 * the shared tier is already Low). 3d: the canvas mounts near About.
 */
export function decideAvatarPath(env: GateEnv, tier: RenderTier): AvatarPath {
  if (decideGate(env) === "fallback") return "fallback";
  return env.isDesktop && tier !== "low" ? "3d" : "low";
}
```

`avatar-signals.ts`:

```ts
/** Mount the canvas and fetch the GLB this far before About (spec §4). */
export const MOUNT_MARGIN = "400px 0px";
/** Equivalent of ScrollTrigger "top 70%": the slot's top crossed 70 % of the viewport. */
export const START_MARGIN = "0px 0px -30% 0px";
/** Counters stop waiting if the intro hasn't started this long after the trigger (spec §6). */
export const GLB_GRACE_MS = 1500;

const HOLD = "data-count-hold";

// The gate (initial bundle) and the about-avatar chunk talk through this
// object, not React state: the canvas reads the flags per frame and calls back
// on events. It owns the attributes CSS and the count effect react to.
export interface AvatarSignals {
  /** The slot crossed the 70 % line (or was already above the viewport). */
  readonly triggered: boolean;
  /** The slot intersects the viewport right now. */
  readonly inView: boolean;
  /** The model is mounted. alreadyPast: the visitor went past About meanwhile. */
  ready(): { alreadyPast: boolean };
  /** First frame of the intro. */
  started(): void;
  /** timings.countersStart reached, or a short start path began. */
  counters(): void;
  /** The 3D avatar is gone (error, context loss, perf Off, drop to Low). */
  lost(): void;
}

export interface GateSignals extends AvatarSignals {
  /** 3D path chosen: About's counters wait for the avatar. */
  hold(): void;
  setTriggered(): void;
  setInView(inView: boolean): void;
  dispose(): void;
}

type Clock = Pick<Window, "setTimeout" | "clearTimeout">;

export function createAvatarSignals(
  slot: HTMLElement,
  section: HTMLElement | null,
  clock: Clock = window
): GateSignals {
  let triggered = false;
  let inView = false;
  let started = false;
  let lost = false;
  let grace: number | undefined;

  const stopGrace = () => {
    if (grace !== undefined) clock.clearTimeout(grace);
    grace = undefined;
  };
  const release = () => {
    stopGrace();
    section?.removeAttribute(HOLD);
  };
  const setStage = (on: boolean) => {
    if (on) slot.dataset.avatarStage = "3d";
    else delete slot.dataset.avatarStage;
  };

  return {
    get triggered() {
      return triggered;
    },
    get inView() {
      return inView;
    },
    hold() {
      if (!lost) section?.setAttribute(HOLD, "");
    },
    setTriggered() {
      if (triggered) return;
      triggered = true;
      slot.setAttribute("data-avatar-inview", "");
      if (section?.hasAttribute(HOLD) && !started) {
        grace = clock.setTimeout(release, GLB_GRACE_MS);
      }
    },
    setInView(next) {
      inView = next;
    },
    ready() {
      // Off screen nobody sees the swap; on screen it waits for the intro.
      if (!inView) setStage(true);
      return { alreadyPast: triggered && !inView };
    },
    started() {
      started = true;
      stopGrace();
      setStage(true);
    },
    counters: release,
    lost() {
      lost = true;
      setStage(false);
      release();
    },
    dispose() {
      release();
      setStage(false);
      slot.removeAttribute("data-avatar-inview");
    }
  };
}
```

Run the two tests → PASS.

- [ ] **Step 3: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test` → green.

```bash
git add src/features/about/avatar/avatar-path.ts src/features/about/avatar/avatar-path.test.ts src/features/about/avatar/avatar-signals.ts src/features/about/avatar/avatar-signals.test.ts
git commit -m "feat(about): avatar path decision and gate/canvas signals

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: About canvas and gate (the avatar comes back, in About)

**Files:**
- Create: `src/features/about/avatar/AboutAvatarGate.tsx`, `src/features/about/avatar/AboutAvatarCanvas.tsx`
- Modify: `src/features/about/avatar/{Avatar.tsx,AboutAvatarSlot.tsx,AboutAvatarSlot.test.tsx}`

**Interfaces:**
- Consumes: Task 1 (`useAvatarIntro.start/started/advance`, `aboutFrame`, `AVATAR.camera.fov`, `AccentColor`/`useAccentColor`, `pose.counters`), Task 2 (`qualityStore`, `TIER_DPR`, `readTierEnv`, `monitorBounds`, `declineAction`, `readGateEnv`), Task 4 (`decideAvatarPath`, `createAvatarSignals`, `AvatarSignals`, `MOUNT_MARGIN`, `START_MARGIN`).
- Produces: slot attributes `data-gate` (`pending` | `mount` | `fallback`), `data-tier="low"` on the Low path, `data-gl-calls|geometries|textures` while the canvas runs; `AvatarProps` = `{ tier, slot, bubble, accent, signals, onFail }`.

- [ ] **Step 1: Wire the signals into `Avatar.tsx`**

- Imports: add `import type { AvatarSignals } from "./avatar-signals";`; add `useLoader.preload` call at module scope after `withMeshopt`:

```ts
// The about-avatar chunk loads only when the gate mounts the canvas near
// About, so fetching here starts the GLB as early as allowed (spec §5.1).
useLoader.preload(GLTFLoader, AVATAR.url, withMeshopt);
```

- `AvatarProps` gains:

```ts
  /** Gate ↔ canvas channel (avatar-signals.ts). */
  signals: AvatarSignals;
  /** The 3D avatar is gone for good: the gate shows the static image. */
  onFail: () => void;
```

- In `AvatarScene({ tier, slot, bubble, accent, signals, onFail })` add refs and an effect:

```ts
  const alreadyPast = useRef(false);
  const countersSent = useRef(false);
  const failed = useRef(false);

  // Runs once the GLB has loaded (Suspense resolved), even while the canvas
  // isn't rendering off screen.
  useEffect(() => {
    alreadyPast.current = signals.ready().alreadyPast;
  }, [signals]);
```

- In `useFrame`, replace `if (!intro.started()) intro.start(false); // Task 5 …` with:

```ts
    if (!intro.started()) {
      if (!signals.triggered) return; // waits for the 70 % line, image still showing
      intro.start(alreadyPast.current);
      signals.started();
    }
```

  After `const pose = intro.advance(dt);` add:

```ts
    if (pose.counters && !countersSent.current) {
      countersSent.current = true;
      signals.counters();
    }
```

  Replace the tier-fade block with:

```ts
    // Runtime drop to Low (PerformanceMonitor): fade out, then hand over to
    // the static image (the gate unmounts the canvas).
    if (tierRef.current === "low") {
      tierOpacity.current = Math.max(
        0,
        tierOpacity.current - dt / AVATAR.tierFadeOut
      );
      if (tierOpacity.current === 0 && !failed.current) {
        failed.current = true;
        onFail();
      }
    }
```

- `AvatarBoundary` gets an `onFail` prop: props type `{ slot: HTMLElement; onFail: () => void; children: ReactNode }`; in `componentDidCatch` call `this.props.onFail();` after `markFailed(...)`. In the default export: `<AvatarBoundary slot={props.slot} onFail={props.onFail}>`.

- [ ] **Step 2: Create `AboutAvatarCanvas.tsx`**

```tsx
"use client";

import {
  PerformanceMonitor,
  type PerformanceMonitorApi
} from "@react-three/drei/core/PerformanceMonitor";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import { TIER_DPR } from "@/shared/three/detect-tier";
import { declineAction, monitorBounds } from "@/shared/three/perf-policy";
import { qualityStore } from "@/shared/three/quality-store";
import Avatar from "./Avatar";
import { AVATAR } from "./avatar.config";
import type { AvatarSignals } from "./avatar-signals";
import { aboutFrame } from "./choreography";
import { useAccentColor } from "./useAccentColor";

const FRAME = aboutFrame(AVATAR.camera.fov);

export interface AboutAvatarCanvasProps {
  slot: HTMLElement;
  signals: AvatarSignals;
  bubble: string;
  onFail: () => void;
}

// Renders only while the slot is on screen (design D1): leaving pauses the
// intro clock, coming back resumes it.
function useInView(el: Element): boolean {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setInView(entry?.isIntersecting ?? true)
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  return inView;
}

// Renderer counters on the slot for the e2e leak and draw-call checks.
function GlStats({ slot }: { slot: HTMLElement }) {
  const frame = useRef(0);
  useFrame(({ gl }) => {
    frame.current += 1;
    if (frame.current % 30 !== 1) return;
    slot.dataset.glGeometries = String(gl.info.memory.geometries);
    slot.dataset.glTextures = String(gl.info.memory.textures);
    slot.dataset.glCalls = String(gl.info.render.calls);
  });
  return null;
}

// Entry of the about-avatar chunk.
export default function AboutAvatarCanvas({
  slot,
  signals,
  bubble,
  onFail
}: AboutAvatarCanvasProps) {
  const level = useStore(qualityStore, (state) => state.level ?? "low");
  const visible = useInView(slot);
  const accent = useAccentColor();

  // Our own Off rule (perf-policy), never drei's flipflops/onFallback.
  const onDecline = (api: PerformanceMonitorApi) => {
    const action = declineAction(level, api.averages);
    if (action === "downgrade") qualityStore.getState().downgrade();
    else if (action === "off") onFail();
  };

  return (
    <Canvas
      dpr={TIER_DPR[level]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      // Looks straight down -Z: the avatar at end.z is screenHeight of the slot.
      camera={{
        fov: AVATAR.camera.fov,
        near: 0.1,
        far: 30,
        position: [0, FRAME.cameraY, FRAME.cameraZ]
      }}
      flat
      frameloop={visible ? "always" : "never"}
      eventSource={slot}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden="true"
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.domElement.addEventListener(
          "webglcontextlost",
          (event) => {
            event.preventDefault();
            gl.forceContextLoss = () => {}; // already lost; avoid three's warning
            onFail();
          },
          { once: true }
        );
      }}
    >
      {/* Same levels as the Hero (physically based lights + flat). */}
      <ambientLight intensity={1.6} />
      <directionalLight position={[3, 4, 5]} intensity={2.4} />
      <PerformanceMonitor
        bounds={(refreshrate) => monitorBounds(level, refreshrate)}
        onDecline={onDecline}
      />
      <Avatar
        tier={level}
        slot={slot}
        bubble={bubble}
        accent={accent}
        signals={signals}
        onFail={onFail}
      />
      <GlStats slot={slot} />
    </Canvas>
  );
}
```

- [ ] **Step 3: Create `AboutAvatarGate.tsx`**

```tsx
"use client";

import dynamic from "next/dynamic";
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import { readGateEnv } from "@/shared/three/decide-gate";
import { readTierEnv } from "@/shared/three/detect-tier";
import { qualityStore } from "@/shared/three/quality-store";
import { decideAvatarPath } from "./avatar-path";
import {
  MOUNT_MARGIN,
  START_MARGIN,
  createAvatarSignals,
  type GateSignals
} from "./avatar-signals";

// The only avatar code in the initial bundle. three.js, the canvas and the
// avatar load in the about-avatar chunk once this gate decides to mount.
const AboutAvatarCanvas = dynamic(
  () =>
    import(/* webpackChunkName: "about-avatar" */ "./AboutAvatarCanvas"),
  { ssr: false, loading: () => null }
);

const SLOT_ID = "about-avatar-slot";
const FADE_OUT_MS = 300;

class CanvasBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[about-avatar] canvas failed, showing the image", error);
    }
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

interface Live {
  slot: HTMLElement;
  signals: GateSignals;
}

export function AboutAvatarGate({ bubble }: { bubble: string }) {
  const [live, setLive] = useState<Live | null>(null);
  const liveRef = useRef<Live | null>(null);
  const failedRef = useRef(false);

  // One path for every loss of the 3D avatar (design D8): static idle image,
  // counters released, canvas unmounted after the fade.
  const fail = useCallback(() => {
    const current = liveRef.current;
    if (!current || failedRef.current) return;
    failedRef.current = true;
    current.slot.dataset.gate = "fallback";
    current.signals.lost();
    window.setTimeout(() => setLive(null), FADE_OUT_MS);
  }, []);

  useEffect(() => {
    const slot = document.getElementById(SLOT_ID);
    if (!slot) return;
    const signals = createAvatarSignals(slot, slot.closest("section"));
    const tier = qualityStore.getState().init(readTierEnv());
    const path = decideAvatarPath(readGateEnv(), tier);

    if (path === "fallback") {
      slot.dataset.gate = "fallback";
      return () => signals.dispose();
    }
    slot.dataset.gate = "pending";
    if (path === "low") slot.dataset.tier = "low";
    else signals.hold();

    // "top 70%" without GSAP. A slot already above the viewport (landing on
    // #contact) counts as crossed.
    const start = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
          signals.setTriggered();
          start.disconnect();
        }
      },
      { rootMargin: START_MARGIN }
    );
    start.observe(slot);

    const visible = new IntersectionObserver(([entry]) =>
      signals.setInView(entry?.isIntersecting ?? false)
    );
    visible.observe(slot);

    let mount: IntersectionObserver | undefined;
    const armMount = () => {
      mount = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          mount?.disconnect();
          // The Hero canvas may have stepped the shared tier down meanwhile.
          if (qualityStore.getState().level === "low") {
            slot.dataset.tier = "low";
            signals.lost();
            return;
          }
          slot.dataset.gate = "mount";
          const next = { slot, signals };
          liveRef.current = next;
          setLive(next);
        },
        { rootMargin: MOUNT_MARGIN }
      );
      mount.observe(slot);
    };
    // The slot can start inside the 400px margin on a short desktop viewport;
    // waiting for the first scroll keeps the chunk and the GLB off the initial
    // load (design D8).
    if (path === "3d") {
      window.addEventListener("scroll", armMount, { once: true, passive: true });
    }

    return () => {
      window.removeEventListener("scroll", armMount);
      start.disconnect();
      visible.disconnect();
      mount?.disconnect();
      signals.dispose();
      liveRef.current = null;
      failedRef.current = false;
    };
  }, []);

  if (!live) return null;
  return (
    <CanvasBoundary onError={fail}>
      <AboutAvatarCanvas
        slot={live.slot}
        signals={live.signals}
        bubble={bubble}
        onFail={fail}
      />
    </CanvasBoundary>
  );
}
```

- [ ] **Step 4: Put the gate in the slot**

`AboutAvatarSlot.tsx`: add `import { AboutAvatarGate } from "./AboutAvatarGate";`, rename the prop back to `{ bubble }: { bubble: string }`, and render `<AboutAvatarGate bubble={bubble} />` after `<AvatarFallback />`. Update its comment's last sentence to `The gate adds the 3D canvas near About.` In `AboutAvatarSlot.test.tsx` add back `vi.mock("./AboutAvatarGate", () => ({ AboutAvatarGate: () => null }));` above the dynamic import.

- [ ] **Step 5: Register the client files in CLAUDE.md now (lint/reviewers read it)**

In CLAUDE.md's "Server Components are the default" bullet, add after `features/hero/canvas/HeroCanvasGate.tsx (decides whether the 3D canvas mounts)`: `, and features/about/avatar/AboutAvatarGate.tsx (decides whether the About avatar canvas mounts)`. (Task 8 does the rest of CLAUDE.md.)

- [ ] **Step 6: Verify unit, then build and measure budgets**

Run: `pnpm lint && pnpm typecheck && pnpm test` → green.
Run: `pnpm build && pnpm test:e2e e2e/hero-3d.spec.ts -g "3D chunk"` → initial ≤ 150 KB and Hero 3D ≤ 250 KB still pass (log both numbers).
Measure the about chunk by hand until Task 7 adds the test: `pnpm start`, open Chrome DevTools Network (JS filter) on `http://localhost:3000/en`, wait for the Hero canvas, clear the log, scroll to About; sum the transferred JS (gzip). Expected ≤ 26 KB. **If over 26 KB, stop and report the number.**

- [ ] **Step 7: Check framing and the swap by eye (`pnpm dev`)**

Open `http://localhost:3000/en` at 1440×900, scroll to About:
- the avatar walks from the back, waves with the bubble, idles; head follows the mouse; clicking it waves again;
- during the wave the raised hand and the head stay inside the slot, the bubble is fully visible (if clipped, lower `AVATAR.bubbleOffset` or move the bubble's `position` x by +0.25 and re-check);
- reload while About is on screen (session flag set): the image fades out under the avatar at the same spot — feet within ~8px (compare a screenshot just before and after); if not, adjust `fallback.idle.anchorX`/`fallback.idle.scale`.
Record any config change in the commit message.

- [ ] **Step 8: Commit**

```bash
git add -A src CLAUDE.md
git commit -m "feat(about): lazy About canvas and gate; the avatar greets in About

Mounts after the first scroll within 400px of About, starts at the 70 %
line, pauses off screen, skips to idle when the visitor is already past.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Counters wait for the wave (`count` hold)

**Files:**
- Modify: `src/shared/animation/effects/count.ts`, `src/shared/animation/effects/count.test.ts`, `src/shared/animation/testing/fake-libs.ts`

**Interfaces:**
- Consumes: `data-count-hold` on `#about` (set/removed by `AvatarSignals`, Task 4).
- Produces: `count` starts on its own `ScrollTrigger` (`top 90%`, `once`) `onEnter`; under a hold it waits for the attribute's removal, or `HOLD_SAFETY_S = 4` seconds after `onEnter`.

- [ ] **Step 1: Add `delayedCall` to the fakes**

In `createFakeLibs`'s `gsap` object add: `delayedCall: vi.fn((..._args: unknown[]) => tween()),`.

- [ ] **Step 2: Rewrite the count tests (failing)**

Replace `count.test.ts` with:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { createFakeContext, placeBelowFold } from "../testing/fake-libs";
import { HOLD_SAFETY_S, count } from "./count";

type ToVars = { value: number; onUpdate: () => void; scrollTrigger?: object };

function mount(text: string, host: HTMLElement = document.body) {
  const el = document.createElement("dd");
  el.textContent = text;
  host.append(el);
  return el;
}

function enter(fake: ReturnType<typeof createFakeContext>) {
  const [vars] = fake.ScrollTrigger.create.mock.calls[0] as [
    { trigger: Element; start: string; once: boolean; onEnter: () => void }
  ];
  vars.onEnter();
  return vars;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  document.body.innerHTML = "";
});

describe("count", () => {
  it("leaves on-screen numbers alone", () => {
    const el = mount("8");
    const fake = createFakeContext();
    count.run(el, fake.ctx);
    expect(fake.ScrollTrigger.create).not.toHaveBeenCalled();
    expect(el.textContent).toBe("8");
  });

  it("leaves ranges alone", () => {
    const el = mount("1–3s");
    placeBelowFold(el);
    const fake = createFakeContext();
    count.run(el, fake.ctx);
    expect(fake.ScrollTrigger.create).not.toHaveBeenCalled();
  });

  it("counts up from zero on its trigger, keeping the final value for assistive tech", () => {
    const el = mount("40+");
    placeBelowFold(el);
    const fake = createFakeContext();
    const cleanup = count.run(el, fake.ctx);

    expect(el.textContent).toBe("0+");
    expect(el.getAttribute("aria-label")).toBe("40+");
    expect(fake.gsap.to).not.toHaveBeenCalled();
    expect(enter(fake)).toMatchObject({ trigger: el, start: "top 90%", once: true });

    const [state, vars] = fake.gsap.to.mock.calls[0] as [{ value: number }, ToVars];
    expect(vars.value).toBe(40);
    expect(vars.scrollTrigger).toBeUndefined();
    state.value = 21.6;
    vars.onUpdate();
    expect(el.textContent).toBe("22+");

    cleanup?.();
    expect(el.textContent).toBe("40+");
    expect(el.hasAttribute("aria-label")).toBe(false);
  });

  it("keeps decimals", () => {
    const el = mount("12.6k");
    placeBelowFold(el);
    count.run(el, createFakeContext().ctx);
    expect(el.textContent).toBe("0.0k");
  });

  it("counts 1.5 with one decimal and restores it", () => {
    const el = mount("1.5");
    placeBelowFold(el);
    const fake = createFakeContext();
    const cleanup = count.run(el, fake.ctx);
    expect(el.textContent).toBe("0.0");
    enter(fake);
    const [state, vars] = fake.gsap.to.mock.calls[0] as [{ value: number }, ToVars];
    expect(vars.value).toBe(1.5);
    state.value = 0.75;
    vars.onUpdate();
    expect(el.textContent).toBe("0.8");
    cleanup?.();
    expect(el.textContent).toBe("1.5");
  });
});

describe("count under data-count-hold (About avatar)", () => {
  function held() {
    const host = document.createElement("section");
    host.setAttribute("data-count-hold", "");
    document.body.append(host);
    const el = mount("4", host);
    placeBelowFold(el);
    return { host, el };
  }

  it("waits on its trigger until the hold is removed", async () => {
    const { host, el } = held();
    const fake = createFakeContext();
    count.run(el, fake.ctx);
    enter(fake);
    expect(fake.gsap.to).not.toHaveBeenCalled();
    host.removeAttribute("data-count-hold");
    await flush(); // MutationObserver callbacks are microtasks
    expect(fake.gsap.to).toHaveBeenCalledTimes(1);
  });

  it("starts at once if the hold is already gone when the stat enters", () => {
    const { host, el } = held();
    const fake = createFakeContext();
    count.run(el, fake.ctx);
    host.removeAttribute("data-count-hold");
    enter(fake);
    expect(fake.gsap.to).toHaveBeenCalledTimes(1);
  });

  it("never blocks: starts HOLD_SAFETY_S after its trigger anyway", () => {
    const { el } = held();
    const fake = createFakeContext();
    count.run(el, fake.ctx);
    enter(fake);
    const [delay, start] = fake.gsap.delayedCall.mock.calls[0] as [number, () => void];
    expect(delay).toBe(HOLD_SAFETY_S);
    expect(HOLD_SAFETY_S).toBe(4);
    start();
    start(); // a later release must not count twice
    expect(fake.gsap.to).toHaveBeenCalledTimes(1);
  });

  it("cleanup stops waiting and kills a running count", async () => {
    const { host, el } = held();
    const fake = createFakeContext();
    const cleanup = count.run(el, fake.ctx);
    enter(fake);
    cleanup?.();
    host.removeAttribute("data-count-hold");
    await flush();
    expect(fake.gsap.to).not.toHaveBeenCalled();
    const safety = fake.gsap.delayedCall.mock.results[0]!.value as { kill: () => void };
    expect(safety.kill).toHaveBeenCalled();
  });
});
```

Run: `pnpm vitest run src/shared/animation/effects/count.test.ts` → FAIL.

- [ ] **Step 3: Implement**

`count.ts`:

```ts
import type { MotionEffectDef } from "../types";
import { isAtOrAboveViewport } from "../viewport";
import { parseStat } from "./parse-stat";

const HOLD = "data-count-hold";
/** Under a hold, start anyway this long after the stat's own trigger. */
export const HOLD_SAFETY_S = 4;

type Killable = { kill: () => void };

export const count: MotionEffectDef = {
  run(el, { gsap, ScrollTrigger }) {
    const finalText = el.textContent ?? "";
    const stat = parseStat(finalText);
    if (!stat || isAtOrAboveViewport(el)) return;

    const render = (value: number) => {
      el.textContent = `${value.toFixed(stat.decimals)}${stat.suffix}`;
    };
    const state = { value: 0 };
    el.setAttribute("aria-label", finalText);
    render(0);

    // Created from callbacks, outside the effect's gsap context: killed here.
    let tween: Killable | undefined;
    let safety: Killable | undefined;
    let observer: MutationObserver | undefined;
    let done = false;
    const start = () => {
      if (done) return;
      done = true;
      observer?.disconnect();
      safety?.kill();
      tween = gsap.to(state, {
        value: stat.value,
        duration: 1.2,
        ease: "power2.out",
        onUpdate: () => render(state.value)
      });
    };

    ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: () => {
        // About holds its counters until the 3D avatar waves (spec 5C §6).
        const host = el.closest(`[${HOLD}]`);
        if (!host) return start();
        observer = new MutationObserver(() => {
          if (!host.hasAttribute(HOLD)) start();
        });
        observer.observe(host, { attributes: true, attributeFilter: [HOLD] });
        safety = gsap.delayedCall(HOLD_SAFETY_S, start);
      }
    });

    return () => {
      done = true;
      observer?.disconnect();
      safety?.kill();
      tween?.kill();
      el.textContent = finalText;
      el.removeAttribute("aria-label");
    };
  }
};
```

Run the tests → PASS.

- [ ] **Step 4: Verify**

Run: `pnpm lint && pnpm typecheck && pnpm test` → green.
Run: `pnpm build && pnpm test:e2e e2e/motion.spec.ts e2e/home.spec.ts` → green (motion chunk ≤ 70 KB still).

- [ ] **Step 5: Commit**

```bash
git add src/shared/animation
git commit -m "feat(motion): count waits on data-count-hold, with a 4 s safety start

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: E2E for the About avatar, budgets and visual snapshots

**Files:**
- Create: `e2e/about-avatar.spec.ts`, `e2e/about-avatar-visual.spec.ts`, `e2e/helpers/gl.ts`
- Modify: `e2e/helpers/scripts.ts` (delete `splitAvatarChunks`), `e2e/hero-3d.spec.ts`

**Interfaces:**
- Consumes: slot `#about-avatar-slot` with `data-avatar-phase`, `data-gate`, `data-tier`, `data-avatar-stage`, `data-avatar-hover`, `data-gl-calls`; `.about-avatar-bubble[data-visible]`; `#about[data-count-hold]`.
- Produces: `trackLiveGl(page): Promise<() => Promise<number>>` in `e2e/helpers/gl.ts`.

- [ ] **Step 1: Shared GL helper and Hero spec updates**

`e2e/helpers/gl.ts`:

```ts
import type { Page } from "@playwright/test";

// Counts live WebGL contexts (created and not lost). The gates' support
// probes lose theirs at once; R3F force-loses on unmount, so a leaked
// renderer stays live and shows up here.
export async function trackLiveGl(page: Page): Promise<() => Promise<number>> {
  await page.addInitScript(() => {
    const contexts = new Set<WebGLRenderingContext | WebGL2RenderingContext>();
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...rest: unknown[]
    ) {
      const ctx = (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
      if (ctx && (type === "webgl" || type === "webgl2" || type === "experimental-webgl")) {
        contexts.add(ctx as WebGLRenderingContext);
      }
      return ctx;
    } as typeof original;
    (window as unknown as { __liveGl: () => number }).__liveGl = () =>
      [...contexts].filter((c) => !c.isContextLost()).length;
  });
  return () =>
    page.evaluate(() => (window as unknown as { __liveGl: () => number }).__liveGl());
}
```

In `e2e/hero-3d.spec.ts`:
- Budget test: replace `const { rest: canvasChunks } = await splitAvatarChunks(scripts.lazy());` with `const canvasChunks = scripts.lazy();` and drop `splitAvatarChunks` from the import.
- 10-round-trip test: replace its inline `addInitScript` + `liveContexts` with `const liveContexts = await trackLiveGl(page);` (import from `./helpers/gl`). Returning to `/en#work` puts About within its mount margin after a scroll, so the About canvas may be live too: change both `expect(await liveContexts()).toBe(1)` / `await expect.poll(liveContexts).toBe(1)` to `toBeLessThanOrEqual(2)` with the comment `// Hero + (maybe) About; never more (spec §9).` Keep `toBe(0)` on the case-study page.
- `e2e/helpers/scripts.ts`: delete `splitAvatarChunks` and its comment.

- [ ] **Step 2: Write `e2e/about-avatar.spec.ts`**

```ts
import { expect, test, type Page } from "@playwright/test";
import { trackLiveGl } from "./helpers/gl";
import { collectConsoleProblems, gzipBytes, trackScripts } from "./helpers/scripts";

// Measured 24.5 KB as hero-avatar after Phase 5B; kept for about-avatar (design D3).
const AVATAR_BUDGET_BYTES = 26 * 1024;

const slot = (page: Page) => page.locator("#about-avatar-slot");
const pose = (page: Page, name: "wave" | "idle") =>
  page.locator(`#about-avatar-slot [data-avatar-pose="${name}"]`);
const stats = (page: Page) => page.locator("#about dl dd");
const isGlb = (url: string) => url.endsWith("/models/avatar.glb");

function trackGlb(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (request) => {
    if (isGlb(request.url())) urls.push(request.url());
  });
  return urls;
}

// Records every data-avatar-phase value on the About slot, in order.
async function recordPhases(page: Page) {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __phases: string[] }).__phases = seen;
    new MutationObserver(() => {
      const phase = document.getElementById("about-avatar-slot")?.dataset.avatarPhase;
      if (phase && seen.at(-1) !== phase) seen.push(phase);
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-avatar-phase"] });
  });
  return () => page.evaluate(() => (window as unknown as { __phases: string[] }).__phases);
}

const heroLive = (page: Page) =>
  expect(page.locator("[data-hero-graph]")).toHaveAttribute("data-gate", "live", { timeout: 15_000 });

/** Scrolls so the slot's top sits at `fraction` of the viewport height. */
async function scrollSlotTo(page: Page, fraction: number) {
  await page.evaluate((f) => {
    const el = document.getElementById("about-avatar-slot")!;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, Math.max(0, top - window.innerHeight * f));
  }, fraction);
}

const scrollToTop = (page: Page) => page.evaluate(() => window.scrollTo(0, 0));
const scrollToBottom = (page: Page) =>
  page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

test.describe("About avatar on desktop", () => {
  test("initial load: no avatar code, no avatar.glb, nothing in the Hero", async ({ page }) => {
    const glb = trackGlb(page);
    const scripts = trackScripts(page);
    await scripts.goto("/en");
    await heroLive(page);
    const lazyAtLive = scripts.lazy().length;
    await page.waitForTimeout(2000);
    expect(glb).toEqual([]);
    expect(scripts.lazy()).toHaveLength(lazyAtLive);
    await expect(page.locator("#top [data-avatar-phase], #top [data-avatar-pose]")).toHaveCount(0);
    await expect(slot(page).locator("canvas")).toHaveCount(0);
    await expect(slot(page)).toHaveAttribute("data-gate", "pending");
  });

  test("near About: avatar.glb once; then enter → walk → wave → idle within 6 s, bubble in wave", async ({ page }) => {
    const problems = collectConsoleProblems(page);
    const glb = trackGlb(page);
    const phases = await recordPhases(page);
    await page.goto("/en");
    await heroLive(page);
    const loaded = page.waitForResponse((r) => isGlb(r.url()), { timeout: 20_000 });
    await scrollSlotTo(page, 1.2); // ~20 % of a viewport below the fold: inside 400px
    await (await loaded).finished();
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "wave", { timeout: 6_000 });
    await expect(page.locator(".about-avatar-bubble[data-visible]")).toBeVisible();
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", { timeout: 6_000 });
    expect(await phases()).toEqual(["enter", "walk", "wave", "idle"]);
    await expect(pose(page, "idle")).toBeHidden(); // the 3D avatar stands there
    expect(glb).toHaveLength(1);
    expect(problems).toEqual([]);
  });

  test("leaving during the walk pauses; coming back resumes; never replays", async ({ page }) => {
    const phases = await recordPhases(page);
    await page.goto("/en");
    await heroLive(page);
    await scrollSlotTo(page, 1.2);
    await page.waitForResponse((r) => isGlb(r.url()), { timeout: 20_000 });
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "walk", { timeout: 10_000 });
    await scrollToTop(page);
    await page.waitForTimeout(3000);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "walk"); // paused
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", { timeout: 6_000 });
    await scrollToTop(page);
    await scrollSlotTo(page, 0.3);
    await page.waitForTimeout(1000);
    expect(await phases()).toEqual(["enter", "walk", "wave", "idle"]);
  });

  test("scrolling past About before the model loads lands in idle on return", async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/models/avatar.glb", async (route) => {
      await held;
      await route.continue();
    });
    const phases = await recordPhases(page);
    await page.goto("/en");
    await heroLive(page);
    await scrollSlotTo(page, 1.2);
    await scrollSlotTo(page, 0.3); // crosses the 70 % line
    await page.waitForTimeout(300);
    await scrollToBottom(page);
    release();
    await page.waitForResponse((r) => isGlb(r.url()), { timeout: 20_000 });
    await page.waitForTimeout(1000);
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", { timeout: 6_000 });
    expect(await phases()).toEqual(["idle"]);
  });

  test("counters wait for the wave, then count to their final values", async ({ page }) => {
    await page.goto("/en");
    await heroLive(page);
    await page.mouse.move(200, 200);
    await expect(page.locator("html")).toHaveAttribute("data-motion-ready", "", { timeout: 10_000 });
    await scrollSlotTo(page, 1.2);
    await page.waitForResponse((r) => isGlb(r.url()), { timeout: 20_000 });
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "walk", { timeout: 10_000 });
    await expect(stats(page).first()).toHaveText("0");
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", { timeout: 6_000 });
    await expect(stats(page)).toHaveText(["4", "3", "1.5"], { timeout: 5_000 });
  });

  // Review Focus 5
  test("a failed avatar.glb shows the idle image, frees the counters, leaves the Hero live", async ({ page }) => {
    await page.route("**/models/avatar.glb", (route) => route.fulfill({ status: 404 }));
    await page.goto("/en");
    await heroLive(page);
    await page.mouse.move(200, 200);
    await scrollSlotTo(page, 1.2);
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-gate", "fallback", { timeout: 15_000 });
    await expect(pose(page, "idle")).toBeVisible();
    await expect(pose(page, "wave")).toBeHidden();
    await expect(slot(page).locator("canvas")).toHaveCount(0, { timeout: 2_000 });
    await expect(page.locator("#about")).not.toHaveAttribute("data-count-hold", "");
    await expect(stats(page)).toHaveText(["4", "3", "1.5"], { timeout: 10_000 });
    await expect(page.locator("[data-hero-graph]")).toHaveAttribute("data-gate", "live");
  });

  test("a same-session reload only waves", async ({ page }) => {
    const phases = await recordPhases(page);
    await page.goto("/en");
    await heroLive(page);
    await scrollSlotTo(page, 1.2);
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", { timeout: 20_000 });
    await scrollToTop(page);
    await page.reload();
    await heroLive(page);
    await scrollSlotTo(page, 1.2);
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", { timeout: 20_000 });
    expect(await phases()).toEqual(["wave", "idle"]);
  });

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
    await heroLive(page);
    await scrollSlotTo(page, 1.2);
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", { timeout: 20_000 });
    expect((await phases())[0]).toBe("enter");
  });

  test("hover sets the avatar cursor; a click in idle waves again", async ({ page }) => {
    const phases = await recordPhases(page);
    await page.goto("/en");
    await heroLive(page);
    await scrollSlotTo(page, 1.2);
    await scrollSlotTo(page, 0.15);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", { timeout: 20_000 });
    const box = (await slot(page).boundingBox())!;
    const target = { x: box.x + box.width / 2, y: box.y + box.height * 0.5 };
    await page.mouse.move(target.x, target.y, { steps: 4 });
    await expect(slot(page)).toHaveAttribute("data-avatar-hover", "");
    const before = (await phases()).length;
    await page.mouse.click(target.x, target.y);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", { timeout: 5_000 });
    expect((await phases()).slice(before)).toEqual(["wave", "idle"]);
  });

  test("≤ 3 draw calls in About and ≤ 2 live WebGL contexts", async ({ page }) => {
    const liveGl = await trackLiveGl(page);
    await page.goto("/en");
    await heroLive(page);
    await scrollSlotTo(page, 1.2);
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", { timeout: 20_000 });
    await expect.poll(async () => Number(await slot(page).getAttribute("data-gl-calls"))).toBeGreaterThan(0);
    expect(Number(await slot(page).getAttribute("data-gl-calls"))).toBeLessThanOrEqual(3);
    expect(await liveGl()).toBeLessThanOrEqual(2);
  });

  test("the about-avatar chunk stays under its cap", async ({ page }) => {
    const scripts = trackScripts(page);
    await scripts.goto("/en");
    await heroLive(page);
    await page.waitForTimeout(1000);
    const before = new Set(scripts.lazy().map((r) => r.url()));
    await scrollSlotTo(page, 1.2);
    await page.waitForResponse((r) => isGlb(r.url()), { timeout: 20_000 });
    const added = scripts.lazy().filter((r) => !before.has(r.url()));
    const bytes = await gzipBytes(added);
    console.log(`about-avatar: ${(bytes / 1024).toFixed(1)} KB gzip (${added.length} file(s))`);
    expect(added.length).toBeGreaterThan(0);
    expect(bytes).toBeLessThanOrEqual(AVATAR_BUDGET_BYTES);
  });

  // Review Focus 2
  test("landing on #contact requests no avatar.glb, and About is already past", async ({ page }) => {
    const glb = trackGlb(page);
    const phases = await recordPhases(page);
    await page.goto("/en#contact");
    await page.waitForTimeout(3000);
    expect(glb).toEqual([]);
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", { timeout: 20_000 });
    expect(await phases()).toEqual(["idle"]);
  });

  // Review Focus 3
  test("the theme toggle keeps the About canvas and its state", async ({ page }) => {
    await page.goto("/en");
    await heroLive(page);
    await scrollSlotTo(page, 1.2);
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", { timeout: 20_000 });
    const before = await slot(page).locator("canvas").elementHandle();
    await page.getByRole("button", { name: "Dark theme" }).click();
    await page.waitForTimeout(500);
    expect(await before?.evaluate((el) => el.isConnected)).toBe(true);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle");
  });

  // Review Focus 4
  test("switching locale while idle leaves one About canvas and no new walk", async ({ page }) => {
    const phases = await recordPhases(page);
    await page.goto("/en");
    await heroLive(page);
    await scrollSlotTo(page, 1.2);
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", { timeout: 20_000 });
    const before = (await phases()).length;
    await page.locator('a[hreflang="vi"]').first().click();
    await expect(page).toHaveURL(/\/vi/);
    await scrollSlotTo(page, 1.2);
    await scrollSlotTo(page, 0.3);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", { timeout: 20_000 });
    await expect(slot(page).locator("canvas")).toHaveCount(1);
    expect((await phases()).slice(before)).not.toContain("walk");
  });

  test("no portrait is requested anywhere on the page", async ({ page }) => {
    const portraits: string[] = [];
    page.on("request", (request) => {
      if (/portrait/i.test(request.url())) portraits.push(request.url());
    });
    await page.goto("/en");
    await heroLive(page);
    await scrollToBottom(page);
    await page.waitForTimeout(1500);
    expect(portraits).toEqual([]);
  });
});

test.describe("About avatar on mobile (Low)", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("never downloads avatar.glb; waves in view, then idles", async ({ page }) => {
    const glb = trackGlb(page);
    await page.goto("/en");
    await expect(slot(page)).toHaveAttribute("data-tier", "low");
    await scrollSlotTo(page, 0.3);
    await expect(pose(page, "wave")).toBeVisible();
    await expect(pose(page, "idle")).toBeVisible({ timeout: 4_000 });
    await expect(pose(page, "wave")).toBeHidden();
    await page.waitForTimeout(1000);
    expect(glb).toEqual([]);
    await expect(slot(page).locator("canvas")).toHaveCount(0);
  });
});

test.describe("About avatar with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("static idle image, no canvas, no avatar.glb, counters final", async ({ page }) => {
    const glb = trackGlb(page);
    await page.goto("/en");
    await expect(slot(page)).toHaveAttribute("data-gate", "fallback");
    await scrollSlotTo(page, 0.3);
    await expect(pose(page, "idle")).toBeVisible();
    await expect(pose(page, "wave")).toBeHidden();
    await expect(stats(page)).toHaveText(["4", "3", "1.5"]);
    await page.waitForTimeout(2000);
    await expect(slot(page).locator("canvas")).toHaveCount(0);
    expect(glb).toEqual([]);
  });
});

test.describe("About avatar without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("shows the idle image", async ({ page }) => {
    await page.goto("/en");
    await slot(page).scrollIntoViewIfNeeded();
    await expect(pose(page, "idle")).toBeVisible();
    await expect(pose(page, "wave")).toBeHidden();
  });
});
```

- [ ] **Step 3: Run it**

Run: `pnpm build && pnpm test:e2e e2e/about-avatar.spec.ts e2e/hero-3d.spec.ts`
Expected: all green. If a timing test flakes, fix the cause (wait on an attribute, not a timeout) — don't raise timeouts past the spec's 6 s.

- [ ] **Step 4: Visual snapshots (local-only, like the Hero's)**

`e2e/about-avatar-visual.spec.ts`:

```ts
// Local-only: snapshot baselines are platform-specific, so CI doesn't run this file.
import { expect, test } from "@playwright/test";

for (const colorScheme of ["light", "dark"] as const) {
  test(`About at 390px (Low, idle image), ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme });
    await page.goto("/en");
    const slot = page.locator("#about-avatar-slot");
    await slot.scrollIntoViewIfNeeded();
    await expect(slot.locator('[data-avatar-pose="idle"]')).toBeVisible({ timeout: 4_000 });
    await expect(page.locator("#about")).toHaveScreenshot(`about-390-${colorScheme}.png`, {
      animations: "disabled"
    });
  });

  test(`About at 1440px (3D idle), ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ colorScheme });
    await page.goto("/en");
    await expect(page.locator("[data-hero-graph]")).toHaveAttribute("data-gate", "live", { timeout: 15_000 });
    const slot = page.locator("#about-avatar-slot");
    await page.evaluate(() => window.scrollBy(0, 200));
    await slot.scrollIntoViewIfNeeded();
    await expect(slot).toHaveAttribute("data-avatar-phase", "idle", { timeout: 20_000 });
    // The idle clip keeps moving: mask the canvas, snapshot the layout around it.
    await expect(page.locator("#about")).toHaveScreenshot(`about-1440-${colorScheme}.png`, {
      mask: [slot.locator("canvas")],
      animations: "disabled"
    });
  });
}
```

Check how CI excludes `hero-3d-visual.spec.ts` (`grep -rn "visual" .github playwright.config.ts`) and exclude the new file the same way. Create baselines: `pnpm test:e2e e2e/about-avatar-visual.spec.ts --update-snapshots`, open the PNGs, confirm they look right (slot card, floor gradient, idle figure on 390; masked canvas box on 1440), then run once more without the flag → green.

- [ ] **Step 5: Commit**

```bash
git add e2e
git commit -m "test(about): e2e for the About avatar, about-avatar budget, visual snapshots

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Docs, cleanup, full verification

**Files:**
- Modify: `CLAUDE.md`, `README.md`, `docs/superpowers/specs/2026-10-02-phase-5c-avatar-about-design.md` (implementation notes), `docs/SPEC-phase-5c-avatar-about.en.md` (only the acceptance checkboxes)

- [ ] **Step 1: CLAUDE.md**

Edit these spots (exact wording may follow the surrounding style):
- Intro line: "the project plan and the Phase 5B avatar spec" → "the project plan and the Phase 5B/5C avatar specs".
- 3D conventions, avatar bullet: the path becomes `features/about/avatar/choreography.ts`; attributes are exposed "on the About slot (`#about-avatar-slot`)"; add: "It starts when the slot crosses 70 % of the viewport (IntersectionObserver, no GSAP), pauses off screen, and never replays in a page view. The About canvas is separate from the Hero's; each renders only while its slot is in view; at most 2 WebGL contexts."
- Quality tier bullet: "the quality tier only ever steps down (our own Off rule in `shared/three/perf-policy.ts` …); the device tier lives in the shared `shared/three/quality-store.ts`, and each canvas applies its own slot cap."
- Opacity exceptions: `.hero-avatar-bubble` → `.about-avatar-bubble`; replace the `.hero-avatar-fallback … display: none on desktop` clause with "`.about-avatar-fallback`, hidden under `[data-avatar-stage="3d"]` while the 3D avatar stands in its place".
- Budget bullets: the Hero 3D chunk's measured size and headroom → the number logged in Task 7; the avatar chunk bullet → "Lazy About avatar chunk (`about-avatar`: everything loaded by scrolling to About after the Hero is live — canvas, avatar code, `GLTFLoader`, meshopt decoder, `SkeletonUtils`, `ContactShadows`, drei `Html`) ≤ 26 KB gzip (measured <N> KB after Phase 5C), enforced by `e2e/about-avatar.spec.ts`. It mounts only after the first scroll."; `.glb` bullet "Phase 5B avatar" → "the avatar".

- [ ] **Step 2: README and design-doc notes**

`README.md` line ~25: update the Hero 3D chunk headroom sentence (no avatar in the Hero any more) with the measured number. Append to the design doc an `## Implementation notes (YYYY-MM-DD, after the build)` section listing anything that changed while building (config tweaks from Task 5 Step 7, measured chunk sizes, any test that needed a different approach). Tick the acceptance checkboxes in the spec that are verified.

- [ ] **Step 3: Cleanup checks**

```bash
grep -rn "hero-avatar\|hero\.avatar\|heroMorph" src e2e | grep -v "scroll-store\|effects/hero\|hero-3d\|HeroCanvas\|Graph\|CameraRig"
pnpm knip
```

Expected: no avatar leftovers referencing the Hero; knip clean (if it lists `useHeadLook`-style exports only used in tests, follow how the repo already handles that — don't add ignores without checking `knip` config).

- [ ] **Step 4: Full verification**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:e2e
pnpm lhci
```

Expected: all green; Lighthouse thresholds unchanged (mobile Performance ≥ 90, CLS < 0.1); LCP is the Hero `h1` (covered by `hero-3d.spec.ts`).
Then the Turbopack check: `pnpm dev`, open `/en`, scroll to About — avatar intro plays, no console errors; stop the server.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md README.md docs
git commit -m "docs(avatar): record the About avatar conventions and close Phase 5C acceptance

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
