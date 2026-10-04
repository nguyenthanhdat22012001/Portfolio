# CLAUDE.md — Rules for AI-assisted implementation

This file governs how AI-assisted changes are made in this repo. See also the
two planning docs in `docs/`: the project plan and the Phase 5B/5C avatar specs.

## Architecture

- Layering is `app → features → shared`. A lower layer never imports a higher
  one. This is enforced by ESLint (`eslint-plugin-boundaries` in
  `eslint.config.mjs`) — if `pnpm lint` fails on a boundaries error, that is
  the correct signal to redesign the change, not to suppress the rule.
- Server Components are the default. Add `"use client"` only to a file that
  directly touches GSAP or the React Three Fiber canvas, or to a minimal
  interactive control that cannot work without client JS (currently
  `shared/theme/ThemeToggle.tsx`, `features/layout/LocaleSwitcher.tsx`,
  `features/contact/CopyEmailButton.tsx`, which must sit next to a `mailto:`
  link as its no-JS fallback, and `app/[locale]/_motion/MotionRoot.tsx`, and
  `features/hero/canvas/HeroCanvasGate.tsx` (decides whether the 3D canvas
  mounts), and `features/about/avatar/AboutAvatarGate.tsx` (decides whether the
  About avatar canvas mounts, once the page is idle or on the first input,
  never during hydration), and `features/about/avatar/AboutAvatarCanvas.tsx`
  (the About avatar canvas, the `about-avatar` chunk's entry)).
  Pass translated labels to client components as props instead of shipping
  message catalogs to the client.

## Analytics

- Mark elements with `trackAttrs()` from `shared/analytics/events.ts`
  (server-rendered `data-track*` attributes, sent by the inline listener in
  `tracking-script.ts`). Never use Umami's `data-umami-event`: it cancels
  same-tab clicks. The listener is on `window` in the capture phase because
  motion's hash links stop propagation. Code with no DOM element (the canvas)
  calls `track()` from `shared/analytics/track.ts`, its own file so lazy chunks
  share no module with the initial bundle.
- Umami is injected by an inline loader on the first
  scroll/pointermove/pointerdown/keydown/touchstart/click (`umami-loader.ts`),
  not `next/script` (+1.6 KB) and not on load: Lighthouse counts its script
  size. Clicks and `track()` calls before it arrives queue on
  `window.__umamiQueue`. A visit with no input records no pageview; that is
  accepted. The script carries `data-exclude-hash` because hash links
  `pushState` their hash.
- `umamiConfig()` decides where Umami may send (Vercel production only, via
  `data-domains`); `speedInsightsEnabled()` renders Speed Insights only on
  Vercel. Vercel Web Analytics stays off.

## Security headers

- `shared/security/headers.ts` builds the static headers and CSP per
  environment; `next.config.ts` applies them (`securityHeaderRules`).
  Document-only headers (CSP, Referrer-Policy, Permissions-Policy,
  X-Frame-Options, HSTS) are not sent on `/_next/static/*`, only `nosniff`:
  Lighthouse counts response headers in script transfer size. Production adds
  HSTS and `upgrade-insecure-requests`; development adds `'unsafe-eval'` and
  `ws:`. `connect-src` includes `blob:` for GLTFLoader textures and
  `https://gateway.umami.is`, where the Cloud tracker posts events (checked
  by an e2e test running the vendored tracker, `e2e/fixtures/umami-script.js`).
  No `interest-cohort` (Best Practices penalty).
- Change a CSP host only with a network capture from a real deployment. Never
  add `'unsafe-eval'` outside development, or a wildcard host.

## 3D and animation conventions (apply once those phases start)

- Any 3D canvas import goes through
  `dynamic(() => import(...), { ssr: false })`. The canvas element is always
  `aria-hidden="true"`. Every piece of text rendered inside the canvas has a
  real DOM counterpart — never canvas-only text.
- Scroll/section progress state lives in exactly one Zustand store
  (`shared/lib/stores/scroll-store.ts`; the hero canvas reads `heroMorph`).
  GSAP writes to it (the `hero` effect); `useFrame` reads it with
  `getState()`. Never drive per-frame updates through React state/re-renders.
- The avatar's intro (Phase 5B, now in About) is not a GSAP timeline: a clock
  in `useFrame` evaluates the pure `features/about/avatar/choreography.ts`, and
  clips change only on its phase edges. It exposes `data-avatar-phase`,
  `data-avatar-hidden`, `data-avatar-failed` and `data-avatar-hover` on the
  About slot (`#about-avatar-slot`) for tests, CSS and the cursor effect (which
  reacts to `data-cursor="node"` or `data-avatar-hover`). It starts when the
  slot crosses 70 % of the viewport (IntersectionObserver, no GSAP), pauses off
  screen, and never replays in a page view. The About canvas is separate from
  the Hero's; each renders only while its slot is in view; at most 2 WebGL
  contexts.
- The hero graph's visible state is CSS-driven: the server renders both
  static SVGs and both caption lines; `data-gate` (set by
  `HeroCanvasGate`), `data-morph` (set by the `hero` effect),
  `@media (scripting: none)` and `prefers-reduced-motion` decide which shows.
  Don't toggle them from React state.
- Hero canvas specifics: `<Canvas flat>` (no tone mapping; light intensities are
  tuned for that), drei `Html` is imported per-component
  (`@react-three/drei/web/Html`) to stay under the 3D budget, and the quality
  tier only ever steps down (our own Off rule in
  `shared/three/perf-policy.ts`, not drei's `flipflops`); the device tier lives
  in the shared `shared/three/quality-store.ts`, and each canvas applies its
  own slot cap.
- Exactly one `Lenis` instance and one `gsap.ticker` for the whole app,
  created once at the app root. Do not instantiate either inside a feature
  component.
- Respect `prefers-reduced-motion`: disable scrubbing/pinning and Lenis, and
  keep any 3D scene static.
- Motion is declarative: Server Components mark elements with
  `motion("<name>")` / `magnetic()` from `shared/animation/motion.ts`, and
  effects live in `shared/animation/effects/` (generic) or
  `features/*/motion/` (feature-specific). Register every effect in
  `app/[locale]/_motion/registry.ts`; the name list and the registry are
  type-checked against each other.
- `gsap`, `gsap/*`, and `lenis` are imported at runtime only in
  `app/[locale]/_motion/motion-entry.ts`, which `MotionRoot` loads on the
  first interaction. Everywhere else use `import type`.
- Effects never hide or move content that is already on screen or scrolled
  past when they start (`isAtOrAboveViewport`), and nothing starts at
  `opacity: 0` in HTML or CSS. The only exceptions: the inactive half of the
  hero graph's two-state SVG/caption toggle (`[data-graph-state]` /
  `[data-caption-line]`) and of the avatar fallback's wave/idle pair
  (`[data-avatar-pose]`), hidden with `opacity: 0; visibility: hidden`;
  `.hero-graph-canvas` and `.about-avatar-bubble`, which JS creates; and
  `.about-avatar-fallback`, hidden under `[data-avatar-stage="3d"]` while the
  3D avatar stands in its place.
- Page transitions use React `<ViewTransition>` (`shared/ui/PageTransition.tsx`
  in each `page.tsx`, never a layout) with `transitionTypes` on links.

## Performance budget (enforced by Lighthouse CI — `lighthouserc.json`)

- Initial JS (gzip) < 150 KB.
- Lazy-loaded 3D chunk ≤ 250 KB gzip, enforced by `e2e/hero-3d.spec.ts`, which
  also checks initial JS ≤ 150 KB gzip. It measures 249.6 KB after Phase 5C
  (the avatar left the Hero). Anything new for the canvas goes in its own lazy chunk.
  Code in another chunk must not import the canvas chunk's own modules
  (`graph-frame`, `layouts`, `useGraphColors`, `@/shared/lib/math`, …): a
  module shared across chunks is no longer scope-hoisted into the canvas
  chunk, which cost ~0.7 KB gzip in Phase 5B. Pass values in as props instead.
- Lazy About avatar chunk (`about-avatar`: everything loaded by scrolling to
  About after the Hero is live — canvas, avatar code, `GLTFLoader`, meshopt
  decoder, `SkeletonUtils`, `ContactShadows`, drei `Html`) ≤ 26 KB gzip,
  excluding the three/R3F chunks the Hero already loaded (measured 25.5 KB
  after Phase 5C), enforced by `e2e/about-avatar.spec.ts`. It mounts only
  after the first scroll. Load the GLB with three's `GLTFLoader` through R3F
  `useLoader`, not drei's `useGLTF` (which bundles `DRACOLoader`).
- `.glb` models < 500 KB (except the avatar, budgeted separately at
  ≤ 1.5 MB).
- Flag budget-relevant changes during implementation rather than waiting for
  Lighthouse CI to catch them later. Never loosen a `lighthouserc.json`
  threshold to get a PR through; fix the page.
- Production builds (`pnpm build`) use `next build --webpack`, not Turbopack:
  on Next 16.3.6, Turbopack's home-page script output was 152 KB versus
  webpack's ~142 KB, and only webpack stays under the 150 KB budget above.
  Re-check this when upgrading Next.
- `pnpm check:bundles` (`scripts/check-bundles.mjs`) enforces initial JS
  ≤ 150 KB gzip for `/en` and `/vi` from the build output in CI, and that no
  initial chunk contains three.js; lazy chunks stay in the e2e specs.
- Lighthouse `largest-contentful-paint ≤ 2500` is `warn`, deliberately: Lantern's
  simulated mobile LCP cannot reach 2.5 s with the ~130 KB framework runtime
  (observed LCP is 40–80 ms). Real-user LCP from Speed Insights is the KPI. Do
  not change it to `error`, and do not treat `warn` as an allowed way to loosen
  any other threshold: all other assertions are `error`.
- Symbol glyphs (← → ↓ ↗ − ≤) render from a local system font: a narrow
  `unicode-range` `@font-face` with `local()` sources in `globals.css`, first in
  both font stacks, avoids 65–150 KB of math/symbol web-font faces per page.
  Don't add a new symbol character to copy without adding it to that range (and
  to the test that checks it).
- The `SiteHeader` Home links and the `ArticleLayout` back link use
  `prefetch={false}` (hover still prefetches); prefetching the home chunk on
  load pushed case studies over the Lighthouse script-size limit.
- Lazy motion chunk (GSAP + ScrollTrigger + SplitText + Lenis + effects)
  ≤ 70 KB gzip, enforced by `e2e/motion.spec.ts` in CI.
- CLS ≤ 0.1 (Lighthouse CI).

## i18n

- No hardcoded user-facing strings. Every piece of copy goes through
  next-intl message keys in `shared/i18n/messages/en.json` and
  `shared/i18n/messages/vi.json`. Add a key to both files together.
- The request locale comes from `next/root-params` in
  `shared/i18n/request.ts`; don't call `setRequestLocale`. Keep
  `generateStaticParams` in `app/[locale]/layout.tsx` — pages without their
  own (home, blog index) rely on it to stay static. Route handlers and
  server actions can't read root params, so pass `locale` explicitly there.
- next-intl's `alternateLinks` is `false` in `shared/i18n/routing.ts`: hreflang
  comes only from `buildMetadata`, so fallback pages never advertise `/vi`.
- Locale routing lives in `src/proxy.ts` (Next 16's rename of
  `middleware.ts`).

## SEO

- The site origin comes only from `getSiteUrl()` (`shared/seo/site-url.ts`);
  production deploys must set `NEXT_PUBLIC_SITE_URL`.
- Every route's `generateMetadata` goes through `buildMetadata` with
  `availableLocales` (real, non-fallback locales — `getWorkLocales` /
  `getPostLocales` for content). Fallback pages are canonicalised to `/en`
  and left out of hreflang and the sitemap.
- Every indexable page renders its structured data with `<JsonLd>` and the
  builders in `shared/seo/json-ld/`.
- Titles ≤ 60 characters; meta descriptions 140–160. Content frontmatter
  needs a `description` (Velite enforces it via `velite build --strict`);
  site-wide meta copy is checked by `messages.test.ts`.
- A new indexable page type needs: an `opengraph-image.tsx`, a sitemap entry
  in `shared/seo/sitemap.ts`, and a URL in `lighthouserc.json`.

## Testing

- TDD expectation: write or adjust the relevant Vitest (unit) or Playwright
  (e2e) test alongside feature code, not as an afterthought.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` must all pass
  before a change is considered done.
- Playwright projects: `chromium` (all, incl. WebGL specs), `chromium-no-webgl`,
  `firefox`, `webkit`, `iphone-13`, `pixel-7`, `chromium-reduced-motion`; WebGL
  spec files are matched by file name in `playwright.config.ts`. Tag a test
  `@webgl` (desktop Chromium only), `@desktop` (not on phones) or `@motion` (not
  under reduced motion).
- Required checks on `master`: `checks`, every `e2e (<project>)`, `lhci`,
  `lighthouse-preview` (the `gh api` command is in the README). Preview
  Lighthouse sends the Vercel bypass header; its secret is scrubbed from report
  artifacts before upload, and workflows keep `permissions: contents: read`.

## Content

- Case studies and blog posts live in `content/work/*.mdx` and
  `content/blog/*.mdx`, validated by the Zod schemas in `velite.config.ts`.
  Don't hand-write JSON for this content — add an `.mdx` file matching the
  schema.
- Case study files are `content/work/<slug>.<locale>.mdx`. `draft: true`
  hides a translation in production builds (it behaves like a missing one:
  EN fallback, no hreflang, no sitemap entry) and shows it in `pnpm dev`. An
  English file is never a draft.
- MDX `<Image src width height alt />` maps to `next/image`
  (`shared/mdx/MdxImage.tsx`): lazy, keeps the given size, renders nothing
  if the file under `public/` is missing.
- The blog is behind `site.features.blog` (`shared/lib/site.ts`); use
  `isBlogEnabled()` from `@/shared/content` for anything blog-related.
- `scripts/stale-claims.mjs` is the single list of banned claims; add a
  pattern there (with a case in `stale-claims.test.ts`) when a claim is
  retracted.

## Out of scope reminders

- No CMS, no blog comments, no admin dashboard, no multiple 3D scenes per
  page, no WebGPU (v1.0 non-goals from the project plan).
- If a convention here becomes outdated, update this file in the same
  change that changes the convention.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
