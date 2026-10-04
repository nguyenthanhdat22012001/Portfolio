# Phase 6A — Launch content, VI, hidden blog, 404/footer/README — Design

Date: 2026-10-04 · Branch: `phase-6-a` · Source spec: `docs/SPEC-phase-6-launch.en.md`

## Scope

This branch implements Tasks **6.0, 6.1, 6.2 and 6.6** of the Phase 6 spec.
Tasks 6.3 (analytics), 6.4 (CI gates) and 6.5 (security headers) move to a
later `phase-6-b` branch. Task 6.7 (launch checklist) belongs to Dat.

Success: `pnpm lint && pnpm typecheck && pnpm test && pnpm build &&
pnpm check:claims` and the Playwright suite pass; the done-when lists of 6.0,
6.1, 6.2 and 6.6 below hold; initial JS and lazy-chunk budgets are unchanged.

## Decisions that differ from or refine the Phase 6 spec

| Topic | Phase 6 spec | Decision here | Why |
| --- | --- | --- | --- |
| Case study slugs | `oneloyalty-monorepo`, `safebulk` (zip) | Keep `oneloyalty-layered-architecture`, `safebulk-bulk-editor` | Dat's choice; no URL change |
| File names | `<slug>.en.mdx` replaces existing files | `content/work/<slug>.{en,vi}.mdx`; old `<slug>.mdx` deleted | One naming scheme for both locales |
| Frontmatter shape | zip: no `locale`/`description`/`dateModified`; has `cover`/`order`/`featured`/`draft` | Adapt the zip files to the repo schema (approach A); schema gains only `draft` | Keeps `velite --strict` SEO rules; `chapter-order.ts` already owns order; covers don't exist |
| `draft: true` | "remove once Dat approves" | Excluded in production builds (falls back to EN), rendered in `pnpm dev` | Dat can review in place; removing the flag is the only step to publish |
| `siteConfig` | `siteConfig.features.blog`, `siteConfig.lighthouse` | The existing `site` object in `src/shared/lib/site.ts` | No second config object |
| Footer scores | show if ≤ 90 days old | `site.lighthouse = null` until Dat's production run | Current numbers come from local LHCI, not production |
| Skills | grep expects Formik only in Swift stack | Skills keep Formik and Redux Toolkit | Genuine skills from Swift; only the false "replaced → −55%" story goes |
| About chunk budget | 28 KB | Unchanged 26 KB (CLAUDE.md) | Stricter wins; not touched in this branch anyway |

## Task 6.0 — Final content

### Content files

- Delete `content/work/{swift-performance,oneloyalty-layered-architecture,safebulk-bulk-editor}.mdx`.
- Add six files from `content-final.zip`, adapted:
  - `slug` rewritten to the current slugs (`oneloyalty-monorepo` →
    `oneloyalty-layered-architecture`, `safebulk` → `safebulk-bulk-editor`).
  - Add `locale: en` / `locale: vi`.
  - Add `description` (140–160 chars) to every file, written only by
    rephrasing that file's `summary` — no new facts. Dat reviews them.
  - Add `dateModified: 2026-10-04`.
  - Remove `cover`, `order`, `featured`.
  - VI files keep `draft: true`.
- Body text is used as delivered, except any MDX syntax fixes needed to compile.
- The delivered SafeBulk titles exceed the 60-char limit (EN 66, VI 65); they
  are shortened to "SafeBulk: bulk edits you can preview before they apply" /
  "SafeBulk: xem trước kết quả rồi mới chỉnh hàng loạt" and flagged for Dat.

### Schema and draft filtering

- `workFrontmatter` gains `draft: s.boolean().optional()`.
- `src/shared/content/index.ts` drops documents with `draft: true` when
  `process.env.NODE_ENV === "production"`, before the uniqueness/default-locale
  assertions run. The filter is a pure function in `localize.ts`
  (`withoutDrafts(docs, includeDrafts)`) with unit tests.
- Everything downstream (fallback, `availableLocales`, sitemap, hreflang,
  `generateStaticParams`) already works on the filtered list, so a draft VI
  page is a fallback page: canonical `/en`, out of hreflang and sitemap.
- An EN document must never be a draft (`assertDefaultLocale` would fail the
  build in production); a unit test covers this.

### Stale claims

- `scripts/check-stale-claims.mjs` adds the patterns: `55%`, `~55`, `14 kB`,
  `14kB`, `−14`, `-14 kB`, `Formik + Redux Toolkit →`, `replaced Formik`.
  Patterns are anchored so CSS/minified code in `.next` doesn't false-match
  (same approach as the existing `(?<![\d.])` guards).
- The banned-pattern list moves to `scripts/stale-claims.mjs` (exported) so a
  Vitest test can assert that a string containing "55%" (and each new pattern)
  matches, and that current content and messages do not.
- Remove every remaining mention in `src`, `content`, `e2e` and tests.

### Oneloyalty Work block

- Metrics shown in the Home Work chapter for Oneloyalty come from the
  document's `metrics` frontmatter (via `getWork(locale)`), not from message
  keys or component constants. The CLS demo's "CLS ≤ 0.1" value comes from
  `metrics[0].value`; only the surrounding words stay in messages.

### Copy

- Skills, group "State & Data": add `GraphQL` in `en.json` and `vi.json`.
- Any Oneloyalty i18n copy (messages, Work block) says: one shared i18next
  instance, with a translation loader injected by each app.
- Swift's load improvement reads ~20% / −20% everywhere (already true in
  messages; verify after the content swap).

### MDX `Image`

- `MdxContent` maps `Image` to a server component wrapping `next/image`:
  `src`, `alt`, `width`, `height` from MDX, `loading="lazy"`,
  `sizes="(min-width: 768px) 720px, 100vw"`.
- If `public/<src>` does not exist (checked with `fs.existsSync` on the server),
  render `null` and `console.warn` in development. The build never fails.
- `public/work/swift/progress.webp` already exists (57 KB, 1600×1000) and is
  committed with this branch.

### Done when

- `pnpm check:claims` passes; the Vitest claims test proves "55%" fails.
- No `TODO(Dat)` in `content/` (unit test).
- All three EN case studies render, including the SafeBulk tables and the
  Swift image (e2e).
- GraphQL is visible in Skills on `/en` and `/vi` (e2e).

## Task 6.1 — Vietnamese version

- `vi.json` already has every `en.json` key. Voice pass ("mình", short
  sentences) on every string this branch adds or changes. Glossary terms and
  brand names stay identical.
- VI case studies: check each against Phase 6 §6.1.2 — same frontmatter keys;
  identical `slug`, `period`, `stack`, `links`, metric `value`s (except
  SafeBulk `~1.5 th`); glossary terms in English; no added or strengthened
  claims. Fix formatting only; list wording concerns for Dat instead of
  rewriting.
- A unit test enforces the EN/VI frontmatter parity rule for every pair,
  ignoring `draft`, `title`, `summary`, `description`, `role`, `team` and
  metric `label`s, with the one documented `value` exception.
- Dates already go through `getFormatter`; no change.
- SEO: `languageAlternates` already emits `en`, `vi` and `x-default → en`;
  the sitemap already lists only real documents. `e2e/sitemap.spec.ts` and
  `e2e/seo-metadata.spec.ts` derive their VI expectations from the content
  (draft or not) rather than hard-coding them, so they stay correct when Dat
  removes `draft`.

## Task 6.2 — Hide the blog

- `site.features = { blog: false }` in `src/shared/lib/site.ts`.
- `isBlogEnabled()` in `src/shared/content/index.ts` returns
  `site.features.blog && hasPosts()`.
- Consumers:
  - `SiteHeader`: the blog link (desktop and mobile share `links`) shows only
    when enabled.
  - `app/[locale]/blog/page.tsx` and `blog/[slug]/page.tsx`: `notFound()` when
    disabled; `generateStaticParams` returns `[]`.
  - `app/sitemap.ts` passes no posts when disabled; `buildSitemap` already
    emits no `/blog` entry for an empty post list.
- There is no RSS route or `<link>` and no blog post today, so nothing to
  remove there. `BlogPosting` JSON-LD code stays.
- Tests: `e2e/blog.spec.ts` rewritten — `/en/blog` and `/vi/blog` return 404,
  the nav has no blog link; sitemap unit + e2e tests assert no `/blog`.
- README documents: set `site.features.blog = true` and add a post — no
  other change.

## Task 6.6 — 404, footer, README

### 404 page

- `app/[locale]/not-found.tsx` renders `HeroGraphStatic state="layered"`
  inside a `.not-found-graph` wrapper that the hero's
  `data-gate`/`data-morph` CSS does not target, so the SVG is simply visible.
- `HeroGraphStatic` gains an optional `driftNodeId` prop that sets
  `data-drift` on that `app`-layer circle; the hero passes nothing.
- `globals.css`: `@keyframes` translate on `[data-drift]`, 6 s, ease-in-out,
  infinite alternate, inside `@media (prefers-reduced-motion: no-preference)`.
  Nothing starts hidden.
- Copy (EN/VI): title "This page wandered off the graph." / "Trang này đã lạc
  khỏi sơ đồ.", link "Back to home" / "Về trang chủ" to `/`. The page
  renders only the title and the link; the old `notFound.description` key is
  removed from both catalogs.
- Server Component only: no three.js, no client JS added.
- Tests (`e2e/not-found.spec.ts`): 404 status, new heading, home link,
  `meta[name=robots]` contains `noindex`, a `[data-drift]` circle exists, no
  `<canvas>` and no request for the hero 3D chunk.

### Footer

- `site.lighthouse` becomes
  `{ performance, accessibility, bestPractices, seo, measuredAt } | null`,
  set to `null` until Dat records a production run (Phase 6 §6.7).
- Pure helper `lighthouseToShow(lighthouse, now)` returns `null` when
  `lighthouse` is `null` or `measuredAt` is more than 90 days before `now`.
  `now` is build time (the footer is static). Unit tests: null, 89 days,
  91 days.
- The footer adds a "Source on GitHub" link to
  `https://github.com/nguyenthanhdat22012001/Portfolio` next to © year
  (message key in both locales).

### README

Sections, in order: screenshot · live URL · what it is · stack ·
architecture (layers, folders) · 3D approach (existing Hero 3D and measured
budgets content) · i18n · content model (MDX schema, `draft`) · feature flags
(blog) · scripts · quality gates · environment variables · credits (fonts;
avatar generated with Meshy under a private license, no attribution
required) · license.

- Screenshot: `docs/readme/home.webp`, captured with Playwright. The GIF is
  Dat's.
- Live URL: "added at launch" — the production domain is not decided in the
  repo.
- Environment variables and quality gates describe this branch's state;
  `phase-6-b` extends them with analytics, CSP and preview LHCI.

### CLAUDE.md

Update in the same change: the `draft` frontmatter field and its production
behaviour, the blog feature flag, and the MDX `Image` component.

## Order of work

Each step is one or more commits on `phase-6-a`, green before the next:

1. Schema `draft` + `withoutDrafts` + tests.
2. Content swap (six adapted files) + content tests + e2e slug/content updates.
3. Stale-claim patterns + claims test; remove all "−55%"/"14 kB" mentions;
   Oneloyalty Work block metrics from frontmatter.
4. Copy: GraphQL in Skills, i18n DI wording, ~20% check.
5. MDX `Image` + missing-file guard; e2e for Swift image and SafeBulk table.
6. VI pass + EN/VI parity test + content-derived SEO/sitemap e2e.
7. Blog flag, route gating, sitemap, header, tests.
8. 404 page + tests.
9. Footer: `lighthouseToShow`, `lighthouse: null`, repo link.
10. README + CLAUDE.md.

## Testing and verification

- Vitest: draft filter, EN-never-draft, EN/VI parity, claims patterns,
  no `TODO(Dat)`, `lighthouseToShow`, `isBlogEnabled`, sitemap.
- Playwright: case studies (tables, image), Skills GraphQL in both locales,
  blog 404s and nav, 404 page, VI fallback/hreflang, sitemap.
- Existing `hero-3d`, `about-avatar` and `motion` specs run unchanged as
  budget regression guards; this branch adds only server-rendered code.
- Final: `pnpm lint && pnpm typecheck && pnpm test && pnpm build &&
  pnpm check:claims`, the Playwright suite, and a `pnpm dev` (Turbopack) check
  that the VI drafts render in dev and the 404 drift runs.

## Error handling

- Missing MDX image file → renders nothing, dev warning.
- Draft VI document in production → EN fallback page.
- Malformed frontmatter or EN/VI parity mismatch → `velite --strict` or unit
  test fails before deploy.

## Dat's follow-ups (outside this branch)

- Review VI wording and the new `description`s; remove `draft` per file.
- Production Lighthouse run → fill `site.lighthouse` with `measuredAt`.
- README GIF; live URL once the domain is set.
