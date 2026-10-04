# Portfolio — Nguyen Thanh Dat

![Home page](docs/readme/home.webp)

**Live URL:** added at launch.

## What it is

A bilingual (English / Vietnamese) portfolio of Nguyen Thanh Dat, a front-end
engineer building Shopify apps with React and TypeScript. It presents three
case studies, an interactive 3D graph in the Hero and a 3D avatar in About,
with static fallbacks for every 3D and motion feature.

## Stack

Next.js 16 (App Router; production builds use webpack), React 19, TypeScript,
Tailwind CSS 4, next-intl 4, Velite (MDX content), GSAP + Lenis, three.js +
React Three Fiber, Zustand, Vitest, Playwright, Lighthouse CI.

## Architecture

Layering is `app → features → shared`; a lower layer never imports a higher
one (enforced by `eslint-plugin-boundaries`). Server Components are the
default. Conventions for contributors and AI-assisted changes live in
`CLAUDE.md`; plans and specs in `docs/`.

- `src/app` — routes (`[locale]` pages, sitemap, robots, OG images) and the
  single motion root (`_motion`).
- `src/features/{about,contact,hero,layout,skills,work}` — page sections and
  their feature-specific motion and 3D code.
- `src/shared/{animation,content,i18n,lib,mdx,seo,theme,three,ui}` — generic
  building blocks: motion markers, content access, i18n, site config, MDX
  rendering, SEO helpers, theme, 3D quality tiers, UI primitives.
- `content/` — case studies (MDX), validated at build time.

## 3D approach

### Hero graph

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

### About avatar

The About section shows a 3D avatar that waves once when the section scrolls
into view. It lives in its own lazy `about-avatar` chunk (≤ 26 KB gzip beyond
what the Hero already loaded), mounts only after the first scroll, renders
only while on screen, and falls back to a static image without WebGL, with
reduced motion or on error. At most two WebGL contexts exist at once.

## i18n

next-intl with two locales, `/en` and `/vi`. UI copy lives in
`src/shared/i18n/messages/{en,vi}.json`; a unit test keeps both catalogs'
key trees and placeholders identical. A case study without a published
Vietnamese version falls back to English with a notice; that page is
canonicalised to `/en` and left out of hreflang and the sitemap.

## Content model

Case studies are `content/work/<slug>.<locale>.mdx`, validated by
`workFrontmatter` (`src/shared/content/work-schema.ts`) via `velite build --strict`:

- `slug`, `locale` (`en` | `vi`)
- `title` (≤ 60 chars), `summary` (shown on the page), `description` (140–160 chars, meta/OG only)
- `role`, `team?`, `company?`, `period` (`{ start, end? }`, `YYYY-MM`)
- `stack` (tags), `metrics` (1–4 `{ value, label }`; the first is the headline)
- `links` (`appStore`, `live`, `github`, `demo`; all optional URLs)
- `dateModified?`
- `draft?` — `true` hides a translation in production builds (it behaves like
  a missing one) and shows it in `pnpm dev` for review. Publish by deleting
  the line; tests derive their expectations from the files.

MDX bodies may use `<Image src width height alt />` (rendered with
`next/image`, lazy, fixed size).

## Feature flags

`site.features.blog` in `src/shared/lib/site.ts` is `false`: the header has no
Blog link, `/[locale]/blog/**` returns 404 and the sitemap has no blog URLs.
To launch the blog, set it to `true` and add posts as
`content/blog/<slug>.<locale>.mdx` — no other code change.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Velite + Next dev server (Turbopack) |
| `pnpm build` | Velite + production build (`next build --webpack`) |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint, including layer boundaries |
| `pnpm typecheck` | Velite + `tsc --noEmit` |
| `pnpm test` | Velite + Vitest unit tests |
| `pnpm test:e2e` | Playwright (builds and starts the app locally) |
| `pnpm check:claims` | Fails if a retracted claim appears in the build, content or messages |
| `pnpm lhci` | Lighthouse CI against a local production server |
| `pnpm format` / `format:check` | Prettier |
| `pnpm knip` | Unused files and exports |

## Quality gates

CI (`.github/workflows/ci.yml`) runs on every pull request: lint, typecheck,
unit tests, build, `check:claims`, the budget e2e specs (`motion`, `hero-3d`,
`hero-3d-no-webgl`, `about-avatar`: initial JS ≤ 150 KB gzip, 3D chunk ≤ 250 KB,
About chunk ≤ 26 KB, motion chunk ≤ 70 KB) and Lighthouse CI with the
thresholds in `lighthouserc.json`. Lighthouse CI on preview deployments, a
bundle-budget script and the full browser matrix come in Phase 6B.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | in production | Site origin for canonical URLs, hreflang, the sitemap and OG images |

## Credits

- Fonts: Open Sans and Google Sans Code (Google Fonts, SIL Open Font License;
  the OG image bundles Open Sans Bold with its `OFL.txt`).
- The avatar was generated with Meshy under a private license; no
  attribution required.

## License

All rights reserved. The code may be read for reference; the content, the
avatar and the CV are not licensed for reuse.
