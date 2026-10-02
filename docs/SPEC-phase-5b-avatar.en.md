# SPEC — Phase 5B: Avatar intro (Meshy pipeline)

> Version 1.0 · 2026-10-02 · Requested by: Nguyen Thanh Dat
> Prerequisites: Phase 5 (`SPEC-phase-5-hero-3d.en.md`) merged — the Hero canvas, gate, quality tiers and scroll store already exist.
> Read together with the repo's `CLAUDE.md`. Time box: **1 week of code**, after the assets in Part A are ready.

---

## 0. Goal & decisions

A **stylized 3D avatar of Dat** walks out from inside the Hero's node graph, stops, **waves hello**, then stands idle and follows the pointer with its head. It lives in the **same `<Canvas>`** as the Phase 5 graph and never delays the Hero text.

| Decision             | Choice                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Character            | Stylized (not realistic), recognizable by hair, glasses, build and outfit; palette charcoal / silver / muted gold / earth brown             |
| Tooling              | AI image model (concept) → **Meshy** (image-to-3D, auto-rig, animation presets) → **Blender** (merge clips) → **gltf-transform** (compress) |
| Clips                | `walk` (in place, loop), `wave` (once), `idle` (loop)                                                                                       |
| Motion on the page   | Driven by code: GSAP moves the avatar, `AnimationMixer` plays/crossfades clips                                                              |
| Placement            | Inside the Hero visual slot, in front of the graph                                                                                          |
| Not an overlay intro | Text is visible immediately; the avatar is additive                                                                                         |

**Out of scope:** facial expressions, blinking and lip sync (Meshy models usually have no face blend shapes), finger animation, extra clips, any avatar outside the Hero, `deviceorientation`.

---

## Part A — Asset pipeline (Dat, before coding)

The code tasks in Part B assume exactly the deliverables in **A.6**.

### A.1 Concept image (AI image model)

Inputs: 3–4 photos — face front, face 3/4, full body front, all evenly lit; glasses/hair clearly visible.

Prompt 1 — concept:

```
Using the attached photos as the ONLY reference for the face, hairstyle, glasses and body type,
create a stylized 3D animated-film character of this person.

Likeness: keep his face shape, eyes, eyebrows, hairstyle and glasses recognizable.
Style: semi-stylized, slightly larger head (about 1:6 head-to-body), soft clean shapes,
smooth matte materials, friendly calm expression, mouth closed.
Outfit: plain charcoal-grey crew-neck t-shirt, silver-grey slim pants, simple dark-brown sneakers.
Small accent: a thin muted-gold detail (e.g. watch strap). No logos, no text.

Pose: full body, standing straight in an A-POSE — arms held 30–45° away from the body,
palms facing down, fingers slightly spread, legs slightly apart, looking straight at the camera.
Camera: orthographic-like front view, full body in frame with margin, eye level.
Background: plain light-grey, even studio lighting, no shadows on the ground, no props.
```

Prompt 2 — turnaround (after the concept is approved):

```
Same character, same outfit and proportions, same A-pose.
Create a character turnaround sheet: front view, left side view, back view,
side by side on one plain light-grey background, identical scale, no shadows, no text.
```

Iterate with small targeted edits ("keep everything the same, make the jaw slightly narrower"), never a full rewrite.

**Concept checklist:** A-pose with clear gaps under the arms and between the legs · fitted clothes · nothing covering the neck · no props or loose accessories · hands open.

### A.2 Image-to-3D (Meshy)

- Input: the turnaround sheet (multi-view), or the front concept if multi-view is unavailable.
- Settings: symmetry **on**, target **≤ 15k triangles**, textured, PBR off or minimal.
- Reject and regenerate if: arms fused to the torso, fingers merged into a blob, glasses melted into the face, back of the head malformed.

### A.3 Rig & clips (Meshy)

1. **Rig** → body type **Humanoid** (place markers if asked: chin, wrists, elbows, knees, groin).
2. Test **any wave preset first** — if shoulders/elbows twist badly, go back to A.1 with arms further from the body.
3. Pick three presets from the animation library:

| Clip name (final) | Search                | Pick                                                           | Length                                    |
| ----------------- | --------------------- | -------------------------------------------------------------- | ----------------------------------------- |
| `walk`            | Walking               | Plain relaxed walk, not swagger/happy. **In place** if offered | 1–1.2 s (one cycle = two steps), loopable |
| `wave`            | Waving / Greeting     | One hand raised to head height, little body bounce             | 1.8–2 s                                   |
| `idle`            | Idle / Breathing Idle | Standing, gentle breathing, arms relaxed                       | 3–4 s, loopable                           |

4. Export each as **GLB** (or FBX if GLB export omits the animation).

### A.4 Merge & clean (Blender, ~30 min)

1. Import the first export (mesh + armature + one clip). This armature is the **only** armature kept.
2. Import the other two exports; in the Action Editor assign their actions to the kept armature; delete the duplicate meshes/armatures.
3. Rename actions exactly: `walk`, `wave`, `idle`. Push each to its own NLA track (or keep as actions — both export).
4. If `walk` is not in place: remove the root/hips forward translation (keep vertical bob).
5. Character facing **+Z**, feet on **Y = 0**, scale applied (1 unit = 1 m, height ≈ 1.75), all transforms applied.
6. Note the head bone's exact name (e.g. `Head`, `mixamorig:Head`) — needed in B.6.
7. Export glTF Binary (`.glb`): include animations, skinning; no cameras/lights.

### A.5 Compress (gltf-transform)

```bash
npx @gltf-transform/cli optimize avatar.raw.glb public/models/avatar.glb \
  --compress meshopt --texture-compress webp --texture-size 1024 --simplify false
npx @gltf-transform/cli inspect public/models/avatar.glb   # check size, tris, clip names
```

Budget: **≤ 1.5 MB** (target 800 KB), **≤ 15k triangles**, **1 material**, **1 texture set ≤ 1024²**.

### A.6 Deliverables (what Part B expects)

| File                                                             | Content                                                                                                                                               |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/models/avatar.glb`                                       | Mesh + 1 armature + clips named exactly `walk`, `wave`, `idle`; meshopt-compressed; ≤ 1.5 MB                                                          |
| `public/images/avatar-wave.webp`                                 | Transparent PNG→WebP render of the waving pose, front view, **600 px tall**, ≤ 40 KB                                                                  |
| `public/images/avatar-idle.webp`                                 | Same, idle pose, ≤ 40 KB                                                                                                                              |
| `src/features/hero/canvas/avatar/avatar.config.ts` → `HEAD_BONE` | The head bone name from A.4                                                                                                                           |
| Attribution (if Meshy free plan)                                 | Free-plan models are licensed **CC BY 4.0** — credit is required. Text: "3D avatar generated with Meshy (CC BY 4.0)". Skip if exported on a paid plan |

The two images can be rendered in Blender (transparent film, orthographic front camera) or screenshotted from the Meshy viewer on a transparent background.

---

## Part B — Implementation (AI)

### B.1 Files

```
src/features/hero/canvas/
  HeroScene.tsx                 # existing — add <Avatar/> (Phase 5 left the slot)
  avatar/
    avatar.config.ts            # all tunables (positions, timings, HEAD_BONE)
    Avatar.tsx                  # loads GLB, mixer, choreography, head look-at
    useAvatarIntro.ts           # GSAP timeline → position + clip changes
    choreography.ts             # PURE: phaseAt(t), clip/weights per phase (unit-tested)
    AvatarHitProxy.tsx          # invisible capsule for cheap raycasts (click → wave)
    AvatarBubble.tsx            # drei <Html> speech bubble
    AvatarFallback.tsx          # SERVER: <img> fallback for Low/Off tiers
    __tests__/choreography.test.ts
messages/{en,vi}.json           # hero.avatar.bubble
```

### B.2 Config — `avatar.config.ts`

```ts
export const AVATAR = {
  url: "/models/avatar.glb",
  HEAD_BONE: "Head", // from A.6
  height: 1.75, // world units; scaled to slot in B.4
  start: { x: 0.6, z: -6 }, // inside / behind the graph
  end: { x: 0.6, z: 1.6 }, // in front of the graph
  receded: { z: 0.2, opacityAtMorph: 0.5 }, // scroll state, see B.7
  timings: {
    fadeIn: 0.4, // material opacity 0 → 1 at start
    walk: 2.2, // travel duration
    walkToWave: 0.3, // crossfade
    wave: 1.8,
    waveToIdle: 0.5,
    bubbleIn: 2.2,
    bubbleOut: 4.0
  },
  walkTimeScale: 1.0, // tune so feet don't slide (B.5)
  lookAt: { yaw: 30, pitch: 15, damping: 5 } // degrees, damp factor
} as const;
```

All magic numbers live here so the motion can be tuned without touching logic.

### B.3 Loading

- `Avatar` renders only when Phase 5's tier is **High** or **Medium**; Low/Off use `AvatarFallback` (B.8).
- Preload starts only after the canvas has mounted and painted its first frame (never before): `useGLTF.preload(AVATAR.url, false, true)` (meshopt on, draco off).
- Wrap in `<Suspense fallback={null}>` — the graph keeps running while the GLB downloads; no spinner.
- Clone with `SkeletonUtils.clone` only if the avatar may mount twice (route revisits); otherwise use the scene directly.
- Missing clip names (`walk` / `wave` / `idle`) → `console.warn` in dev and render the avatar in `idle`-less static pose; never crash.

### B.4 Placement, scale, lighting

- Desktop: avatar stands slightly right of the slot center (`x = 0.6`), in front of the graph; its height ≈ **70 %** of the visible slot height at `z = end.z` (compute a uniform scale from camera fov/distance; recompute on resize).
- The graph stays centered behind it; no overlap with Hero text (the slot is its own column).
- Materials: keep Meshy's texture; set `material.transparent = true` only during fade-in/out, then back to `false` (avoids sorting artifacts).
- Lighting additions (inside `Avatar`, so Phase 5 lights stay untouched): one **key** `directionalLight` front-top (intensity ~1.2, neutral) and one **rim** `directionalLight` behind (color from `--accent`, intensity ~0.8). No shadows; on High tier only, a drei `<ContactShadows>` under the feet (opacity 0.35, blur 2.5, resolution 256).

### B.5 Intro choreography

Pure model in `choreography.ts` (unit-tested), executed by a GSAP timeline in `useAvatarIntro.ts`:

| Phase   | Time (s)  | Position                                  | Clip                                                           | Other                                                                                          |
| ------- | --------- | ----------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `enter` | 0 → 0.4   | at `start`                                | `walk`                                                         | opacity 0 → 1                                                                                  |
| `walk`  | 0 → 2.2   | `start.z` → `end.z`, `ease: 'power1.out'` | `walk` (loop)                                                  | `timeScale` eases from `walkTimeScale` to 0.6 in the last 0.4 s (slow-down, fewer foot slides) |
| `wave`  | 2.2 → 4.0 | at `end`                                  | crossfade `walk → wave` 0.3 s, `LoopOnce`, `clampWhenFinished` | speech bubble in at 2.2                                                                        |
| `idle`  | 4.0 → ∞   | at `end`                                  | crossfade `wave → idle` 0.5 s, `LoopRepeat`                    | bubble out at 4.0; head look-at enabled                                                        |

**Start condition:** the timeline starts when the GLB is ready **and** the slot is in view. If `heroMorph > 0.3` at that moment (visitor already scrolled), skip straight to `idle` at the receded pose (B.7).

**Repeat visits in the same session** (`sessionStorage`, wrapped in try/catch): skip `enter`/`walk`; appear at `end` with a 0.3 s fade, play `wave` once, then `idle`.

**Foot sliding:** with an in-place walk, travel speed ≠ the clip's stride speed. Tune `walkTimeScale` (and if needed `timings.walk`) until feet do not slide visibly; document the final values in the config file.

**Speech bubble (`AvatarBubble`):** drei `<Html>` anchored ~0.25 units above the head bone; text from `messages` › `hero.avatar.bubble`: EN "Hi, I'm Dat" · VI "Chào, mình là Đạt". Style: `--bg-elevated`, 1px `--border`, `--radius-lg`, `font-mono` 14px, small tail. `aria-hidden` (the name is already the `h1`). No emoji.

### B.6 Interaction

- **Head look-at** (idle only, fine pointer): find the bone `AVATAR.HEAD_BONE`; each frame **after** `mixer.update(delta)`, add a damped offset rotation toward the pointer — yaw clamped ±30°, pitch ±15°, `damp` factor 5. When the pointer leaves the slot, ease back to 0.
- **Click / tap avatar → wave again:** raycast against `AvatarHitProxy` (an invisible capsule ~ avatar size, never against the skinned mesh). Ignore clicks while a wave is playing. Set `data-cursor="avatar"` on the slot while hovering so the Phase 4 cursor reacts. Optional easter egg — can be cut.
- Touch devices: tap-to-wave only; no head tracking.

### B.7 Scroll coupling (uses Phase 5 `heroMorph`)

- As `heroMorph` goes 0 → `receded.opacityAtMorph` (0.5): avatar moves `end.z → receded.z` and fades to 0; head look-at disabled.
- At `heroMorph ≥ 0.5` set `avatar.visible = false` and pause its mixer (saves frame time while the graph's layered state is shown).
- Scrolling back up reverses it; the intro is not replayed.
- If the intro is still running when the visitor scrolls past 0.3, jump the timeline to `idle` first, then apply the scroll mapping.

### B.8 Tiers & fallbacks

| Tier (Phase 5)                                              | Avatar                                                                                                                                                                                              |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **High**                                                    | Full intro, ContactShadows, head look-at, click-to-wave                                                                                                                                             |
| **Medium**                                                  | Full intro, no ContactShadows                                                                                                                                                                       |
| **Low** (touch / small slot)                                | **No GLB download.** `AvatarFallback` shows `avatar-wave.webp`: slides up 24px + fades in over 0.5 s once (GSAP), then a gentle 2px idle bob (CSS, 4 s loop). Swaps to `avatar-idle.webp` after 2 s |
| **Off** (reduced motion, no WebGL, Save-Data, context lost) | `avatar-idle.webp`, static, no animation                                                                                                                                                            |

- `AvatarFallback` is a server-rendered `<img>` with fixed `width`/`height` (no CLS), `alt=""` (decorative; the name is the `h1`), `decoding="async"`, `fetchpriority="low"`. It is positioned over the static graph SVG exactly where the 3D avatar would stand.
- Under JS-disabled, the fallback shows `avatar-idle.webp`.
- **LCP guard:** the fallback image must not become the LCP element. Keep its rendered area smaller than the `h1` block; verify in the e2e LCP test (B.10). If it still wins, lower its rendered height until the `h1` is LCP again.
- On runtime downgrade to Low/Off (Phase 5 `PerformanceMonitor`), fade the 3D avatar out and show the matching fallback image in the same spot.

### B.9 Performance & cleanup

| Item         | Budget / rule                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `avatar.glb` | ≤ 1.5 MB, downloaded only on High/Medium after canvas mount                                                                    |
| Extra JS     | ≤ 26 KB gzip in its own `hero-avatar` chunk (measured 22.8 KB; the loaders are not in the canvas chunk, see the design doc D2) |
| Draw calls   | + ≤ 3 (mesh, optional ContactShadows) → scene total ≤ 9                                                                        |
| Triangles    | ≤ 15k                                                                                                                          |
| Frame rate   | 60 fps desktop with graph + avatar running                                                                                     |
| Main thread  | GLB parse must not cause a long task > 100 ms; if it does, delay preload to `requestIdleCallback`                              |

- On unmount: `mixer.stopAllAction()`, `mixer.uncacheRoot(root)`, kill GSAP timelines, dispose cloned materials/geometries if cloned.
- No GPU memory growth after 10 Home ↔ case study navigations (`gl.info.memory`).
- Attribution (if free plan): add the credit line to the footer (`--fg-muted`, 12px) and the README.

### B.10 Tests

**Unit (Vitest)**

- `choreography.test.ts`: `phaseAt(0) = 'enter'`, `phaseAt(1) = 'walk'`, `phaseAt(3) = 'wave'`, `phaseAt(5) = 'idle'`; repeat-visit path starts at `wave`; scrolled-past path starts at `idle`.
- Look-at clamp: inputs beyond limits clamp to ±30° yaw / ±15° pitch.

**Playwright**

- Desktop Chromium: after load + idle, `avatar.glb` is requested once; within 6 s of the request finishing the slot has `data-avatar-phase="idle"` (expose phase on the slot for tests); no console errors.
- Reduced motion: no request for `avatar.glb`; `avatar-idle.webp` visible.
- Mobile profile: no request for `avatar.glb` even after interaction; `avatar-wave.webp` then `avatar-idle.webp` visible.
- LCP element is the Hero `h1` on desktop and mobile profiles.
- Session repeat: reload in the same context → `data-avatar-phase` goes `wave` → `idle` without `walk`.
- Leak check as in Phase 5 (ScrollTrigger count, `gl.info.memory`).

**Lighthouse CI:** Phase 5 thresholds still pass (mobile Performance ≥ 90).

### B.11 Delivery plan (5 working days, after A.6 is ready)

| Day | Work                                                          | Must / nice |
| --- | ------------------------------------------------------------- | ----------- |
| 1   | B.1–B.4: load GLB, placement, lights, fallbacks (B.8)         | Must        |
| 2   | B.5: choreography + GSAP timeline + bubble; tune foot sliding | Must        |
| 3   | B.7 scroll coupling; repeat-visit path; tier downgrades       | Must        |
| 4   | B.6 head look-at, click-to-wave                               | Nice        |
| 5   | B.9–B.10 budgets, cleanup, tests                              | Must        |

**Cut line:** if day 4 starts with "Must" items open, drop head look-at and click-to-wave.

---

## Acceptance criteria

- [x] Asset deliverables match A.6 (clip names, size ≤ 1.5 MB, two fallback images, head bone recorded)
- [x] Desktop: avatar walks out of the graph, waves with the bubble, settles into idle within ≤ 4.5 s of the model being ready; scroll and clicks are never blocked — idle at 4.15 s (`e2e/hero-avatar.spec.ts`)
- [ ] No visible foot sliding; crossfades without pops — open: needs an eyeball check on a real GPU (`walkTimeScale` 1.0 from the measured stride)
- [x] Head follows the pointer within ±30° / ±15° in idle (if not cut)
- [x] Scrolling the Hero recedes and hides the avatar by morph 0.5, reverses on scroll up, intro never replays
- [x] Repeat visit in the same session: short wave only
- [x] Mobile and Low tier never download `avatar.glb`; fallback images show without layout shift
- [x] Reduced motion / no WebGL / Save-Data: static idle image, no console errors — Save-Data shares the gate's fallback path; no-JS, reduced motion and no-WebGL covered by e2e
- [ ] LCP element is still the Hero `h1`; Lighthouse mobile Performance ≥ 90; CLS < 0.1 — open: CLS 0 and `/en` 0.91, but `/vi` 0.86 (0.87 before Phase 5B, see README); Lighthouse picks the tagline `p` as LCP on mobile, as before
- [x] One WebGL context on the page; no GPU memory or ScrollTrigger growth after 10 navigations
- [x] Attribution present if the model came from Meshy's free plan — n/a (paid plan)
- [ ] Lint, typecheck, unit, e2e, build and Lighthouse CI green — open: all green except the pre-existing `/vi` Lighthouse score and a pre-existing flaky hero e2e test

---

## Notes for Dat

- Do **A.1–A.3 first and test the wave on the rig** before polishing anything — most problems (twisted shoulders, fused fingers) come from the concept pose and are cheapest to fix there.
- The free plan's CC BY 4.0 license allows commercial use with credit. If you would rather not show a credit line, export the final model during one month of a paid plan.
- Keep the raw Blender file and Meshy exports outside the repo (or in Git LFS); only `avatar.glb` and the two WebP images go into `public/`.
