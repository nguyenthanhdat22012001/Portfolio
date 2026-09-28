# Phase 2 — Static Content — Design

Sep 27, 2026 · Design spec for Phase 2 of the project plan

## Context

Phase 1 delivered a runnable scaffold: Next.js 15 App Router, next-intl (`en` default, `vi`),
Velite with `work`/`blog` collections, the `app → features → shared` boundaries lint, a scroll
store, CI, and a placeholder `HeroSection`. Three English case studies exist in
`content/work/*.mdx`; there are no blog posts and no Vietnamese MDX. `work/[slug]` and
`blog/[slug]` are empty stubs, and `globals.css` still holds default tokens.

Phase 2 of `docs/Portfolio Nguyen Thanh Dat — Project Plan.md` is "Static Content": all
sections + case study pages, responsive, dark/light mode, no JS animations. Completion
criterion: a fully functional site without animation JS.

## Decisions from clarifying questions

- **Contact:** links only (email, LinkedIn, GitHub, CV). No form, no Resend, no Server Action.
- **Vietnamese case studies:** `/vi/work/[slug]` renders the English MDX with a translated
  notice; a future `locale: vi` MDX file overrides it automatically.
- **Blog:** build `/[locale]/blog` (list + empty state) and `blog/[slug]` now; the header shows
  a "Blog" link only when at least one post exists for the locale.
- **Theme:** first visit follows `prefers-color-scheme`, dark when no preference; the toggle
  persists to `localStorage`; an inline pre-paint script prevents a flash.
- **Work section:** one "chapter" per project with a shared layout and a per-project static
  visual that Phase 4 will animate.
- **Approach:** hand-rolled theming (no `next-themes`) and custom MDX component mapping (no
  `@tailwindcss/typography`) — zero added runtime dependencies, full control of tokens.

## Goals

- Render the full home page (Hero → About → Work → Skills → Contact) plus header and footer,
  responsive and statically prerendered for both locales.
- Render case study pages from Velite with `vi → en` fallback.
- Ship the blog routes with an empty state.
- Implement the plan's design tokens and fonts with dark/light theming.
- Keep everything a Server Component except the theme toggle.

## Non-goals

- GSAP animations, Lenis, custom cursor (Phase 4); 3D (Phase 5).
- JSON-LD, OG images, sitemap, robots, hreflang (Phase 3). Only basic `generateMetadata` via
  the existing `buildMetadata`.
- Contact form, Vietnamese MDX content, blog posts, headshot image (Phase 6 / later).

## Structure

```
src/
  app/[locale]/
    layout.tsx             # fonts, theme script, skip link, <SiteHeader/>, <SiteFooter/>
    page.tsx               # Hero → About → Work → Skills → Contact
    work/[slug]/page.tsx
    blog/page.tsx          # new: list + empty state
    blog/[slug]/page.tsx
  features/
    hero/HeroSection.tsx
    about/AboutSection.tsx
    work/WorkSection.tsx
    work/WorkChapter.tsx
    work/chapters/SwiftChapter.tsx
    work/chapters/OneloyaltyChapter.tsx
    work/chapters/SafeBulkChapter.tsx
    skills/SkillsSection.tsx
    contact/ContactSection.tsx
    layout/SiteHeader.tsx
    layout/SiteFooter.tsx
    layout/LocaleSwitcher.tsx
  shared/
    ui/Container.tsx, Section.tsx, SectionTitle.tsx, Tag.tsx, ButtonLink.tsx
    theme/tokens.ts         # token values (source for the contrast test; CSS mirrors them)
    theme/theme-script.ts   # resolveTheme() + inline script string
    theme/ThemeToggle.tsx   # "use client"
    mdx/MdxContent.tsx
    content/                # getWork, getWorkBySlug, getPosts, getPostBySlug
    lib/site.ts             # email, LinkedIn, GitHub, CV URLs
```

Rules:

- Features import only `shared`; pages compose features. Features do not import each other (the lint config permits it; this is a convention for Phase 2)
  (the `layout` feature is composed by `app/[locale]/layout.tsx`).
- `ThemeToggle` and `LocaleSwitcher` are the only client components. `LocaleSwitcher` needs
  `usePathname()` to keep the current path (a Server Component cannot read it without making
  pages dynamic); it still server-renders plain links, so it works without JS. Client
  components receive translated labels as props; no message catalogs ship to the client. The
  mobile nav uses a native `<details>` element.
- `shared/content` is the only module that imports `.velite` data.
- `CLAUDE.md` is amended in the same change: `"use client"` is also allowed for minimal
  interactive controls (currently the theme toggle and locale switcher).

## Theming, tokens, fonts

- `globals.css` defines light values on `:root` and dark values on `[data-theme="dark"]`, with
  the token table from the plan: `--bg`, `--bg-elevated`, `--fg`, `--fg-muted`, `--accent`,
  `--accent-fg`, `--earth`, `--border`, `--radius`, `--space-section`. A
  `@media (prefers-color-scheme: dark)` block on `:root:not([data-theme])` covers the no-JS case.
- Tokens are mapped to Tailwind v4 via `@theme inline` (`bg-bg`, `bg-bg-elevated`, `text-fg`,
  `text-fg-muted`, `text-accent`, `bg-accent`, `text-accent-fg`, `border-border`). `--earth` is
  not mapped to Tailwind at all (it is for Phase 5 3D only), so no `text-earth` utility exists.
  No raw hex in components.
- `theme-script.ts` exports `resolveTheme(stored: string | null, prefersDark: boolean | null):
"dark" | "light"` — valid stored value wins, then OS preference, else `"dark"` — and the
  inline script string that applies it to `document.documentElement.dataset.theme`. The layout
  renders it in `<head>`; `<html>` gets `suppressHydrationWarning`.
- `ThemeToggle`: a `<button>` with `aria-pressed` and a translated `aria-label`; flips
  `data-theme` and writes `localStorage` inside `try/catch`.
- Fonts: `Google_Sans_Code` (weights 300–800) and `Open_Sans` via `next/font/google`, subsets
  `latin` + `vietnamese`, `display: "swap"`, exposed as `--font-mono` and `--font-sans`.
  Headings use mono with `letter-spacing: -0.02em` at large sizes; body uses sans.
- Visible focus rings use `--accent`. Mobile-first; single column below `md`.

## Home sections

Each section is an async Server Component using `getTranslations(namespace)` and rendered in
`<Section id aria-labelledby>`, so header anchors work without JS.

- **Hero** (`#top`): the page's only `h1` (name), title, tagline, CTAs "See my work" (`#work`)
  and "Download CV" (`/cv.pdf`, `download`). A reserved `aria-hidden` slot with a fixed aspect
  ratio holds the future Phase 5 canvas (CLS 0).
- **About** (`#about`): 2–3 short paragraphs and a stats row (years of experience, apps shipped,
  i18n languages); numbers live in messages. No headshot; the layout leaves room for one.
- **Work** (`#work`): `WorkSection` calls `getWork(locale)` and renders chapters in the fixed
  order Swift, Oneloyalty, SafeBulk via a slug → chapter component map. `WorkChapter` renders
  title and summary (front matter), tags, headline metric (messages: `work.<key>.metric`),
  "Read case study" link, and a `visual` slot. Static visuals:
  - Swift: two bars "12–13s" vs "1–3s" (plain `div`s with widths).
  - Oneloyalty: "Hello" in 8 languages as a list.
  - SafeBulk: 3 stacked step cards (Filter → Configure → Preview) plus GitHub and Loom links.
- **Skills** (`#skills`): translated category headings with tag lists from the CV's Technical
  Skills. Technology names are stored in both message files.
- **Contact** (`#contact`): heading, short line, links for email (`mailto:`), LinkedIn, GitHub,
  CV. URLs in `shared/lib/site.ts`; labels in messages.
- **Header:** skip link ("Skip to content" → `#main`), name linking home, section anchors,
  "Blog" link when posts exist, `LocaleSwitcher`, `ThemeToggle`. **Footer:** social links and
  copyright.

## Content layer and pages

- Velite schema change: `slug` becomes `s.string().regex(/^[a-z0-9-]+$/)` (`s.slug()` enforces
  collection-wide uniqueness, which breaks same-slug `en`/`vi` pairs). Uniqueness is enforced on
  the `(slug, locale)` pair by the content layer (tested).
- Every document must have an `en` version; a `vi`-only document fails the build. Fallback
  only runs towards `en`, and the locale switcher links each page to its `en` twin.
- `shared/content` exposes pure functions that take the Velite arrays as a parameter (with
  thin wrappers binding the real data):
  - `getWork(locale)` → one entry per slug, the `locale` version if present else `en`, each
    tagged `isFallback`.
  - `getWorkBySlug(slug, locale)` → `{ doc, isFallback } | null`.
  - `getPosts(locale)` / `getPostBySlug(slug, locale)` → same pattern, posts sorted by
    `datePublished` descending.
- **`work/[slug]`**: `generateStaticParams` returns every slug × locale; `dynamicParams =
false`. Page: back link to `/#work`, `h1` title, summary, meta (date, tags), translated
  fallback notice when `isFallback` (article gets `lang="en"`), then `<MdxContent>`.
  `generateMetadata` uses `buildMetadata` with title and summary.
- **`blog`**: list of posts (title, date, summary) or translated empty state. **`blog/[slug]`**
  mirrors the case study page.
- **`MdxContent`**: renders Velite's compiled MDX code (`new Function` + `react/jsx-runtime`)
  as a Server Component, with a component map: internal `a` → next-intl `Link`, external `a` →
  `target="_blank" rel="noopener noreferrer"`; `h2`/`h3` with ids; `code`/`pre` in mono on
  `bg-elevated`; `table` wrapped in a horizontally scrollable container; lists and paragraphs
  styled with tokens.

## i18n

All copy goes through `en.json` and `vi.json` with identical key trees. New namespaces: `nav`,
`theme`, `hero` (extended), `about`, `work`, `skills`, `contact`, `footer`, `caseStudy`,
`blog`. Vietnamese UI strings are written now; Vietnamese long-form content is Phase 6.

## Testing

Vitest:

- `resolveTheme`: stored value, OS preference, dark default, invalid stored value.
- Contrast: `fg`, `fg-muted`, `accent` against `bg` and `bg-elevated`, both themes, ≥ 4.5:1;
  `accent-fg` on `accent` ≥ 4.5:1.
- `shared/content`: locale selection, fallback and `isFallback`, null for unknown slug,
  `(slug, locale)` duplicate detection, post sorting.
- i18n parity: `en.json` and `vi.json` have identical key trees.

Playwright (`/en` and `/vi`):

- Home: exactly one `h1`; `#about`, `#work`, `#skills`, `#contact` present with headings.
- Each work chapter links to its case study, which renders its `h1`.
- `/vi/work/swift-performance` shows the fallback notice; `/en/work/swift-performance` doesn't.
- Theme toggle changes `html[data-theme]` and persists across reload; with emulated
  `colorScheme: "light"` and empty storage, first load is light.
- Locale switcher on a case study navigates to the same slug in the other locale.
- `/en/blog` shows the empty state; no "Blog" link in the header.
- Skip link is the first focusable element and moves focus to `#main`.
- CV link targets `/cv.pdf`; unknown slugs 404; existing tests keep passing (the `h1` test
  still matches the name).

## Definition of done

- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass; `pnpm test:e2e` passes.
- Home, case study, and blog routes are statically prerendered for both locales.
- The site is fully usable with JS disabled, except the theme toggle.
- First-load JS for `/[locale]` from `next build` output is reported against the 150 KB budget.
- `CLAUDE.md` updated for the client-component rule change.
