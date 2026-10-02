# Phase 5B — Avatar intro: reconciliation with the repo

> 2026-10-02 · Addendum to `docs/SPEC-phase-5b-avatar.en.md`.
> The spec stays the source of truth for **what the avatar does** (look,
> choreography, tiers, acceptance criteria). This document records where the
> repo differs from the spec's assumptions and what was decided in each case.
> Where the two disagree, this document wins.

## Workflow

- Work on the current branch, `phase-5b`. One Conventional Commit per task.
- Part A is done (commit `4df4661`): `public/models/avatar.glb` (0.79 MB,
  10,355 tris, clips `walk` / `wave` / `idle`), both fallback WebPs, and
  `avatar.config.ts` with `HEAD_BONE = 'mixamorigHead'`.
- The measured values in `avatar.config.ts` replace the spec's B.2 draft
  (`start.z = -1.2`, `timings.wave = 2.45`, `bubbleOut = 4.4`, linear walk
  with a final slow-down instead of `power1.out`).
- No attribution: the model was exported on a paid Meshy plan.
- Scope includes the "Nice" items (B.6 head look-at, click-to-wave); they are
  the last tasks in the plan so the spec's cut line still applies.

| Spec                                           | Repo                                                                              |
| ---------------------------------------------- | --------------------------------------------------------------------------------- |
| `useAvatarIntro.ts` — GSAP timeline            | a frame clock in `useFrame` evaluating the pure `choreography.ts` (D1)            |
| `useGLTF.preload(url, false, true)` (drei)     | R3F `useLoader` + three's `GLTFLoader` + meshopt decoder, no Draco (D2)           |
| "Extra JS ≤ 15 KB gzip"                        | own `hero-avatar` chunk, cap = measured + 3 KB, expected ≤ 40 KB (D2)             |
| `messages/{en,vi}.json`                        | `src/shared/i18n/messages/{en,vi}.json`, key `hero.avatar.bubble`                 |
| `__tests__/choreography.test.ts`               | colocated `choreography.test.ts` (repo convention)                                |
| Low tier fallback: GSAP slide-up + fade-in     | CSS only: wave → idle swap and 2px bob; no entrance fade (D3)                     |
| `data-cursor="avatar"` "Phase 4 cursor reacts" | `shared/animation/effects/cursor.ts` extended; today it only reacts to `"node"`   |
| Touch: tap-to-wave, no head tracking           | moot — a coarse pointer always yields tier `low`, which never loads the 3D avatar |

## Decisions

### D1 — No GSAP in the avatar; the intro is a pure function of a clock

CLAUDE.md allows runtime `gsap` only in `motion-entry.ts`, which loads on the
first interaction; on desktop the canvas mounts after load + idle, so a GSAP
timeline would stall until the visitor moves the mouse. Instead:

- `choreography.ts` (pure, no three.js) exports
  `poseAt(t, mode) → { phase, z, opacity, clip, walkTimeScale, bubble }`,
  `scrollPose(morph) → { zOffset, opacity, visible, lookAt }`,
  `clampLook(yaw, pitch)` and `avatarFrame(aspect)` (scale, feet height and horizontal % of the slot from the camera fit).
- `useAvatarIntro.ts` owns the clock (advanced in `useFrame`, so it pauses
  when the canvas's `frameloop` is `"never"` off-screen — this is the spec's
  "slot is in view" start condition), detects phase edges, crossfades
  `AnimationMixer` actions on them, and writes `data-avatar-phase` on
  `#hero-canvas-slot` directly (no React state).
- `heroMorph` is read with `useScrollStore.getState()` each frame.

### D2 — Loader and chunk budget

- `Avatar.tsx` is loaded with
  `React.lazy(() => import(/* webpackChunkName: "hero-avatar" */ "./avatar/Avatar"))`
  inside `<Suspense fallback={null}>` in `HeroScene`. The canvas chunk
  (249.8 KB, 0.2 KB headroom) does not grow.
- It loads the GLB with R3F `useLoader(GLTFLoader, AVATAR.url, (l) =>
l.setMeshoptDecoder(MeshoptDecoder))` using three's addons. drei's
  `useGLTF` is not used because it bundles `DRACOLoader` unconditionally.
  drei's `ContactShadows` is imported per-component; `Html` comes from
  `@react-three/drei/web/Html`, already in the canvas chunk.
- The first plan task builds the loader and measures the chunk. The cap is
  measured + 3 KB, enforced in `e2e/hero-avatar.spec.ts` and recorded in
  CLAUDE.md and the spec. **If the measurement exceeds 40 KB, stop and
  report** before continuing.
- `e2e/hero-3d.spec.ts` excludes the `hero-avatar` chunk from its 250 KB
  canvas and 150 KB initial checks (both limits unchanged).
- `lighthouserc.json` is not touched.

### D3 — Fallback images are CSS-driven

`AvatarFallback.tsx` (server) renders a `.hero-avatar-fallback` wrapper in the
slot with two `<img>`s, `[data-avatar-pose="wave"]` and
`[data-avatar-pose="idle"]`: fixed `width`/`height`, `alt=""`,
`decoding="async"`, `fetchpriority="low"`. Placement (`left`, `bottom`,
`height` in % of the slot) comes from `avatarFrame(aspect)` for the two slot aspects (4/3 mobile,
7/8 desktop), the same math the 3D avatar uses for its scale and feet height,
so the image stands where the 3D avatar would. On mobile (where no 3D avatar
exists) the image is 55 % of the slot tall instead of 70 % to keep the `h1`
the LCP element.

| State                                                                       | Shows                                                  |
| --------------------------------------------------------------------------- | ------------------------------------------------------ |
| `(scripting: none)` or `prefers-reduced-motion: reduce`                     | idle, static                                           |
| JS + motion allowed, not desktop (`DESKTOP_QUERY`)                          | wave; CSS animation swaps to idle at 2 s; 2px bob, 4 s |
| desktop, gate `pending` / `mount` / `live` with tier `high` / `medium`      | wrapper `display: none` (the 3D avatar takes the spot) |
| desktop, `data-tier="low"`                                                  | as mobile: wave → idle, bob                            |
| `data-gate="fallback"`                                                      | idle, static                                           |
| slot has `data-avatar-phase` (3D already greeted) and tier dropped to `low` | idle, static (no second greeting)                      |

- The inactive pose is hidden with `opacity: 0; visibility: hidden` — the
  same two-state exception as the graph SVGs. CLAUDE.md's exception list gains
  this third entry and a note that the wrapper is `display: none` on desktop
  where the 3D avatar replaces it.
- No entrance fade/slide: content on screen never starts hidden.
- Not doing: hiding the fallback image on scroll/morph.

### D4 — Mount timing and tiers

- `HeroCanvas` keeps a `painted` flag (set where `onLive` fires) and passes it
  to `HeroScene`. The avatar mounts when `painted` and the tier is `high` or
  `medium`, then waits for `requestIdleCallback` (timeout fallback) before
  rendering the loader — this covers the spec's long-task rule up front.
- Once mounted, the avatar stays mounted and receives `tier`. On a runtime
  drop to `low` it fades out over 0.3 s, then sets `visible = false` and stops
  updating its mixer; CSS shows the fallback in the same spot. A gate fallback
  needs nothing extra: the canvas fades out on its own.
- `ContactShadows` only on `high`.
- Lights (amended while planning): three.js lights can't be scoped to one
  object, and the graph nodes use `meshStandardMaterial`, so a second front
  key light would also brighten the graph. The avatar therefore uses the Phase
  5 ambient + front-top directional as its key, and adds only the rim light
  (behind, `--accent`), which mostly hits faces the camera can't see on the
  graph's spheres. Phase 5 lights unchanged.
- The bubble label is read in `HeroSection` and passed as a prop through
  `HeroCanvasGate` → `HeroCanvas` → `HeroScene` → `Avatar`.

## Choreography (config values)

| Mode     | Trigger                                 | Timeline                                                                                                                                                                                                             |
| -------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `full`   | first visit in the session              | `enter` 0–0.4 opacity 0 → 1 · `walk` 0–2.2: z −1.2 → 1.6, constant speed 1.8 s then linear slow-down over 0.4 s · `wave` 2.2 (crossfade 0.3, `LoopOnce`, clamp) · `idle` 4.15 (crossfade 0.5, loop) · bubble 2.2–4.4 |
| `repeat` | `sessionStorage` flag (try/catch)       | appear at `end` with 0.3 s fade, wave, idle                                                                                                                                                                          |
| `skip`   | `heroMorph > 0.3` when the intro starts | idle at the receded pose                                                                                                                                                                                             |

- Constant speed 1.8 s + linear slow-down 0.4 s over 2.8 m → cruise ≈ 1.40 m/s
  (clip natural ≈ 1.36 m/s).
- Walk `timeScale = walkTimeScale × clamp(speed / cruise, 0.6, 1)` so steps
  follow the actual speed (no foot sliding).
- `idle` starts at 2.2 + 2.45 − 0.5 = 4.15 s, inside the 4.5 s acceptance.
- Clip changes are driven by the clock's phase edges, never by the mixer's
  `finished` event.
- The session flag is written when the wave starts.

## Scroll, interaction, cleanup

- `scrollPose`: morph 0 → 0.5 maps z `end → receded` (1.6 → 0.2) and opacity
  1 → 0, look-at off; ≥ 0.5 → `visible = false`, mixer not updated. Combined
  with the intro pose by adding z offsets and multiplying opacities. Intro
  still running at morph > 0.3 → jump to idle (crossfade from the current
  clip). Scrolling up reverses the scroll pose; the intro never replays.
- `material.transparent = true` only while the combined opacity is < 1.
- Head look-at (idle, morph = 0): after `mixer.update`, multiply a damped
  offset (`MathUtils.damp`, factor 5) toward R3F `pointer` onto the head
  bone; `clampLook` ±30° yaw / ±15° pitch; target 0 when the pointer leaves
  the slot (`usePointerInside`).
- Click-to-wave: `AvatarHitProxy` capsule `onClick` (idle only) → crossfade
  0.3 s to `wave`, then back to `idle`; ignored during the intro or a wave;
  `stopPropagation` so graph nodes behind don't react. Hover sets
  `slot.dataset.cursor = "avatar"`.
- Missing clips → dev `console.warn`, static pose, no crash.
- Clone (amended while planning): each mount uses `SkeletonUtils.clone` of
  the cached glTF scene with its own cloned materials, because a view
  transition can briefly show two Home pages and one `Object3D` can't have
  two parents. Geometries and textures stay shared with the loader cache.
- Unmount: `mixer.stopAllAction()`, `mixer.uncacheRoot(clone)`, remove
  `data-cursor` / `data-avatar-phase`, dispose the cloned materials. Shared
  geometries/textures are freed with their renderer's context; a fresh
  renderer re-uploads them on revisit.
- Skinned meshes get `frustumCulled = false` (bind-pose bounds go stale while
  animating).
- Graph cursor: `Graph.tsx` only clears `data-cursor` when it is `"node"` and
  never overwrites `"avatar"`, so the avatar's hover isn't erased by the
  graph's per-frame node pick.

## Tests

Unit (Vitest, test-first):

- `choreography.test.ts`: `poseAt` phases at t = 0/1/3/5 (`enter`, `walk`,
  `wave`, `idle`); `repeat` starts at `wave`, `skip` at `idle`; z continuous,
  monotonic, `end` at 2.2; walk `timeScale ≥ 0.6`; `idle` by 4.5 s;
  `scrollPose` at 0 / 0.25 / ≥ 0.5; `clampLook` at and beyond limits;
  `avatarFrame` against hand-computed values.
- `cursor.test.ts`: reacts to `data-cursor="avatar"`.
- `AvatarFallback.test.tsx`: two images, `alt=""`, fixed size,
  `fetchpriority="low"`, placement styles, `data-avatar-pose`.
- Message key parity covered by the existing messages tests.

E2E, new `e2e/hero-avatar.spec.ts`:

- Desktop: `avatar.glb` requested once; `data-avatar-phase="idle"` within 6 s
  of its response; no console problems; LCP is the `h1`; `hero-avatar` chunk
  ≤ cap.
- Repeat visit (reload, same context): phase sequence recorded with a
  MutationObserver is `wave` → `idle`, no `walk`.
- Scroll: hidden at morph ≥ 0.5, back in `idle` after scrolling up.
- Reduced motion: no `avatar.glb` request; idle image visible.
- Mobile: no `avatar.glb` request even after interaction; wave image, then
  idle image; LCP is never an `IMG`.

Changes to `e2e/hero-3d.spec.ts`: exclude the `hero-avatar` chunk from the
canvas/initial budgets; draw calls ≤ 9 (was 6); 10-navigation leak test also
asserts flat geometries/textures with the avatar loaded.

Done = `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, e2e and
Lighthouse CI green (thresholds unchanged), plus a `pnpm dev` (Turbopack)
check.

## CLAUDE.md updates (same change)

- Avatar chunk budget (measured cap) next to the 3D chunk budget.
- Opacity-0 exception: the inactive avatar fallback pose; desktop
  `display: none` wrapper note.
- Cursor: `data-cursor` values `"node"` and `"avatar"`.
- Avatar intro runs on a `useFrame` clock, not GSAP (extends the "useFrame
  reads the store" convention).

## Implementation notes (2026-10-02, after the build)

These supersede the matching parts above; the full rulings are in the
implementation ledger and the commit messages.

- **Canvas chunk bytes.** The avatar chunk imports nothing from the canvas
  chunk's modules (sharing a module across chunks broke scope hoisting and
  cost ~0.7 KB gzip). So `avatarFrame(aspect, cameraZ, fovDeg)` takes the
  live R3F camera, `choreography.ts` has its own `clamp`, the palette is
  passed in from `AvatarMount`, and `useHeadLook` uses three's
  `MathUtils.damp` and its own mouse-inside listener. Canvas chunk: 255,954 B
  of 256,000 B.
- **Mount timing (replaces D4's `painted` + idle wait).** `AvatarMount`
  mounts on its first `useFrame` tick if the tier is High/Medium. The canvas
  itself only mounts after load + idle on desktop.
- **Error boundary** lives inside the avatar chunk around the GLB loader. A
  failed avatar _chunk_ download falls through to the gate's boundary
  (static graph + idle image).
- **Cursor (replaces `data-cursor="avatar"` and the `Graph.tsx` change).**
  The avatar sets its own `data-avatar-hover`; `cursor.ts` reacts to it or to
  `data-cursor="node"`. `Graph.tsx` is unchanged.
- **Unmount** stops the mixer's actions only; `uncacheRoot` broke the
  memoized actions under StrictMode's dev remount, and the per-mount mixer
  and clone are garbage-collected together.
- **Rim light** sits outside the visibility-toggled group so hiding the
  avatar never changes the scene's light count.
- **Fallback images** are `loading="lazy"`: never fetched on desktop
  (`display: none`), still loaded right after layout on mobile.
