# CLAUDE.md — Rules for AI-assisted implementation

This file governs how AI-assisted changes are made in this repo. See also the
two planning docs in `docs/`: the project plan and the Phase 5B avatar spec.

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
  `features/hero/canvas/HeroCanvasGate.tsx` (decides whether the 3D canvas mounts)).
  Pass translated labels to client components as props instead of shipping
  message catalogs to the client.

## 3D and animation conventions (apply once those phases start)

- Any 3D canvas import goes through
  `dynamic(() => import(...), { ssr: false })`. The canvas element is always
  `aria-hidden="true"`. Every piece of text rendered inside the canvas has a
  real DOM counterpart — never canvas-only text.
- Scroll/section progress state lives in exactly one Zustand store
  (`shared/lib/stores/scroll-store.ts`; the hero canvas reads `heroMorph`).
  GSAP writes to it (the `hero` effect); `useFrame` reads it with
  `getState()`. Never drive per-frame updates through React state/re-renders.
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
  `opacity: 0` in HTML or CSS.
- Page transitions use React `<ViewTransition>` (`shared/ui/PageTransition.tsx`
  in each `page.tsx`, never a layout) with `transitionTypes` on links.

## Performance budget (enforced by Lighthouse CI — `lighthouserc.json`)

- Initial JS (gzip) < 150 KB.
- Lazy-loaded 3D chunk ≤ 250 KB gzip, enforced by `e2e/hero-3d.spec.ts`, which
  also checks initial JS ≤ 150 KB gzip.
- `.glb` models < 500 KB (except the Phase 5B avatar, budgeted separately at
  ≤ 1.5 MB).
- Flag budget-relevant changes during implementation rather than waiting for
  Lighthouse CI to catch them later. Never loosen a `lighthouserc.json`
  threshold to get a PR through; fix the page.
- Production builds (`pnpm build`) use `next build --webpack`, not Turbopack:
  on Next 16.3.6, Turbopack's home-page script output was 152 KB versus
  webpack's ~142 KB, and only webpack stays under the 150 KB budget above.
  Re-check this when upgrading Next.
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

## Content

- Case studies and blog posts live in `content/work/*.mdx` and
  `content/blog/*.mdx`, validated by the Zod schemas in `velite.config.ts`.
  Don't hand-write JSON for this content — add an `.mdx` file matching the
  schema.

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
