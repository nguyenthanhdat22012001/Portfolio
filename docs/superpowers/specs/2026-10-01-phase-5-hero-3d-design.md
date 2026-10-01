# Phase 5 — Hero 3D node graph: reconciliation with the repo

> 2026-10-01 · Addendum to `docs/SPEC-phase-5-hero-3d.en.md`.
> The spec stays the source of truth for **what the scene shows and how it
> behaves** (graph data, layouts, rendering, tiers, budgets, acceptance
> criteria). This document records where the repo differs from the spec's
> assumptions and what was decided in each case. Where the two disagree, this
> document wins.

## Workflow

- Work on the current branch, `phase-5`. One Conventional Commit per task.
- The spec's names map to the repo's names as follows:

| Spec | Repo |
| --- | --- |
| `src/shared/animation/scroll-store.ts` | `src/shared/lib/stores/scroll-store.ts` |
| `useHeroMorph.ts` (ScrollTrigger in a client island) | dropped — the existing `hero` motion effect (`shared/animation/effects/hero.ts`) writes `heroMorph` |
| "Phase 4 `gsap.matchMedia()` no-preference branch" | the engine's page `matchMedia` (`all` / `isDesktop` / `reduceMotion` conditions) |
| "Phase 4 text crossfade" | a `data-morph` attribute toggled by the `hero` effect, crossfaded in CSS |
| `--silver` | new token (see D1) |
| `#hero-canvas-slot` box "~300 px on mobile" | the existing slot's aspect ratios: `aspect-[4/3]` mobile, `aspect-[7/8]` desktop |

## Decisions

### D1 — `--silver` token

Add `--silver` to `src/app/globals.css` (light, `[data-theme="dark"]`, and the
`:root:not([data-theme])` dark fallback), expose it as `--color-silver` in the
Tailwind theme, and add `"silver"` to `ColorToken` in
`src/shared/theme/tokens.ts`.

| Theme | Value | Contrast vs `--bg` |
| --- | --- | --- |
| dark | `#A8ACB2` | ≈ 8 : 1 |
| light | `#868A90` | ≈ 3.15 : 1 (WCAG 1.4.11 non-text minimum) |

Like `--earth`, it is **decorative only** — never a text color. The comment
above the `@theme` block in `globals.css` and `tokens.test.ts` (excluded from
text-contrast pairs) are updated to say so.

### D2 — Scroll progress comes from the motion system

- `scroll-store.ts`: rename `progress` / `setProgress` to `heroMorph` /
  `setHeroMorph`. It stays the only Zustand store for scroll state.
- The existing `hero` effect already creates the ScrollTrigger the spec asks
  for (`start: "top top"`, `end: "bottom top"` on `#top`). It now writes
  `heroMorph` and, unless `reduceMotion` is true or the graph wrapper has
  `data-gate="fallback"`, toggles `data-morph="chaos" | "layered"` on the
  graph wrapper at 0.5.
- No GSAP import anywhere in `features/hero`. GSAP keeps its single runtime
  entry in `app/[locale]/_motion/motion-entry.ts`.
- The canvas can mount (desktop idle) before the motion chunk loads; that is
  fine because `heroMorph` is 0 at the top and the first scroll loads the
  motion chunk.

### D3 — Server markup and CSS-driven states

`HeroSection` replaces `PlaceholderSlot` with:

```tsx
<div data-hero-graph="" data-gate="pending" data-morph="chaos" className="…">
  <div id="hero-canvas-slot" aria-hidden="true" className="relative aspect-[4/3] md:aspect-[7/8] …">
    <HeroGraphStatic state="chaos" />
    <HeroGraphStatic state="layered" />
    <HeroCanvasGate />
  </div>
  <HeroGraphCaption />   {/* both caption lines + sr-only sentence */}
</div>
```

The wrapper keeps the slot's current grid position (`order-first` on mobile).
The slot drops the dashed placeholder border. `PlaceholderSlot` stays in
`shared/ui` (`AboutSection` still uses it).

Which SVG and caption line are visible is decided **only by CSS**, so the
result is correct before hydration and never flashes:

| Condition | SVG | Caption line |
| --- | --- | --- |
| default (JS, motion allowed) | chaos | chaos, or layered when `data-morph="layered"` |
| `@media (scripting: none)` | layered | layered |
| `@media (prefers-reduced-motion: reduce)` | layered | layered |
| `data-gate="fallback"` | layered | layered |
| `data-gate="live"` | chaos SVG faded out, then `visibility: hidden` | as default |

The spec's acceptance criterion "with JS disabled the Hero looks complete
(layered graph + caption)" is met by the `scripting: none` row.

`HeroGraphStatic` stays a Server Component, draws no text, and each variant
stays under 4 KB of markup. Caption copy lives under `hero.graph` in both
`en.json` and `vi.json` (keys: `legendApp`, `legendFeature`, `legendShared`,
`chaos`, `layered`, `description`).

### D4 — Gate (`HeroCanvasGate`, the only new client file in the initial bundle)

- Imports only `next/dynamic` and the pure `canvas/decide-gate.ts`. Target
  cost ≈ 1–2 KB gzip; measure the home route's first-load JS before and after
  (it is ≈ 142 KB of the 150 KB budget).
- `decideGate({ reduceMotion, hasWebGL, saveData, isDesktop })` returns
  `"fallback" | "wait-idle" | "wait-interaction"`:
  - reduced motion, no WebGL, or Save-Data → `fallback`;
  - `isDesktop` (the engine's existing `DESKTOP_QUERY`: min-width 768px,
    hover, fine pointer) → `wait-idle`;
  - otherwise → `wait-interaction`.

  Requiring `min-width: 768px` for the idle path means Lighthouse's mobile
  run (412 px, no interaction) can never load the 3D chunk, whatever pointer
  type it emulates. (`load-trigger.ts` explains why an idle import would
  otherwise count as initial JS.)
- WebGL probe: throwaway `<canvas>`, `getContext("webgl2") ?? getContext("webgl")`,
  then `WEBGL_lose_context.loseContext()` so the probe does not hold a second
  context.
- `wait-idle`: `load` (or `readyState === "complete"`) → `requestIdleCallback`
  with `{ timeout: 2000 }`, falling back to `setTimeout(1500)`.
- `wait-interaction`: reuse `onFirstInteraction` from
  `shared/animation/load-trigger.ts` (not a second listener set). A
  module-level `interacted` flag lets a return visit to Home mount without a
  new interaction.
- Either way, then wait for an IntersectionObserver on the slot
  (`rootMargin: "200px"`) before mounting.
- State on the wrapper: `data-gate` = `pending → mount → live`, or
  `fallback`. `live` is set on the canvas's `onCreated` + one
  `requestAnimationFrame`. The canvas element (created by JS, not in SSR
  HTML) starts at `opacity: 0` and fades in over 0.6 s via CSS.
- Runtime fallback (PerformanceMonitor `onFallback`, `webglcontextlost`, or
  the error boundary): set `data-gate="fallback"`, CSS fades the canvas out
  over 0.3 s and shows the layered SVG, then the gate unmounts the canvas
  after 300 ms. `fallback` is terminal for that page visit.
- A small class error boundary lives in the gate file and wraps the dynamic
  `HeroCanvas`, so a failed chunk load also falls back. Development only:
  one `console.warn`.
- The gate mirrors the current tier to `data-tier` on the wrapper.

### D5 — Lazy 3D chunk

Contains `HeroCanvas`, `HeroScene`, `Graph`, `GraphNodes`, `GraphEdges`,
`GraphLabels`, `CameraRig`, `useGraphColors`, and `quality/detect-tier.ts` +
`quality/useQualityTier.ts` (tier detection is only needed after the mount
decision, so it stays out of the initial bundle).

- Rendering follows spec §6–7 unchanged; ≤ 4 draw calls.
- `useFrame` in `Graph` is the only per-frame loop; it reads `heroMorph` via
  `useScrollStore.getState()` and calls imperative `update(positions)` methods
  on child refs. React state changes only for the tier and the hovered node.
- Current positions are kept in a `Map<id, Vec3>` so switching to Low (fewer
  nodes) carries positions over. The `InstancedMesh` and edge buffers are
  keyed on node count so React recreates them and R3F disposes the old ones.
- `frameloop` is `"never"` while the slot is off-screen (IntersectionObserver
  inside `HeroCanvas`).
- drei: named imports (`Html`, `PerformanceMonitor`). If the 3D chunk exceeds
  250 KB gzip, switch to drei's per-component entry points before cutting
  features.
- `r3f-perf` is a devDependency loaded via
  `process.env.NODE_ENV === "development" && dynamic(...)` so production
  builds strip it.
- Theme: `useGraphColors` reads `--accent`, `--silver`, `--earth` into
  memoised `THREE.Color`s; a MutationObserver on `data-theme` mutates
  materials and instance colors in place. No remount.
- Disposal: geometries, materials and attributes are declared in JSX so R3F
  disposes them. `webglcontextlost` → `preventDefault()` + `toFallback()`.
- For the leak e2e, `HeroCanvas` publishes `gl.info.memory.geometries` /
  `.textures` as `data-gl-geometries` / `data-gl-textures` on the wrapper
  (same pattern as `data-motion-triggers`).
- `HeroScene` keeps the spec's `{/* Phase 5B: <Avatar /> */}` slot; one
  `<Canvas>`, one WebGL context.

### D6 — Shared changes

- `src/shared/lib/math.ts`: `clamp`, `easeInOutCubic`, `smoothstep`, `damp`,
  `damp3`, with tests.
- `src/shared/animation/effects/cursor.ts`: grow the ring while the pointer is
  over an element with `data-cursor="node"`, checked on `pointermove`
  (`pointerover` does not refire while moving between nodes on one canvas).
- `CLAUDE.md`: add `features/hero/canvas/HeroCanvasGate.tsx` to the list of
  allowed client components; note `heroMorph` in the scroll-store rule;
  document the CSS-driven fallback states.
- Dependencies: `three`, `@types/three`, `@react-three/fiber@^9`,
  `@react-three/drei`; `r3f-perf` as a devDependency. Nothing else.

### D7 — Interaction (behind the cut line)

Hover, highlight, labels, pointer push and parallax follow spec §7.4, §8.2,
§8.3 and §6.3, fine-pointer tiers only. Hover raycasting is throttled to
≈ 30 Hz. They are the first things cut if Must items are open on day 10.

## Testing

Unit (Vitest), written alongside each task:

- New: `graph.test.ts` (spec §3.3), `math.test.ts`, `detect-tier.test.ts`,
  `decide-gate.test.ts`, a `HeroGraphStatic` test (both variants render, no
  text nodes, < 4 KB each).
- Updated: `scroll-store.test.ts` (`heroMorph`), `hero.test.ts` (writes
  `heroMorph`, toggles `data-morph` at 0.5, skips it under reduced motion /
  fallback), `cursor.test.ts` (`data-cursor="node"`), `tokens.test.ts`
  (`silver`, decorative), `messages.test.ts` (`hero.graph.*` in EN and VI).

Playwright — new `e2e/hero-3d.spec.ts`:

- Desktop: after load + idle, a `<canvas>` in `#hero-canvas-slot` and
  `data-gate="live"`; scrolling past the Hero shows the layered caption line;
  no console errors.
- Reduced motion: no canvas, no 3D chunk request, layered SVG visible.
- iPhone 13: no 3D chunk request before interaction; after a scroll,
  `data-tier="low"`.
- WebGL disabled (separate Chromium project, `--disable-webgl`): ends in
  `data-gate="fallback"`, no errors.
- JS disabled: layered SVG and layered caption line visible.
- LCP element is the Hero `h1` (PerformanceObserver).
- 3D chunk ≤ 250 KB gzip, measured like the existing motion-chunk test.
- Leak: after 10 Home ↔ case-study round trips, `data-motion-triggers`,
  `data-gl-geometries` and `data-gl-textures` equal their first-visit values.
- Visual snapshots of the fallback SVG at 390 px and 1440 px, light and dark.

Risk: recent headless Chromium no longer falls back to software WebGL
automatically; the desktop project may need
`--use-angle=swiftshader --enable-unsafe-swiftshader`. Verify on day 3.

Lighthouse CI: no threshold changes.

## Order of work

| Day | Work |
| --- | --- |
| 1 | `graph/*`, `math.ts`, tests |
| 2 | `--silver` token, `HeroGraphStatic`, caption, i18n, slot + CSS states, no-JS e2e |
| 3 | `heroMorph` rename + caption toggle in `hero.ts`; `decideGate`; `HeroCanvasGate` + error boundary; first-load JS measurement; headless WebGL check |
| 4–5 | Dependencies; `HeroCanvas`, `HeroScene`, `CameraRig` fit, nodes + structural edges; 3D chunk size test |
| 6 | Scroll morph, cross-edge fade, spin |
| 7 | Tiers, PerformanceMonitor, runtime Off |
| 8 | Context loss, theme switching, disposal, leak e2e |
| 9–10 | Nice: labels, hover + highlight + cursor; push, parallax |
| 11–12 | Remaining e2e, budgets, real-device check, README "Hero 3D" section, CLAUDE.md |

Cut line unchanged from the spec: on day 10 with Must items open, drop
labels, hover, push and parallax.

## Decisions made during implementation

- **Scroll range.** The `hero` ScrollTrigger (`shared/animation/effects/hero.ts`) uses `start: 0` and a function `end` so the morph reaches at least 0.9 while the graph is still on screen. Spec 8.1's `end: 'bottom top'` finished the morph after the slot had scrolled away. The caption still switches at 0.5.
- **Lighting.** `<Canvas flat>` (no tone mapping) with ambient 1.6 / directional 2.4. Spec 6.1's intensities assume three's legacy light units and rendered the layer colours as near-identical browns.
- **Off rule.** drei's `flipflops` counts inclines too, which switched healthy canvases off after about 10 s. Off is now our own rule: a decline while already Low with fps < 25, or the 3rd decline at Low. Tiers never step up.
- **Labels.** Offset off their node (top layer below, staggered; other layers alternate above/below) instead of spec 7.4's bare `center`, so they never overlap or cover nodes or sit under the sticky header.
- **Console.** three 0.186 warns "Clock: This module has been deprecated" when R3F 9.8 creates its clock; `HeroCanvas` installs three's `setConsoleFunction` to drop only that message (spec 10: no console warnings in production). On context loss `gl.forceContextLoss` is stubbed to avoid a spurious "WEBGL_lose_context not supported" warning on unmount.
- **MotionRoot rescan.** `MotionRoot` rescans two animation frames after a pathname change so effects see the restored hash-scroll position (fixes a race that made ScrollTrigger counts flip).
- **drei imports.** `Html` is imported per-component (`@react-three/drei/web/Html`) to stay under the 3D budget.
- **LCP element.** Lighthouse mobile reports the hero intro paragraph in `#top` as LCP on `/en`, identical to `master` (checked by building `master` separately), so Phase 5 did not change it. Spec 14's "LCP is the h1" holds only on desktop with the canvas live; e2e now asserts that, plus on mobile that LCP is hero DOM text and never the canvas, an svg or anything in `#hero-canvas-slot`.
