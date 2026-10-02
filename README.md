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
  steps down; at Low, only a sustained window under 25 fps switches the
  canvas off.
- **Fallback.** No JS, reduced motion, no WebGL, Save-Data, context loss or
  an error all end in the static "layered" SVG; the caption carries the
  meaning as text either way.
- **Measured budgets.** Initial JS 142.6 KB gzip (≤ 150); 3D chunk 249.6 KB
  gzip (≤ 250, ≈ 0.4 KB headroom; the avatar lives in About's own lazy
  `about-avatar` chunk, 25.5 KB, ≤ 26); 3 draw calls (2 once the cross edges
  fade; ≤ 6); 60 fps on desktop (headless Chromium with SwiftShader software GL, 5 s `requestAnimationFrame`
  count, so vsync-bound and not a real-GPU figure); mobile fps: **TODO (owner):
  measure on a real Android phone and iPhone**; Lighthouse mobile Performance
  90 (`/en`) and 91–95 (case study), `/vi` 86 (see below); LCP element on
  mobile: the hero intro paragraph (`<p class="text-fg-muted text-lg ...">` in `#top`),
  the same element as on `master` without Phase 5. With the canvas live on
  desktop it is the `h1`.
  Lazy motion chunk 55.4 KB gzip.
- **Lighthouse note.** `/vi` scores 86 on Performance (threshold 0.9; 87 before Phase 5C, and
  the same 87 is measured on `master` without Phase 5), so `pnpm lhci` fails
  on that URL alone. Measured FCP is ~2.1 s on `/vi`
  vs ~1.7 s on `/en`; the cause was not investigated.
- **Visual snapshots.** `e2e/hero-3d-visual.spec.ts` snapshots the static
  fallback graph (390/1440 px, light/dark). Baselines are platform-specific,
  so it runs locally only (`pnpm exec playwright test e2e/hero-3d-visual.spec.ts`).
