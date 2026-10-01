# Portfolio — Nguyen Thanh Dat

Personal portfolio built with Next.js 16, React 19, Tailwind CSS 4, next-intl
and Velite. See `CLAUDE.md` for conventions and `docs/` for plans and specs.

## Hero 3D

The Hero shows an illustrative node graph of a monorepo's packages. At the
top of the page it is a tangle with feature ↔ feature imports; scrolling
through the Hero snaps it into three layers (app → feature → shared) — the
migration from the Oneloyalty case study, told without words.

- **Loading.** A static SVG of the graph renders on the server. The canvas
  (three.js + React Three Fiber) loads lazily: on desktop after `load` + idle,
  on touch/narrow screens only after the first interaction.
- **Tiers.** High / Medium (fine pointer; dpr up to 1.5 / 1.25, 13 nodes,
  labels, hover, push, parallax) and Low (touch or narrow slot; dpr 1,
  10 nodes, no labels or interaction). `PerformanceMonitor` only ever
  steps down; repeated drops switch the canvas off.
- **Fallback.** No JS, reduced motion, no WebGL, Save-Data, context loss or
  an error all end in the static "layered" SVG; the caption carries the
  meaning as text either way.
- **Measured budgets.** Initial JS 141.2 KB gzip (≤ 150); 3D chunk 249.6 KB
  gzip (≤ 250); 3 draw calls (2 once the cross edges fade; ≤ 6); 60 fps on
  desktop (headless Chromium with SwiftShader software GL, 5 s `requestAnimationFrame`
  count, so vsync-bound and not a real-GPU figure); mobile fps: **TODO (owner):
  measure on a real Android phone and iPhone**; Lighthouse mobile Performance
  91 (`/en`) and 91–95 (case study), `/vi` 87 (see below); LCP element: the
  hero intro paragraph (the `h1` is not the LCP element in these runs).
  Lazy motion chunk 55.2 KB gzip.
- **Lighthouse note.** `/vi` scores 87 on Performance (threshold 0.9). The same
  87 is measured on `master` without Phase 5, so it is not caused by the hero
  canvas: the Vietnamese page has a later FCP (about 2.1 s vs 1.7 s on `/en`).
- **Visual snapshots.** `e2e/hero-3d-visual.spec.ts` snapshots the static
  fallback graph (390/1440 px, light/dark). Baselines are platform-specific,
  so it runs locally only (`pnpm exec playwright test e2e/hero-3d-visual.spec.ts`).
