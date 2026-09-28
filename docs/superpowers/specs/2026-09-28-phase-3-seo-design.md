# Phase 3 — SEO — Design

Sep 28, 2026 · Design spec for Phase 3 of the project plan

## Context

Phase 2 and the home redesign delivered the full static site: home sections, case study pages
rendered from Velite with `vi → en` fallback, blog routes with an empty state, theming, and
CI (`lint`, `typecheck`, `test`, `build`). SEO is minimal: `shared/seo/build-metadata.ts`
sets title, description, a canonical URL, and basic OpenGraph/Twitter tags. There is no
`metadataBase`, no hreflang, no OG image, no JSON-LD, no sitemap, and no robots file. The
Lighthouse CI step in `.github/workflows/ci.yml` is a commented-out placeholder.

Phase 3 of `docs/Portfolio Nguyen Thanh Dat — Project Plan.md` is "SEO": metadata, OG images,
JSON-LD, sitemap, robots.txt, hreflang, and Search Console setup. Completion criterion: the
Rich Results Test passes and the Lighthouse SEO score is 100.

## Decisions from clarifying questions

- **Site URL:** the origin comes from `NEXT_PUBLIC_SITE_URL`, set to a `*.vercel.app` URL
  until a domain is bought. A Vercel production build without it fails.
- **Vietnamese fallback pages** (`/vi/work/<slug>` rendering English MDX): canonical URL
  points to the `/en` twin; excluded from hreflang and the sitemap. A real `locale: vi` MDX
  file automatically makes the page a first-class alternate.
- **Lighthouse CI:** runs in GitHub Actions against the local production build (`next start`),
  mobile preset, gating every PR.
- **OG images:** one shared template generated with `next/og` at build time for the home page
  (per locale), each case study, and each blog post. The blog index reuses the home image.
- **Approach:** pure, unit-tested builders in `shared/seo/` plus Next's metadata file
  conventions. No new runtime dependencies; no `schema-dts`, no `next-sitemap`.
- **Meta description field:** content gets a dedicated `description` (140–160 chars) used
  only for meta/OG; the visible `summary` stays unchanged.

## Goals

- Every indexable page has a correct title, description, canonical URL, hreflang alternates,
  OpenGraph/Twitter tags, and an OG image.
- JSON-LD on the home page, case studies, and blog pages that passes the Rich Results Test.
- `/sitemap.xml` and `/robots.txt` generated from the content layer.
- Lighthouse CI enforcing the plan's KPIs and the 150 KB initial JS budget on every PR.
- Length rules for titles and descriptions enforced by the build and tests, not by review.

## Non-goals

- Buying a domain, blog posts, Vietnamese MDX, headshot (Phase 0 / Phase 6).
- Analytics and conversion tracking (Phase 6).
- Off-page SEO (dev.to / Viblo republishing, LinkedIn links).
- Automatically feeding Lighthouse scores into the footer.

## Structure

```
lighthouserc.json                       # new
src/
  app/
    sitemap.ts                          # new
    robots.ts                           # new
    [locale]/
      layout.tsx                        # + generateMetadata (metadataBase, verification)
      opengraph-image.tsx               # new: home OG image
      page.tsx                          # + JSON-LD
      work/[slug]/opengraph-image.tsx   # new
      work/[slug]/page.tsx              # + availableLocales, JSON-LD
      blog/page.tsx                     # + noindex when empty, JSON-LD
      blog/[slug]/opengraph-image.tsx   # new
      blog/[slug]/page.tsx              # + availableLocales, JSON-LD
  shared/
    content/index.ts                    # + getWorkLocales, getPostLocales, hasPosts
    content/localize.ts                 # + availableLocales(docs, slug)
    lib/site.ts                         # + person data (alternateName, knowsAbout)
    seo/
      site-url.ts                       # new: getSiteUrl()
      urls.ts                           # new: localizedPath, absoluteUrl, canonical/hreflang helpers
      sitemap.ts, robots.ts             # new: pure buildSitemap / buildRobots
      build-metadata.ts                 # extended
      JsonLd.tsx                        # new: <JsonLd data />
      json-ld/                          # new: person, website, profile-page,
                                        #      creative-work, blog-posting, breadcrumbs
      og/
        og-image.ts                     # new: ogImageSize, ogImagePath
        OgCard.tsx                      # new: Satori-safe JSX template
        render-og-image.tsx             # new: renderOgImage({ eyebrow, title, name })
        fonts/OpenSans-Bold.ttf         # new (+ OFL.txt)
velite.config.ts                        # + description, title max, dateModified
next.config.ts                          # + outputFileTracingIncludes (OG font)
content/work/*.mdx                      # + description
```

All new code lives in `shared/` or `app/`, respecting the `app → features → shared`
boundaries. No new `"use client"` files.

## 1. Site URL, metadata, and hreflang

### `getSiteUrl()` — `shared/seo/site-url.ts`

Returns an origin without a trailing slash, resolved in order:

1. `NEXT_PUBLIC_SITE_URL` if set (trailing slash stripped).
2. Else, if `VERCEL_ENV === "production"`, **throw** — a live deploy must never emit
   `localhost` canonicals.
3. Else, if `VERCEL_URL` is set, `https://${VERCEL_URL}` (Vercel preview deployments).
4. Else `http://localhost:3000` (local dev, CI, Lighthouse CI).

The existing module-level `siteUrl` constant in `build-metadata.ts` is replaced by this.

### Root metadata — `[locale]/layout.tsx`

A new `generateMetadata` sets:

- `metadataBase: new URL(getSiteUrl())`
- `verification: { google: process.env.GOOGLE_SITE_VERIFICATION }` only when the variable
  is set.

### `buildMetadata()` — `shared/seo/build-metadata.ts`

Input:

```ts
interface BuildMetadataInput {
  title: string;
  description: string;
  path: string; // "/" | "/blog" | "/work/<slug>" | "/blog/<slug>"
  locale: Locale; // the URL's locale
  availableLocales: Locale[]; // locales with real (non-fallback) content for this path
  type: "website" | "article";
  imagePath?: string; // defaults to this page's own OG image route
  noindex?: boolean;
}
```

Behaviour:

- **Real page** (`locale ∈ availableLocales`): canonical is the page's own URL;
  `alternates.languages` has one entry per available locale plus `x-default` pointing to the
  default-locale (`en`) URL.
- **Fallback page** (`locale ∉ availableLocales`): canonical is the `en` URL; no
  `alternates.languages`.
- **OpenGraph:** `title`, `description`, `url` (the canonical URL), `siteName` (the person's
  name), `type`, `locale` (`en_US` / `vi_VN`), `alternateLocale` (other available locales,
  same mapping), and `images`: one absolute 1200×630 image, `alt` = `title`, at
  `imagePath ?? ogImagePath(locale, path)` (`/${locale}${path}/opengraph-image`).
- **Twitter:** `card: "summary_large_image"`, `title`, `description`, same `images`.
- Images are always set explicitly rather than relying on Next's file-based merge: Next only
  injects a file-based image when the page's `openGraph` has no `images` key, and its `alt`
  export cannot be localized. The explicit URL omits Next's cache-busting query, which is
  harmless.
- **`noindex`:** sets `robots: { index: false, follow: true }`.

URLs are built as `/${locale}${path}` with `path === "/"` producing `/${locale}` (no trailing
slash), matching the existing routes.

`availableLocales` per route:

| Route            | `availableLocales`                             |
| ---------------- | ---------------------------------------------- |
| Home, blog index | `routing.locales` (both are real translations) |
| Case study       | `getWorkLocales(slug)`                         |
| Blog post        | `getPostLocales(slug)`                         |

`getWorkLocales` / `getPostLocales` in `shared/content/index.ts` wrap a new pure helper
`availableLocales(docs, slug)` in `localize.ts` that returns the locales with an exact
(non-fallback) document, in `routing.locales` order.

### Not-found pages

No code change: Next emits `<meta name="robots" content="noindex">` on 404 responses
(`not-found.tsx`, reached via the `[...rest]` catch-all and unknown slugs). Playwright asserts it.

## 2. Structured data (JSON-LD)

### Component

`<JsonLd data={object | object[]} />` in `shared/seo/JsonLd.tsx` — a Server Component
rendering `<script type="application/ld+json">` with `JSON.stringify(data)` where every `<`
is replaced with the escape sequence `\u003c`, so content can never close the script tag.

### Builders — `shared/seo/json-ld/`

Pure functions returning hand-written TypeScript types (each including `@context` only at the
top level of what `<JsonLd>` renders). The person has one stable identifier,
`${siteUrl}/#person`; every other schema's `author` is `{ "@type": "Person", "@id", name,
url }` — the shared `@id` plus the minimum Google needs, because it does not resolve an `@id`
defined on another page.

| Page       | Schemas                                                 | Fields                                                                                                                                                                                                                                                                                                  |
| ---------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home       | `ProfilePage` with `mainEntity: Person`, plus `WebSite` | Person: `@id`, `name` "Nguyen Thanh Dat", `alternateName` "Nguyễn Thành Đạt", `jobTitle` (i18n), `url` (site origin), `sameAs` [LinkedIn, GitHub], `knowsAbout`. WebSite: `@id` `${siteUrl}/#website`, `name`, `url`, `inLanguage` ["en", "vi"]. ProfilePage: `url` (canonical), `inLanguage` (locale). |
| Case study | `CreativeWork` + `BreadcrumbList`                       | `name`, `description`, `author` → `#person`, `dateCreated`, `about` (tags), `url` (canonical), `inLanguage` (the content's language — `en` on a fallback page), `image` (the page's OG image URL)                                                                                                       |
| Blog index | `BreadcrumbList`                                        | Home → Blog                                                                                                                                                                                                                                                                                             |
| Blog post  | `BlogPosting` + `BreadcrumbList`                        | `headline`, `description`, `datePublished`, `dateModified`, `author` → `#person`, `image`, `mainEntityOfPage` (canonical), `inLanguage`                                                                                                                                                                 |

- `ProfilePage` is used because Google recognises it in the Rich Results Test while a bare
  `Person` is not reported; it still satisfies the plan's "Person + WebSite".
- Person has no `image` until the headshot exists. No placeholder.
- Case study breadcrumbs are **Home → title** (two items); the Work section is an anchor on
  the home page, not a page of its own.
- Breadcrumb item URLs are absolute and use the page's locale.
- Data vs copy: `alternateName` and `knowsAbout` (technology names) live in
  `shared/lib/site.ts`. `jobTitle` and breadcrumb names come from a new `seo` message
  namespace (`seo.jobTitle`, `seo.breadcrumbHome`, `seo.breadcrumbBlog`) in both `en.json`
  and `vi.json`.

## 3. OG images, sitemap, robots, and content fields

### OG images

- `shared/seo/og/OgCard.tsx` — JSX template using only Satori-supported inline flex styles:
  1200×630, dark-theme `bg` background, a gold (`accent`) eyebrow label, the title in large
  Open Sans Bold, and a footer with the localized name and the site host (from
  `getSiteUrl()`). Colors are imported from the dark palette in `shared/theme/tokens.ts`.
- `shared/seo/og/render-og-image.tsx` — `renderOgImage({ eyebrow, title, name })` returns an
  `ImageResponse`, loading `fonts/OpenSans-Bold.ttf` with `fs.readFile` at build time. The
  TTF covers Latin + Vietnamese; its OFL license ships alongside it. Satori cannot read the
  `next/font` woff2 files, hence the separate TTF. Font bytes never reach the client bundle.
- Route files, each exporting `size`, `contentType = "image/png"`, and reusing the page's
  `generateStaticParams` so images are prerendered:
  - `app/[locale]/opengraph-image.tsx` — eyebrow `og.portfolio`, title = home meta title.
  - `app/[locale]/work/[slug]/opengraph-image.tsx` — eyebrow `og.caseStudy`, title = doc
    title (fallback pages render the English title with the Vietnamese eyebrow).
  - `app/[locale]/blog/[slug]/opengraph-image.tsx` — eyebrow `og.blog`, title = post title.
- Alt text is the localized page title (set by `buildMetadata`).
- The blog index passes `imagePath: ogImagePath(locale, "/")` to reuse the home image.
  Playwright verifies every indexable page has an `og:image` that returns a PNG.
- Each image route exports its own `generateStaticParams` and answers unknown params with
  a 404 response.
- New message namespace `og` (`name`, `portfolio`, `caseStudy`, `blog`) in both locales;
  `og.name` is the footer name ("Nguyễn Thành Đạt" in Vietnamese).
- `next.config.ts` adds `outputFileTracingIncludes` for the font so on-demand image routes
  (future blog posts) can read it on Vercel.

### Sitemap — `app/sitemap.ts`

- Home per locale; blog index per locale **only when at least one post exists**; one entry
  per real locale version of every case study and post. Fallback versions are excluded.
- Every entry carries `alternates.languages` for its real locales (same rule as hreflang).
- `lastModified`: posts use `dateModified ?? datePublished`, case studies use `dateCreated`;
  home and blog index omit it (a build timestamp would falsely claim a change on every deploy).
- The entry-building logic is a pure function in `shared/seo/` so it is unit-testable;
  `app/sitemap.ts` only feeds it content.

### Robots — `app/robots.ts`

- Default: `allow: "/"` for all user agents, `sitemap: ${siteUrl}/sitemap.xml`.
- When `VERCEL_ENV === "preview"`: `disallow: "/"` so preview URLs are never indexed.
- Local and CI stay allowed; Lighthouse's SEO audit fails pages blocked by robots.

### Empty blog index

While there are zero posts, `/[locale]/blog` sets `noindex` and is excluded from the sitemap,
consistent with the header already hiding the Blog link. Both switch on automatically when
the first post lands.

### Content fields and length rules — `velite.config.ts`

- `work` and `blog`: add `description: s.string().min(140).max(160)` and constrain
  `title: s.string().max(60)`.
- `blog`: add optional `dateModified: s.isodate().optional()`.
- The three `content/work/*.mdx` files gain a `description` drafted from their existing
  summaries — no new facts. The drafts are reviewed by the user in the implementation plan.
- Meta/OG use `description`; pages keep rendering `summary`.
- A Vitest test asserts, for both `en.json` and `vi.json`: `meta.title` ≤ 60 chars,
  `meta.description` and `blog.description` 140–160 chars. The current home description
  (~85 chars) is rewritten to fit, in both locales, without new claims.

## 4. Lighthouse CI, Search Console, and conventions

### Lighthouse CI

- `@lhci/cli` added as a pinned dev dependency; script `"lhci": "lhci autorun"`;
  config in `lighthouserc.json`.
- **Collect:** `startServerCommand: "pnpm start"`, default (mobile) preset, `numberOfRuns: 3`
  (median), URLs: `/en`, `/vi`, `/en/work/swift-performance`.
  - The blog index is omitted while it is `noindex` (the "is crawlable" audit would fail).
    When the first post ships, add the blog index and one post URL to the list.
  - Fallback `/vi/work/*` pages are omitted because their cross-locale canonical is flagged
    by Lighthouse's canonical audit.
- **Assert (all `error`):** `categories:performance ≥ 0.9`, `categories:seo = 1`,
  `categories:accessibility ≥ 0.95`, `categories:best-practices = 1`,
  `resource-summary:script:size ≤ 153600` bytes (transfer size; `next start` gzips, so this
  is the plan's 150 KB gzip budget).
- **Upload:** `target: "filesystem"` to `.lighthouseci/`, uploaded with
  `actions/upload-artifact` (on failure too). No temporary public storage.
- **CI:** the placeholder in `ci.yml` becomes a `pnpm lhci` step after `pnpm build` in the
  existing job. `.lighthouseci/` is added to `.gitignore`.
- The footer scores in `site.ts` stay hand-entered; the comment is updated to "update from
  the latest LHCI report artifact".

### Search Console (manual, done by the user)

1. Set `NEXT_PUBLIC_SITE_URL` for the Vercel Production environment.
2. Add a URL-prefix property in Search Console, choose the HTML-tag method, and set its
   token as `GOOGLE_SITE_VERIFICATION` on Vercel.
3. Redeploy and click Verify.
4. Submit `/sitemap.xml`.
5. Run the Rich Results Test on `/en` and one case study.

When a domain is bought: update `NEXT_PUBLIC_SITE_URL`, add a new property, and resubmit.

### CLAUDE.md

- New "SEO" section: every route's `generateMetadata` goes through `buildMetadata` with
  `availableLocales`; every indexable page renders its JSON-LD via `<JsonLd>`; content needs
  a 140–160 char `description`; new site-wide copy for meta goes through the length test.
- The performance-budget heading changes from "informational" to "enforced by Lighthouse CI".

## Testing

Vitest (unit):

- `getSiteUrl`: all four resolution branches, trailing-slash stripping.
- `buildMetadata`: real page with two locales (canonical, languages, `x-default`,
  `alternateLocale`), fallback page (canonical to `en`, no languages), home path without a
  trailing slash, `noindex`, default and overridden `imagePath`.
- `availableLocales`: exact matches only, `routing.locales` order.
- JSON-LD builders: required fields, `#person` references, fallback `inLanguage`, breadcrumb
  positions and absolute URLs.
- `JsonLd`: `<` escaping.
- Sitemap builder: real versions only, alternates, `lastModified` rules, blog index omitted
  when there are no posts.
- Robots: preview vs default.
- Message length test for both locales.

Playwright (e2e, against the production build):

- Each page type (`/en`, `/vi`, a case study, `/vi` fallback case study) has the expected
  canonical and hreflang links.
- Each page type has parseable JSON-LD with the expected `@type`s.
- Every indexable page's `og:image` URL returns `image/png`.
- `/sitemap.xml` and `/robots.txt` respond with the expected entries.
- Unknown paths render `noindex`.

## Definition of done

- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass.
- `pnpm test:e2e` passes.
- `pnpm lhci` passes locally and in CI.
- `/sitemap.xml`, `/robots.txt`, JSON-LD, and OG images are present in the build output.
- The Search Console checklist is handed to the user; the Rich Results Test is confirmed
  after those manual steps.

## Budget notes

- No runtime dependencies added; `next/og` ships with Next. OG generation and the TTF run
  only at build time.
- JSON-LD adds a few hundred bytes of inline HTML per page; no client JS.
