# SPEC — Phase 5: Hero 3D node graph (Three.js)

> Version 1.0 · 2026-10-01 · Requested by: Nguyen Thanh Dat
> Prerequisites: Phases 1–4 done and the **CV v2 update** (`SPEC-update-cv-v2.en.md`) merged.
> Read together with the repo's `CLAUDE.md`. Hard time box: **2 weeks**.

---

## 0. Goal & story

One 3D scene, in the Hero only: a **node graph of a monorepo's packages**. At the top of the page the nodes float in a tangle with cross-feature imports (Feature-Driven, the "before"). As the visitor scrolls through the Hero, the nodes snap into **three clean layers — app → feature → shared** — and the cross-imports fade away (Layered Architecture, the "after"). It retells, without words, the migration described in the Oneloyalty case study and in CV v2.

**Non-negotiables**

1. The Hero `h1` stays the **LCP element**. The 3D code never blocks or delays content.
2. **Lighthouse mobile Performance ≥ 90**, CLS < 0.1, unchanged SEO/accessibility scores.
3. The graph is **decorative and illustrative**: all meaning is also available as DOM text; the canvas is `aria-hidden`.
4. Everything works without WebGL, without JS, and with `prefers-reduced-motion` — via a static SVG of the same graph.
5. Build the scene so the **Phase 5B avatar** can be added later inside the same `<Canvas>` (one WebGL context only).

**Out of scope:** the avatar (Phase 5B), postprocessing/bloom, `.glb` models, `deviceorientation` parallax, any 3D outside the Hero.

---

## 1. Libraries

| Package | Notes |
| --- | --- |
| `three`, `@types/three` | |
| `@react-three/fiber` | Use the major that matches the repo's React version (**v9 for React 19**, v8 for React 18) |
| `@react-three/drei` | Only `Html` and `PerformanceMonitor`. Import named exports so the rest tree-shakes |
| `r3f-perf` | **devDependency**, dev only, never imported in production code paths |

No other new dependencies. GSAP/ScrollTrigger and the Zustand scroll store already exist from Phase 4.

---

## 2. File structure

```
src/features/hero/
  HeroSection.tsx                 # existing — renders the slot content below
  graph/
    graph-data.ts                 # nodes, edges, cross-edges (pure data)
    prng.ts                       # mulberry32 seeded PRNG
    layouts.ts                    # chaosLayout(), layeredLayout(), project2D()
    HeroGraphStatic.tsx           # SERVER component: inline SVG of the graph (placeholder + fallback)
    HeroGraphCaption.tsx          # DOM legend + caption (always rendered)
    __tests__/graph.test.ts
  canvas/
    HeroCanvasGate.tsx            # CLIENT: decides fallback vs. mount, dynamic-imports HeroCanvas
    HeroCanvas.tsx                # CLIENT: <Canvas>, lights, <HeroScene>
    HeroScene.tsx                 # composes <Graph/> now, <Avatar/> in Phase 5B
    Graph.tsx                     # group: nodes + edges + labels, owns per-frame positions
    GraphNodes.tsx                # one InstancedMesh
    GraphEdges.tsx                # LineSegments (structural, cross, highlight)
    GraphLabels.tsx               # drei <Html> labels (max 4 visible)
    CameraRig.tsx                 # fit-to-slot + pointer parallax
    useGraphColors.ts             # reads CSS tokens, reacts to theme changes
    useHeroMorph.ts               # ScrollTrigger → scroll store (DOM side)
  quality/
    detect-tier.ts                # pure function, unit-tested
    useQualityTier.ts             # initial tier + downgrades
src/shared/animation/scroll-store.ts   # existing — add `heroMorph`
public/                          # nothing new (no images, no models)
```

Respect the layer rules: `features/hero` may import from `shared/*`, never from other features.

---

## 3. Task 5.1 — Graph data & layouts (pure, no React)

### 3.1 Data — `graph-data.ts`

The labels are **illustrative** (Oneloyalty-style feature names that are public on the App Store); they do not claim to be the exact internal package list.

```ts
export type Layer = 'app' | 'feature' | 'shared';
export type GraphNode = { id: string; label: string; layer: Layer; size: 1 | 2 | 3 };
export type GraphEdge = { from: string; to: string };

export const NODES: GraphNode[] = [
  // app
  { id: 'admin',        label: 'apps/admin',          layer: 'app',     size: 3 },
  { id: 'extensions',   label: 'apps/extensions',     layer: 'app',     size: 3 },
  // feature
  { id: 'rewards',      label: 'features/rewards',    layer: 'feature', size: 2 },
  { id: 'vip-tier',     label: 'features/vip-tier',   layer: 'feature', size: 2 },
  { id: 'campaign',     label: 'features/campaign',   layer: 'feature', size: 2 },
  { id: 'gamification', label: 'features/gamification', layer: 'feature', size: 2 },
  { id: 'settings',     label: 'features/settings',   layer: 'feature', size: 2 },
  { id: 'redeem',       label: 'features/redeem',     layer: 'feature', size: 2 },
  // shared
  { id: 'ui',           label: 'packages/ui',         layer: 'shared',  size: 3 },
  { id: 'i18n',         label: 'packages/i18n',       layer: 'shared',  size: 3 },
  { id: 'types',        label: 'shared/types',        layer: 'shared',  size: 1 },
  { id: 'api',          label: 'shared/api',          layer: 'shared',  size: 1 },
  { id: 'hooks',        label: 'shared/hooks',        layer: 'shared',  size: 1 },
];

/** Allowed dependencies: always point DOWN (app → feature → shared, or app → shared). */
export const EDGES: GraphEdge[] = [
  { from: 'admin', to: 'rewards' }, { from: 'admin', to: 'vip-tier' }, { from: 'admin', to: 'campaign' },
  { from: 'admin', to: 'gamification' }, { from: 'admin', to: 'settings' },
  { from: 'extensions', to: 'rewards' }, { from: 'extensions', to: 'redeem' }, { from: 'extensions', to: 'gamification' },
  { from: 'admin', to: 'ui' }, { from: 'admin', to: 'i18n' }, { from: 'extensions', to: 'ui' }, { from: 'extensions', to: 'i18n' },
  { from: 'rewards', to: 'types' }, { from: 'rewards', to: 'api' }, { from: 'vip-tier', to: 'types' },
  { from: 'campaign', to: 'types' }, { from: 'campaign', to: 'ui' }, { from: 'gamification', to: 'ui' },
  { from: 'settings', to: 'i18n' }, { from: 'settings', to: 'ui' },
  { from: 'redeem', to: 'api' }, { from: 'redeem', to: 'hooks' },
];

/** Feature ↔ feature imports — the "before" problem. Visible only in the chaos state. */
export const CROSS_EDGES: GraphEdge[] = [
  { from: 'campaign', to: 'rewards' },   // e.g. a reward type living inside Rewards
  { from: 'vip-tier', to: 'rewards' },
  { from: 'rewards',  to: 'campaign' },  // closes a cycle
  { from: 'gamification', to: 'settings' },
];

/** Low tier keeps only these node ids (10). Edges touching removed nodes are dropped. */
export const LOW_TIER_NODE_IDS = ['admin', 'extensions', 'rewards', 'campaign', 'gamification', 'settings', 'ui', 'i18n', 'types', 'api'];
```

### 3.2 Layouts — `prng.ts`, `layouts.ts`

```ts
// prng.ts
export function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

```ts
// layouts.ts
export type Vec3 = [number, number, number];
export const LAYER_Y: Record<Layer, number> = { app: 1.8, feature: 0, shared: -1.8 };
export const LAYER_SPACING = 1.15;   // world units between nodes on a layer
export const CHAOS_RADIUS = 2.6;
export const MIN_DIST = 0.6;
export const SEED = 20260101;

/** Deterministic tangle: rejection-sample points in a sphere, min distance MIN_DIST. */
export function chaosLayout(nodes: GraphNode[], seed = SEED): Record<string, Vec3>;

/** Three horizontal layers, nodes centered and evenly spaced on x, z = 0. */
export function layeredLayout(nodes: GraphNode[]): Record<string, Vec3>;

/** Orthographic projection to an SVG viewBox (for HeroGraphStatic). */
export function project2D(pos: Record<string, Vec3>, viewBox: { w: number; h: number; pad: number }): Record<string, [number, number]>;
```

- `chaosLayout`: for each node, draw `(x, y, z)` uniformly in a cube of side `2·CHAOS_RADIUS`, keep it only if inside the sphere and at least `MIN_DIST` from accepted points; give up after 200 tries per node and accept the last sample. Same seed → identical output on server and client.
- `layeredLayout`: per layer, `x = (i - (n - 1) / 2) * LAYER_SPACING`, in `NODES` order.

### 3.3 Tests — `__tests__/graph.test.ts`

- Every edge references an existing node; no duplicate ids; no duplicate edges.
- No `EDGES` entry goes upward (`shared → feature|app`, `feature → app`) and none goes sideways within a layer.
- Every `CROSS_EDGES` entry is feature ↔ feature.
- `chaosLayout` is deterministic (two calls deep-equal), all points within `CHAOS_RADIUS`, pairwise distance ≥ `MIN_DIST`.
- `layeredLayout` puts each layer at its `LAYER_Y`, x positions symmetric around 0.
- `LOW_TIER_NODE_IDS` ⊂ node ids.

---

## 4. Task 5.2 — Slot, static SVG, caption (server side)

The Hero's visual slot (`#hero-canvas-slot`, laid out in Phase 2: right column on desktop, ~300 px box above the heading on mobile) now contains, in this stacking order:

```tsx
<div id="hero-canvas-slot" className="relative" aria-hidden="true">
  <HeroGraphStatic state="chaos" />          {/* SSR inline SVG — visible immediately, 0 CLS */}
  <HeroCanvasGate />                          {/* client — may mount the canvas on top */}
</div>
<HeroGraphCaption />                          {/* DOM text, NOT aria-hidden */}
```

### 4.1 `HeroGraphStatic` (server component)

- Inline `<svg>` with `viewBox` matching the slot aspect ratio, `width="100%" height="100%"`, `preserveAspectRatio="xMidYMid meet"`, `role="img"` not needed (parent is `aria-hidden`).
- Draws `EDGES` (+ `CROSS_EDGES` when `state="chaos"`) as `<line>` and nodes as `<circle r={4 + size * 2}>`, positions from `project2D(chaosLayout | layeredLayout)`.
- Colors only via CSS variables so it follows the theme: app `var(--accent)`, feature `var(--silver)`, shared `var(--earth)`, edges `var(--silver)` at `opacity: .25`, cross edges `var(--earth)` dashed (`stroke-dasharray: 4 4`).
- Props: `state: 'chaos' | 'layered'`. Used as **placeholder** (`chaos`, so it matches the canvas's first frame) and as **fallback** (`layered` — the "after" message) when the canvas will never mount.
- No text inside the SVG (labels live in the DOM caption).
- Weight budget: < 4 KB of markup.

### 4.2 `HeroGraphCaption` (DOM, accessible)

A small legend under (desktop) / beside (mobile) the slot, `font-mono`, `--fg-muted`, 12px:

- Three swatches with text: `● app` (accent) `● feature` (silver) `● shared` (earth) — color is never the only signal.
- One line that changes with the morph (Phase 4 text crossfade, `aria-live="off"`):
  - `morph < 0.5`: "Feature-driven: features import each other."
  - `morph ≥ 0.5`: "Layered: app → feature → shared."
- A visually hidden sentence: "Illustrative diagram of a monorepo's packages reorganizing from a feature-driven structure into layers."
- VI copy (in `messages` › `hero.graph`): "Feature-driven: các feature import lẫn nhau." / "Layered: app → feature → shared." / "Sơ đồ minh họa các package của một monorepo được sắp xếp lại từ cấu trúc feature-driven thành các tầng."

---

## 5. Task 5.3 — Gate & lazy loading (`HeroCanvasGate.tsx`)

Client component. Decides once whether the canvas may mount, then dynamic-imports it.

```tsx
const HeroCanvas = dynamic(() => import('./HeroCanvas'), { ssr: false, loading: () => null });

type Gate = 'pending' | 'mount' | 'fallback';
```

**Decision order**

1. `prefers-reduced-motion: reduce` → `fallback`.
2. No WebGL (`canvas.getContext('webgl2') ?? getContext('webgl')` is null) → `fallback`.
3. `navigator.connection?.saveData === true` → `fallback`.
4. Otherwise wait for the **trigger**:
   - **Fine pointer (desktop):** after `window` `load`, then `requestIdleCallback` (fallback `setTimeout(1500)`).
   - **Coarse pointer (touch):** on the **first user interaction** (`pointerdown`, `scroll`, `keydown`, whichever comes first, `{ once: true, passive: true }`). If none happens, never load. (This keeps three.js out of Lighthouse's no-interaction mobile run and saves data for visitors who only glance.)
5. When triggered: mount only if the slot is **in the viewport** (IntersectionObserver, `rootMargin: '200px'`); if it is not, wait until it is.

**On `fallback`:** swap the static SVG prop to `state="layered"` (the gate sets `data-fallback` on the slot; CSS shows the layered `<svg>` variant — render both variants server-side and toggle with CSS so no hydration mismatch).

**On mount:** the canvas starts at `opacity: 0` and fades to 1 over 0.6 s **after its first rendered frame** (`onCreated` + one `requestAnimationFrame`); the static SVG fades out at the same time and is then set to `visibility: hidden` (not removed — it is the fallback if WebGL context is lost).

**Errors:** wrap `<HeroCanvas>` in an error boundary; any error → `fallback`, log once with `console.warn` in development only.

---

## 6. Task 5.4 — Canvas & scene

### 6.1 `HeroCanvas.tsx`

```tsx
<Canvas
  dpr={tier.dpr}                                  // see section 9
  gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
  camera={{ fov: 45, near: 0.1, far: 50, position: [0, 0, 9] }}
  frameloop={visible ? 'always' : 'never'}       // IntersectionObserver on the slot
  eventSource={slotRef}                           // pointer events from the slot only
  style={{ position: 'absolute', inset: 0 }}
  aria-hidden
  onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); onFirstFrame(); }}
>
  <ambientLight intensity={0.6} />
  <directionalLight position={[3, 4, 5]} intensity={1.1} />
  <PerformanceMonitor onDecline={tier.downgrade} onFallback={tier.toFallback} flipflops={3} />
  <HeroScene tier={tier.level} />
  {process.env.NODE_ENV === 'development' && <PerfOverlay />}  {/* r3f-perf, dynamic import */}
</Canvas>
```

- No shadows, no fog, no environment maps, no postprocessing.
- `frameloop` switches to `'never'` when the slot leaves the viewport (and back to `'always'` when it returns). The browser already pauses rAF in hidden tabs.

### 6.2 `HeroScene.tsx` — ready for Phase 5B

```tsx
export function HeroScene({ tier }: { tier: TierLevel }) {
  return (
    <>
      <CameraRig tier={tier} />
      <Graph tier={tier} />
      {/* Phase 5B: <Avatar tier={tier} /> goes here, same Canvas, same lights */}
    </>
  );
}
```

### 6.3 `CameraRig.tsx`

- **Fit to slot:** on resize, set `camera.position.z` so the layered graph's width (≈ `6 × LAYER_SPACING` + node radius) fills **85 %** of the slot width, clamped to `[7, 14]`:
  `z = (graphWidth / 2) / (Math.tan(fovRad / 2) * aspect * 0.85)`.
- **Parallax (fine pointer only):** target camera `x/y` offset = normalized pointer × `0.5`; ease with `THREE.MathUtils.damp(current, target, 4, delta)`; always `lookAt(0, 0, 0)`.

---

## 7. Task 5.5 — Graph rendering

### 7.1 Per-frame position model — `Graph.tsx`

Owns a `Float32Array` of current positions (3 per node) and computes targets each frame:

```ts
useFrame((_, delta) => {
  const morph = useScrollStore.getState().heroMorph;      // never subscribe → no React re-renders
  const k = easeInOutCubic(clamp(morph, 0, 1));
  for (i of nodes) {
    target = lerp(chaos[i], layered[i], k) + pushOffset[i]; // pushOffset: section 8
    current[i] = damp3(current[i], target, 6, delta);
  }
  groupRef.current.rotation.y = damp(groupRef.current.rotation.y, (1 - k) * spinAngle, 4, delta);
  spinAngle += 0.05 * delta * (1 - k);                     // slow spin only while tangled
  nodesRef.current.update(current); edgesRef.current.update(current); labelsRef.current.update(current);
});
```

- `easeInOutCubic`, `clamp`, `damp3` live in `shared/lib/math.ts` with unit tests.
- When `k → 1` the rotation eases back to 0 so the layers face the camera squarely.

### 7.2 `GraphNodes.tsx` — one `InstancedMesh`

- Geometry: `new IcosahedronGeometry(0.18, 1)` shared; material `MeshStandardMaterial({ roughness: 0.45, metalness: 0.1 })`.
- Instance scale = `0.75 + size * 0.25` (size 1 → 1.0, 3 → 1.5); hovered node × 1.4 (damped).
- Per-instance color via `setColorAt` from layer tokens (section 7.5); `instanceColor.needsUpdate = true` on theme change only.
- Update matrices with a reused `Object3D` dummy; `instanceMatrix.needsUpdate = true` per frame.
- `frustumCulled = false` (the group is small and always in view).

### 7.3 `GraphEdges.tsx` — three `LineSegments`

| Object | Content | Material | Opacity |
| --- | --- | --- | --- |
| `structural` | `EDGES` | `LineBasicMaterial`, color `--silver` | 0.25 |
| `cross` | `CROSS_EDGES` | `LineDashedMaterial` (`dashSize 0.08, gapSize 0.06`), color `--earth` | `0.6 × (1 − smoothstep(0.35, 0.65, morph))` → fully gone by 0.65 |
| `highlight` | edges touching the hovered node | `LineBasicMaterial`, color `--accent` | 0.8 (0 when nothing hovered) |

- Each has one preallocated `BufferAttribute` (`Float32Array(edges × 6)`), endpoints copied from current node positions every frame, `needsUpdate = true`; `computeLineDistances()` each frame for the dashed one.
- `highlight` geometry is rebuilt only when the hovered node changes.
- `cross` is `visible = false` once its opacity is 0 (skip the draw call).

### 7.4 `GraphLabels.tsx`

- drei `<Html>` per visible label, `center`, `zIndexRange={[10, 0]}`, `pointerEvents: 'none'`, `font-mono` 11px, `--fg-muted`, background `--bg-elevated` at 80 %, radius `--radius-sm`, padding 2px 6px.
- Visible labels: the 4 `size: 3` nodes **only when `morph > 0.7`** (the layered state reads like a diagram), plus the hovered node at any time. Max 4 at once; hovered replaces the least relevant.
- Not rendered at all in the Low tier.
- Positions follow nodes via refs (no React state per frame).

### 7.5 `useGraphColors.ts`

- Read `--accent`, `--silver`, `--earth` from `getComputedStyle(document.documentElement)` into `THREE.Color`s.
- Re-read when `<html data-theme>` changes (`MutationObserver` on `attributes: ['data-theme']`) and update instance colors + line materials. No remount.

---

## 8. Task 5.6 — Scroll morph & interaction

### 8.1 Scroll → store (`useHeroMorph.ts`, DOM side)

- Add `heroMorph: number` (0–1, default 0) to the existing Zustand scroll store.
- In `HeroSection` (client island), a ScrollTrigger: `trigger: '#top'` (the Hero section), `start: 'top top'`, `end: 'bottom top'`, `scrub: true`, `onUpdate: (self) => setState({ heroMorph: self.progress })`. Set with `useScrollStore.setState`, which does not re-render components that read via `getState()`.
- Lives inside the Phase 4 `gsap.matchMedia()` no-preference branch; under reduced motion the canvas never mounts anyway.
- The same value drives the caption crossfade (section 4.2).

### 8.2 Hover (fine pointer only)

- Raycast against the `InstancedMesh` (`intersect.instanceId`), throttled to ~30 Hz.
- Hovered node: scale × 1.4, its edges go to the `highlight` layer, its label shows.
- Cursor over a node: set `data-cursor="node"` on the slot so the Phase 4 custom cursor grows; no click action.

### 8.3 Pointer push (fine pointer, chaos only)

- While `morph < 0.3`, nodes within **1.2** world units of the pointer ray's closest point are pushed away by `(1.2 − d) × 0.35` along the away vector; weight fades to 0 between morph 0.2 and 0.3.
- `pushOffset` is damped (factor 6) back to 0 when the pointer leaves.

### 8.4 Touch

No hover, no push, no tap action. Only the scroll morph and the idle spin.

---

## 9. Task 5.7 — Quality tiers

`detect-tier.ts` (pure, unit-tested) returns the initial tier; `useQualityTier` exposes `{ level, dpr, downgrade(), toFallback() }`.

| Tier | When (initial) | `dpr` | Nodes | Labels | Hover / push | Parallax |
| --- | --- | --- | --- | --- | --- | --- |
| **High** | fine pointer AND `hardwareConcurrency ≥ 8` AND (`deviceMemory` unknown or ≥ 8) | `[1, 1.5]` | 13 | yes | yes | yes |
| **Medium** | fine pointer, otherwise | `[1, 1.25]` | 13 | yes | yes | yes |
| **Low** | coarse pointer OR slot width < 480px | `1` | 10 (`LOW_TIER_NODE_IDS`) | no | no | no |
| **Off** | reduced motion, no WebGL, Save-Data, `PerformanceMonitor` fallback, or `webglcontextlost` | — | static SVG `layered` | — | — | — |

- `PerformanceMonitor`: `onDecline` steps down one tier (High → Medium → Low); `onFallback` (after 3 flip-flops, or sustained < 25 fps) → **Off**. Never step back up within the session.
- Switching to **Off** at runtime: fade the canvas out (0.3 s), show the static SVG `layered`, then unmount the canvas.
- Changing node count (→ Low) re-creates the `InstancedMesh` with fewer instances; positions carry over by id.

---

## 10. Task 5.8 — Robustness & cleanup

- `webglcontextlost` on `gl.domElement` → `preventDefault()` and switch to **Off** (no restore attempt).
- Everything created in `useMemo` (geometries, materials, attributes) is attached to the R3F tree so R3F disposes it on unmount; anything created imperatively is disposed in an effect cleanup.
- After 10 navigations Home ↔ case study: `gl.info.memory.geometries` and `.textures` return to the same values; `ScrollTrigger.getAll().length` does not grow.
- No `console.error`/`console.warn` in production in any tier.
- Theme switch while the canvas is running: colors update within one frame, no remount, no flash.

---

## 11. Performance budget

| Item | Budget | How to check |
| --- | --- | --- |
| Initial JS of `/[locale]` (gzip) | unchanged vs. before Phase 5 (≤ 150 KB) | `next build` output; three/R3F must not appear in the route's first-load chunks |
| Lazy 3D chunk (three + R3F + drei parts + scene) | ≤ 250 KB gzip | `@next/bundle-analyzer` |
| Draw calls | ≤ 6 (1 nodes, 3 lines, labels are DOM) | `r3f-perf` in dev |
| Frame time | 60 fps desktop mid-range; ≥ 30 fps on a mid-range phone (Low tier) | DevTools Performance, 10 s of scrolling |
| Main-thread work on mount | no long task > 50 ms caused by mounting | DevTools Performance |
| LCP | still the Hero `h1`, < 2.5 s mobile | Lighthouse + `PerformanceObserver` in Playwright |
| CLS | < 0.1 (slot size fixed from SSR; SVG ↔ canvas swap causes no shift) | Lighthouse |

---

## 12. Task 5.9 — Tests

**Unit (Vitest)**

- `graph.test.ts` (section 3.3).
- `math.test.ts`: `easeInOutCubic(0)=0`, `(1)=1`, monotonic; `damp` converges; `clamp`.
- `detect-tier.test.ts`: each row of the tier table, including unknown `deviceMemory` and Save-Data.
- Gate decision logic extracted into a pure `decideGate(env)` and tested (reduced motion, no WebGL, Save-Data, coarse pointer waits for interaction).

**Playwright**

- Desktop Chromium: after `load` + idle, a `<canvas>` exists inside `#hero-canvas-slot`; scrolling to the bottom of the Hero sets the caption to the "Layered" line; no console errors.
- `reducedMotion: 'reduce'`: no `<canvas>`, static SVG visible with `data-fallback`, no request for the 3D chunk.
- Mobile profile (iPhone 13, coarse pointer): no 3D chunk request before the first interaction; after a `scroll`, the canvas mounts in Low tier (assert via a `data-tier="low"` attribute on the slot).
- WebGL disabled (`--disable-webgl` launch arg on a Chromium project): fallback SVG, no errors.
- LCP check: a `PerformanceObserver('largest-contentful-paint')` snippet confirms the LCP element is the Hero `h1`.
- Visual snapshot of the static SVG fallback (light + dark) at 390 px and 1440 px.
- Leak check: 10 round trips Home ↔ case study, then read `ScrollTrigger.getAll().length` via `page.evaluate` — equal to the value after the first visit.

**Lighthouse CI** — existing thresholds must still pass on `/en` mobile (Performance ≥ 90, Accessibility ≥ 95, Best Practices 100, SEO 100).

---

## 13. Delivery plan (2-week time box)

| Day | Work | Must / nice |
| --- | --- | --- |
| 1 | 5.1 data, layouts, tests | Must |
| 2 | 5.2 static SVG + caption (site already looks finished without WebGL) | Must |
| 3 | 5.3 gate + lazy load + fade-in | Must |
| 4–5 | 5.4 canvas, camera fit; 5.5 nodes + structural edges | Must |
| 6 | 8.1 scroll morph + cross-edges fade + spin | Must |
| 7 | 9 quality tiers + PerformanceMonitor + Off switch | Must |
| 8 | 10 robustness, theme switching, cleanup | Must |
| 9 | 7.4 labels, 8.2 hover + highlight | Nice |
| 10 | 8.3 pointer push, CameraRig parallax | Nice |
| 11–12 | 12 tests, budget checks, fixes | Must |
| 13–14 | Buffer; README section | — |

**Cut line:** if day 10 arrives with "Must" items open, drop labels, hover, push and parallax and ship. The scene still tells the full story through the scroll morph.

---

## 14. Acceptance criteria

- [ ] Static SVG renders server-side in the slot; with JS disabled the Hero looks complete (layered graph + caption)
- [ ] Desktop: canvas mounts after load + idle, fades in over the SVG with no visible jump and no layout shift
- [ ] Mobile: no three.js request until the first interaction; then Low tier (10 nodes, no labels/hover)
- [ ] Scrolling the Hero morphs chaos → layered smoothly and reverses on scroll up; cross-edges are gone by morph 0.65; caption line switches at 0.5
- [ ] Hover (desktop) enlarges the node, highlights its edges and shows its label; push works only while tangled
- [ ] Theme toggle recolors nodes and edges live from CSS tokens (accent / silver / earth)
- [ ] Reduced motion, no WebGL, Save-Data and context loss all end in the static layered SVG with no console errors
- [ ] `PerformanceMonitor` downgrades tiers and falls back to Off; never upgrades back
- [ ] Budgets in section 11 met: initial JS unchanged, 3D chunk ≤ 250 KB gzip, ≤ 6 draw calls, 60 fps desktop / ≥ 30 fps mid-range mobile
- [ ] LCP element is still the Hero `h1`; Lighthouse mobile Performance ≥ 90, CLS < 0.1, a11y/SEO scores unchanged
- [ ] No GPU memory growth and no ScrollTrigger growth after 10 navigations
- [ ] `HeroScene` has a clear slot for the Phase 5B avatar; only one WebGL context on the page
- [ ] Lint, typecheck, unit, e2e, build and Lighthouse CI are green
- [ ] README gains a short "Hero 3D" section: what it shows, the tiers, the fallback, and the budget numbers measured

---

## 15. Notes for Dat (not for the AI)

- The graph is labeled as **illustrative** on purpose: it echoes the Oneloyalty story without claiming to be its exact internal package list. If you prefer neutral names (`feature-a`, `feature-b` …), change only `graph-data.ts`.
- Loading three.js on mobile only after the first interaction is a deliberate trade-off: Lighthouse and quick visitors get a fast page with the static diagram; engaged visitors get the 3D scene.
- Test on one real mid-range Android phone and one iPhone before merging — the emulated numbers are optimistic for WebGL.
