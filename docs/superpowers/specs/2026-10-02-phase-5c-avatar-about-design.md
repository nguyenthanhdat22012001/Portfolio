# Phase 5C — Avatar in About: reconciliation with the repo

> 2026-10-02 · Addendum to `docs/SPEC-phase-5c-avatar-about.en.md`.
> The spec stays the source of truth for **what the avatar does** in About
> (layout, choreography, tiers, acceptance criteria). This document records
> where the repo differs from the spec's assumptions and what was decided in
> each case. Where the two disagree, this document wins. Decisions from the
> Phase 5B addendum (`2026-10-02-phase-5b-avatar-design.md`) still hold unless
> changed here.

## Workflow

- Work on the current branch, `phase-5b`. One Conventional Commit per task.
- Done = `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, e2e and
  Lighthouse CI green (thresholds unchanged), plus a `pnpm dev` (Turbopack)
  check.

| Spec                                                              | Repo / decision                                                                                                        |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Replace the portrait photo; delete `portrait*`, alt keys, `image` | No portrait exists: About has a `PlaceholderSlot`, `buildPerson` has no `image`. §8 becomes "verify absent" e2e        |
| Slot 4:5 (max 560px) md+, 320px tall on mobile                    | Placeholder is 4:3 / 3:4 → follow the spec                                                                             |
| `useGLTF.preload(url, false, true)`                               | `useLoader` + `GLTFLoader` + meshopt (CLAUDE.md); preload with `useLoader.preload`                                     |
| Intro starts on a ScrollTrigger `top 70%` (`once`)                | IntersectionObserver, `rootMargin: 0px 0px -30% 0px`, disconnect on first hit — no runtime GSAP (5B D1)                |
| Low tier: GSAP slide-up + fade-in                                 | CSS only (5B D3): wave → idle swap + bob, started by `data-avatar-inview`; no entrance fade (opacity-0 rule)           |
| `PerformanceMonitor flipflops={3} onFallback={toOff}`             | `monitorBounds` / `declineAction` from `perf-policy` (CLAUDE.md's own Off rule)                                        |
| Store `level: high/medium/low/off`, `toOff()`                     | Store holds a device `RenderTier` + `downgrade()`; Off stays each canvas's local gate fallback (D2)                    |
| "Only one canvas renders per frame"                               | Hero isn't pinned, so both can be in view during the intro. Rule: each canvas pauses when its slot is out of view (D1) |
| About avatar chunk ≤ 20 KB gzip                                   | Existing avatar code measures 24.5 KB; keep the 26 KB cap, renamed to `about-avatar` (D3)                              |
| Lights 0.5 / 1.2 / 0.8                                            | `<Canvas flat>` + physical lights: use the 5B-tuned levels (Phase 5 ambient/key levels + `AVATAR.rim`)                 |
| Cleanup: `mixer.uncacheRoot()`                                    | Keep 5B: `stopAllAction()` only (`uncacheRoot` broke memoized actions under StrictMode), dispose cloned materials      |
| `window.dispatchEvent('about:avatar-wave')` for the counters      | `data-count-hold` attribute on `#about`, read by the generic `count` effect (D5)                                       |
| `features/about/avatar/__tests__/`                                | Colocated tests (repo convention)                                                                                      |

## Decisions

### D1 — Two canvases, each paused out of view

The Hero is not pinned (see `shared/animation/effects/hero.ts`), so when About's
top reaches 70 % of the viewport the Hero graph slot is usually still partly on
screen. Both canvases may render for a few seconds; About 3D only ever runs on
desktop High/Medium, so the cost is acceptable. The acceptance criterion
becomes: **each canvas uses `frameloop={inView ? 'always' : 'never'}` on its own
slot; ≤ 2 WebGL contexts; no GPU memory growth after 10 navigations.**

### D2 — Shared quality tier

`src/shared/three/` (new; both features may import it):

- `detect-tier.ts` ← `features/hero/quality/detect-tier.ts` minus
  `tierFeatures` (depends on `graph-data`, stays in the Hero as
  `quality/tier-features.ts`).
- `perf-policy.ts` ← `features/hero/quality/perf-policy.ts`.
- `decide-gate.ts` ← `features/hero/canvas/decide-gate.ts`.
- `quality-store.ts` (Zustand): `{ level: RenderTier | null, init(env),
downgrade() }`. `init` runs once (first caller wins); `downgrade` steps
  High → Medium → Low; nothing upgrades.

**Device tier vs. slot cap.** `detectTier` today returns `low` for a slot
narrower than 480px. The About slot is ~380px at 1440, so that rule can't be
shared. The store holds the **device tier** (pointer, cores, memory). Each
feature applies its own cap: the Hero keeps "slot < 480 → low" (no behavior
change); About has none. Effective tier = min(store level, slot cap).
`downgrade()` always writes to the store, so a decline in either canvas lowers
both.

**Placement.** The store must be one instance across two sibling lazy chunks,
and `AboutAvatarGate` reads it before deciding to download anything, so it is
in the initial bundle (imported by both gates). Initial JS (~142 / 150 KB) is
measured in the first task. Removing `AvatarMount` from the Hero canvas chunk
returns some of its 46 B headroom; re-measure that too.

`useQualityTier` reads/writes the store; `HeroCanvas`'s `onDecline` calls
`downgrade()`. Off (gate fallback, perf Off at Low, context loss) stays local
to each canvas.

### D3 — Chunks and budgets

- `AboutAvatarGate` loads `AboutAvatarCanvas` with
  `dynamic(() => import(/* webpackChunkName: "about-avatar" */ ...), { ssr: false })`.
  `AboutAvatarCanvas` imports `Avatar` statically: one lazy chunk, one error
  boundary. A nested avatar chunk buys nothing in About (an empty canvas shows
  nothing; the image covers the wait).
- three/R3F are split by webpack into a vendor chunk shared with the Hero
  canvas (already cached on desktop).
- Budgets: initial ≤ 150 KB; Hero canvas ≤ 250 KB (excludes the about chunks;
  nothing about-related loads at initial anyway); `about-avatar` + its own
  vendor split (recognised by `KHR_mesh_quantization`, helper renamed) ≤
  **26 KB**, excluding the shared three/R3F chunk. Over budget → stop and
  report. `lighthouserc.json` untouched.
- The about chunk imports nothing from `features/hero` (boundaries rule).
  Theme accent comes from a new `useAccentColor` in the about chunk instead of
  the Hero's `useGraphColors` palette.

### D4 — Gate, start rule, image ↔ canvas, pause/resume

**`AboutAvatarGate` decision order (on mount),** as a pure, unit-tested
function plus a thin hook:

1. `decideGate(readGateEnv())` is `fallback` (reduced motion, no WebGL,
   Save-Data) → `data-gate="fallback"`: static idle image.
2. Effective tier `low`, or not `DESKTOP_QUERY` → `data-tier="low"`, never
   request `avatar.glb`. The CSS wave → idle animation runs once
   `data-avatar-inview` is set by the 70 % observer.
3. `high` / `medium` → IntersectionObserver `rootMargin: 400px 0px` mounts the
   canvas and preloads the GLB; sets `data-count-hold` on `#about` (D5).

**Start rule.** The 70 % observer (fires once) sets `triggered` and
`data-avatar-inview`. The intro clock starts on the first frame with the GLB
ready and `triggered`. Pure `startMode({ alreadyPast, greeted })`:

- `alreadyPast` (triggered, slot out of view when the GLB is ready) → `skip`
  (straight to `idle`);
- `greeted` (sessionStorage, try/catch) → `repeat` (appear at `end`, short
  wave);
- otherwise `full`.

`createIntro` drops its `morph` argument. `scrollPose`, `AVATAR.receded` and
`skipIntroAtMorph` are deleted. `AVATAR.start/end.x` become 0; `trigger` and
`timings.countersStart = 2.5` are added (spec §4).

**Image ↔ canvas.** CSS hides the fallback when the slot has
`data-avatar-stage="3d"`, set by the gate:

- when the 3D avatar is ready while the slot is off screen (invisible swap);
- otherwise at the avatar's first visible frame: a 0.4 s crossfade with
  `enter`, or an idle-to-idle swap for `skip` (≤ 8px offset, D6).

`data-avatar-failed`, context loss, an error-boundary hit, or a runtime drop to
Low (avatar fades out over 0.3 s) remove the stage and show the idle image.
The Hero is never affected.

**Pause/resume.** The clock advances in `useFrame`, and `frameloop` follows the
slot's visibility, so leaving pauses it and returning resumes it. The clock
only moves forward: once `idle`, always `idle`; the intro never replays in a
page view.

`data-avatar-phase`, `data-avatar-hidden`, `data-avatar-failed`,
`data-avatar-hover` move from `#hero-canvas-slot` to the About slot
(`[data-avatar-slot]`). Bubble text: `about.avatar.bubble` (moved from
`hero.avatar.bubble`, both locales), passed from `AboutSection` as a prop.

### D5 — Counters wait for the wave without depending on it

- The gate sets `data-count-hold` on `#about` (client only: no-JS and reduced
  motion unchanged) when it picks the 3D path.
- `count` (generic, `shared/animation/effects/count.ts`): if
  `el.closest('[data-count-hold]')` exists, it waits for the attribute's
  removal (MutationObserver) instead of its ScrollTrigger; if the stat is
  already in view by then, it counts at once. Safety: it also starts 4 s
  after its own trigger fires. Without a hold, behavior is unchanged.
- The gate removes the hold when the intro reports `countersStart` (2.5 s
  into `full`, at start for `repeat`/`skip`), 1.5 s after `triggered` if the
  intro hasn't started (slow GLB), or on any error/fallback/drop to Low.

### D6 — Canvas and framing

- `<Canvas flat>`, `antialias: true`, `alpha`, `dpr` from `TIER_DPR`,
  `eventSource` = slot, `aria-hidden`, fov 30, looking at `[0, 0.9, 0]`.
- `ContactShadows` only on `high`; ≤ 3 draw calls.
- `GlStats`-style `data-gl-*` counters on the About slot for e2e.
- `webglcontextlost` → About falls back only.
- Model at real scale. Pure `aboutFrame(aspect, fov)` returns the camera
  distance so the avatar at `end.z` is 80 % of the slot height and the raised
  hand at the wave clip's tallest pose (measured in the framing task) is never
  clipped; feet line and image height % for the CSS fallback come from the
  same function, which keeps the swap within 8px.
- Head look-at and click-to-wave unchanged from 5B.

### D7 — Layout and fallback CSS

- `AboutAvatarSlot` (server) replaces `PlaceholderSlot`: `aria-hidden`,
  `data-avatar-slot`, `--bg-elevated`, `--radius-lg`, 4:5 with max-height
  560px on md+, 320px tall and centred on mobile, a `::after` floor gradient
  (`--bg` → transparent, bottom 30 %).
- `.hero-avatar-fallback` → `.about-avatar-fallback`, keyed on the slot's
  `data-gate` / `data-tier` / `data-avatar-stage` / `data-avatar-failed` /
  `data-avatar-inview`. Images stay `loading="lazy"`, `decoding="async"`,
  fixed size, `alt=""`. Mobile image ≈ 260px tall.

### D8 — Amendments while planning

- **Mount waits for the first scroll.** On a 1280×720 desktop the About slot
  starts ~280px below the fold, inside the 400px mount margin, so a plain
  IntersectionObserver would load the about chunk and `avatar.glb` on initial
  load (spec §9/§10 forbid that). The mount observer is armed on the first
  `scroll` event; the 70 % start observer runs from hydration.
- **Start observer also fires for a slot above the viewport**
  (`boundingClientRect.top < 0` on its first callback), so landing on
  `/en#contact` counts as "already past".
- **Trigger margins live in `avatar-signals.ts`** (`MOUNT_MARGIN`,
  `START_MARGIN`, `GLB_GRACE_MS`), not `avatar.config.ts`: the gate is in the
  initial bundle and must not pull in the whole config object.
- **Framing is aspect-independent.** The camera looks straight ahead from
  `aboutFrame(fov)`; with a fixed vertical fov the avatar is `screenHeight` of
  the slot at every size, so nothing is recomputed on resize. Model at scale 1.
- **Any loss of the 3D avatar** (GLB error, context loss, perf Off, runtime
  drop to Low) goes through one path: the gate sets `data-gate="fallback"`
  (static idle image), releases the counters and unmounts the canvas.
- `--radius-lg` doesn't exist; the slot uses `rounded-card` (`--radius`).
  `PlaceholderSlot` loses its last user and is deleted.

## Removed from the Hero

`AvatarMount` and the avatar folder from `canvas/`; `AvatarFallback` and the
`avatarBubble` prop chain (`HeroSection` → `HeroCanvasGate` → `HeroCanvas` →
`HeroScene`); hero avatar CSS; `hero.avatar.bubble`; the mobile LCP-guard
height (`fallback.heightSm`). `heroMorph` stays (graph).

## Tests

Unit (Vitest, test-first):

- `choreography.test.ts`: drop `scrollPose`/morph cases; add `startMode`
  (`alreadyPast → skip`, `greeted → repeat`, else `full`); intro phases
  unchanged.
- `aboutFrame` against hand-computed values.
- `quality-store.test.ts`: init once; High → Medium → Low; never upgrades.
- `detect-tier.test.ts`: device tier; Hero slot cap.
- About gate decision function.
- `count.test.ts`: hold waits for removal; safety start at 4 s; no hold →
  unchanged.
- Moved `AvatarFallback`, mixer, head-look tests; messages parity.

E2E: `hero-avatar.spec.ts` → `about-avatar.spec.ts` covering spec §10 —
no GLB on initial load and no avatar in the Hero; GLB once near About; phases
`enter → walk → wave → idle` within 6 s with the bubble in `wave`; pause/resume
without restart; fast scroll lands in `idle`; mobile and reduced motion paths;
counters wait then run; no `portrait*` requests; no console problems; LCP is
the `h1` (desktop, mobile); `about-avatar` ≤ 26 KB; visual snapshots of About
at 390 / 1440, light + dark, in `idle`. `hero-3d.spec.ts`: no `[data-avatar-*]`
in the Hero, draw calls ≤ 6 again; leak test covers the About canvas.

## CLAUDE.md updates (same change)

- Client-file list: `features/about/avatar/AboutAvatarGate.tsx`,
  `AboutAvatarCanvas.tsx`.
- Avatar data attributes live on the About slot, not `#hero-canvas-slot`.
- Avatar chunk renamed `about-avatar`; budget text says it excludes the
  three/R3F chunk shared with the Hero; `shared/three/` holds the tier store
  and policy.
- Opacity exception: `about-avatar-fallback`, `[data-avatar-pose]`.
- Canvas rule: each canvas pauses when its slot is out of view; ≤ 2 contexts.

## Implementation notes (2026-10-02, after the build)

- Camera needs `rotation: [0, 0, 0]`; without it R3F's default `lookAt(0,0,0)`
  tilts the camera down.
- The bubble's drei `Html` is portaled into the slot (`portal` = slot ref):
  with the default target the root was created before canvas events connected
  and lost its content.
- `AVATAR.bubbleOffset` lowered 0.15 to 0.05 so the bubble stays inside the
  slot. The image to canvas swap measured 8 px down / 3 px right (within the
  8 px tolerance).
- Gate fail path: `FADE_OUT_MS = 400` (matches the image's 0.4 s CSS fade); a
  drop to Low before the intro starts fails over at once (no fade); `data-gl-*`
  is cleared on canvas unmount.
- Signals: after `lost()`/`dispose()` late calls are no-ops; a late `hold()`
  after the trigger arms the 1.5 s grace.
- The `count` effect now uses `ScrollTrigger.create` + `onEnter` (same
  trigger, `top 90%`, `once`) so it can honour `data-count-hold`, with a 4 s
  safety start.
- Regression found and fixed during e2e (commit 738fad4): returning from a
  case study to `/en#work` made Next's client hash scroll count as the
  visitor's first scroll and mounted the About canvas and GLB. After a `#hash`
  landing the mount now arms only after real input (wheel/touch/key/pointer)
  followed by a scroll. Known edge: a browser Back that restores a mid-page
  scroll without a hash still counts as a first scroll.
- Hero visual baselines regenerated (graph only); `hero-3d-no-webgl` now
  checks the About slot.
- Measured (gzip): initial JS 142.6 KB (150); Hero 3D chunk 249.6 KB (250);
  `about-avatar` 25.5 KB, 26,080 B in 2 files (26 KB); motion chunk 55.4 KB
  (70).
- `e2e/about-avatar.spec.ts` runs in CI; `about-avatar-visual.spec.ts` stays
  local-only, like the Hero visual spec.
