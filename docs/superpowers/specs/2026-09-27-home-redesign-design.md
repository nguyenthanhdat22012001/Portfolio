# Home Page Redesign — Design

Sep 27, 2026 · Design spec for recoding the root page (`/[locale]`) to match
`docs/Portfolio Wireframes.html` (boards "Home — Desktop 1440" and "Home — Mobile 390")

## Context

Phase 2 shipped a static home page (Hero, About, Work, Skills, Contact) plus header and footer,
all as Server Components on the `app → features → shared` layering. The wireframe restyles
every section, rewrites most copy, and adds content the current data model does not hold
(per-project company, period, two stats; an About timeline; a copy-email action).

## Decisions

- **Scope: static only.** Build the wireframe's layout, copy, and data in Server Components.
  Parts that later phases animate (hero 3D canvas + avatar, greeting cycle, load bar, step
  cards) become static stand-ins in fixed-size slots so Phases 4/5 plug in without layout shift.
- **Work data split by kind.** Locale-invariant data (affiliation, period, tags, links) lives
  in `features/work/chapter-order.ts`; translatable teaser copy (title, summary, stats) lives
  in messages. MDX remains the source for case study pages only.
- **Swift numbers:** "12–13s → 1–3s" everywhere (matches the case study MDX).
- **Missing images:** portrait and mobile avatar are `aria-hidden` placeholder slots with a
  fixed aspect ratio; swapping in `next/image` later is a one-line change.
- **Copy email:** progressive enhancement — a `mailto:` link plus a small client
  `CopyEmailButton`.
- **Footer:** matches the wireframe — "Built with Next.js, GSAP, Three.js" and hardcoded
  Lighthouse scores measured once during implementation.
- **Copy:** adopt the wireframe copy with fixes: "Middle Engineer" → "mid-level engineer",
  the About placeholder replaced by the current spec-first/AI paragraph, the Contact
  description kept as one line, trimmed Skills lists.
- **Approach:** restyle each section in place; extract repeated wireframe patterns into
  `shared/ui` primitives.
- **Branch:** work directly on the current branch (`phase-2`).

## 1. Shared primitives and tokens

**Container.** Add `size="wide"` (`max-w-[80rem]`, gutter `px-4 sm:px-6 lg:px-10` → 1200px content at 1440px). Home
sections, header, and footer use it; case study and blog keep `default`/`narrow`.

**Tokens** (`globals.css` and `tokens.ts` together):

| Token                                     | Dark      | Light     | Use                                                     |
| ----------------------------------------- | --------- | --------- | ------------------------------------------------------- |
| `--bg-muted` (new)                        | `#3A3A40` | `#E6E3DA` | Inactive bars/blocks in visuals — fill only, never text |
| `--earth` (now mapped as `--color-earth`) | `#8B5E3C` | `#6E4A2F` | Decorative fills only, never text                       |

The `globals.css` comment on `--earth` changes from "reserved for 3D" to "decorative fills
only, never text". All other wireframe colors already equal existing tokens.

**Radii:** cards `rounded-card` (12px), buttons `rounded-md` (6px), chips `rounded-xs` (2px).

**Primitives in `shared/ui`:**

- `Eyebrow({ tone: "muted" | "accent", children })` — mono, 12px, `tracking-[0.08em]`,
  uppercase via CSS; messages stay sentence case.
- `SectionHeading({ id, index, label, size: "lg" | "xl", children })` — renders the accent
  eyebrow `01 / About` above an `h2` (`lg`: 40px desktop / 30px mobile; `xl`: 64px / 40px).
  Replaces `SectionTitle`, which is deleted.
- `Stat({ value, label, size: "lg" | "md" })` — a `div` containing `dt` (label) and `dd`
  (value), shown value-first via `flex-col-reverse`; `lg` 48px, `md` 28px accent mono values.
  Parents provide the `<dl>`.
- `TagList` — add `variant: "outline" | "filled"`; default becomes the squared outline
  (restyles case study tags to match).
- `PlaceholderSlot({ className })` — dashed `border-border` box, `aria-hidden`, no text;
  size/aspect set by the caller. Accepts extra `data-*` attributes.
- `ButtonLink` — add `size: "md" | "lg"` (48px / 56px height); radius → `rounded-md`.
- `Section` — border moves from bottom to top; uses `Container size="wide"`.

## 2. Header and hero

**Header** (`features/layout/SiteHeader.tsx`):

- Brand `nav.brand` = `dat.nguyen` (both locales), mono bold 18px; `aria-label` stays
  `nav.homeLabel`.
- Height 80px desktop (`md:h-20`), 64px mobile; sticky as today; `section[id]`
  `scroll-margin-top` → `6rem`.
- Nav links mono 14px, `gap-10`. The Blog link still appears only when posts exist.
- `LocaleSwitcher` restyled as one 36px bordered pill reading `EN / VI`: current locale in
  accent, `/` separator `aria-hidden`. Still two real links (works without JS).
- `ThemeToggle` resized to 36px, `rounded-md`.
- Mobile menu remains `<details>`; the summary shows a hamburger icon with `nav.menu` as an
  `sr-only` label.

**Hero** (`features/hero/HeroSection.tsx`):

- Left: muted `Eyebrow` (`hero.role`), `h1` from `hero.titleLines` rendered as `block` spans
  separated by a space (text content stays "Nguyen Thanh Dat"), 72px desktop / 48px mobile;
  `hero.tagline` 20px muted, `max-w-[32.5rem]`; CTAs "View work" (`#work`, primary `md`) and
  "Download CV" (`site.cv`, `download`, secondary `md`).
- Right: one `PlaceholderSlot` with `data-hero-canvas-slot`, `md:aspect-[7/8]`. On mobile the
  same element is `order-first`, `aspect-[4/3]` (future static avatar).
- The wireframe's "Hi, I'm Dat" bubble and node dots are omitted until Phase 5 (the bubble
  returns as a DOM overlay per CLAUDE.md).
- `SCROLL ↓` hint (`hero.scrollHint` + an `aria-hidden` arrow), desktop only, bottom-left, `aria-hidden`.

## 3. About and Work

**About** (`features/about/AboutSection.tsx`):

- `SectionHeading` index 1. Desktop 12-column grid: portrait `PlaceholderSlot` spans 4
  (`aspect-[3/4]`), text spans 8. Mobile stacks with portrait `aspect-[4/3]`.
- `about.lead` (18px, `text-fg`) and `about.body` (16px, muted) replace `about.paragraphs`.
- Stats: `<dl>` of three `lg` `Stat`s, three columns at every width, `border-y`.
- Timeline: `<ol>` from `about.timeline` (`{ year, text }[]`), three columns.

**Work — data** (`features/work/chapter-order.ts`, still React-free):

```ts
export const chapterOrder = [
  { slug: "swift-performance", key: "swift", affiliation: "FireGroup",
    period: "2022–2024", tags: ["React 18", "TypeScript", "App Bridge", "Code splitting"] },
  { slug: "oneloyalty-layered-architecture", key: "oneloyalty", affiliation: "FireGroup",
    period: "2024–2026", tags: ["Turborepo", "React Query v5", "GraphQL", "i18next"] },
  { slug: "safebulk-bulk-editor", key: "safebulk", affiliation: null,
    period: "2026", tags: [...], links: ["github", "demo"] }
] as const;
```

SafeBulk tags: `["React", "TypeScript", "Polaris", "CSV"]` (the wireframe shows no tags for
SafeBulk; these keep the three chapters consistent). `affiliation: null` renders
`work.sideProject`. Messages per chapter: `work.<key>.title`, `.summary`, `.stats` (exactly
two `{ value, label }`). `work.<key>.metric` is removed.

**Work — layout** (`WorkChapter.tsx`): 12-column grid, text spans 5 and visual spans 7; the
second chapter puts the visual first on desktop via `md:order-first`. DOM order is always
text then visual; on mobile the visual is `order-first`. Each chapter: eyebrow
`01 · FireGroup · 2022–2024`, `h3` (28px), summary, `<dl>` of two `md` stats, outline tags,
link row "Read case study →" (+ SafeBulk "GitHub ↗" / "Demo ↗" to `site.safebulkRepo` /
`site.safebulkDemo`, moved out of the visual).

**Work — visuals** (static, each a `figure`):

- `SwiftVisual`: caption "Initial load"; full-width `bg-muted` bar with struck-through
  "12–13s before"; 15%-width accent bar with `1–3s` at 48px; footnote
  "① Code splitting ② Session tokens ③ Vendor chunking".
- `OneloyaltyVisual`: two columns — "40+ shared components" over a decorative 4×3 block grid
  (`aria-hidden`, mostly `bg-muted`, one `fg-muted`, one `earth`); "i18n · 8 languages" over
  a dashed box showing the first greeting and `1 / 8`. The full eight-greeting list stays in
  an `sr-only` `<ul>` with `lang` attributes.
- `SafeBulkVisual`: `<ol>` of three step cards; desktop overlaps them (step 3 active with
  accent border); inactive cards are dimmed with muted colors, not `opacity`, to keep AA
  contrast. Mobile shows a plain numbered list.

## 4. Skills, Contact, Footer

**Skills:** `SectionHeading` index 3, title "Toolbox". Six groups from `skills.groups`, grid
`lg:grid-cols-3 sm:grid-cols-2`; each group is a muted mono `h3` over a `filled` `TagList`.
Group labels are kept on mobile. No card borders.

**Contact:** `SectionHeading` index 4, `size="xl"`, title from `contact.titleLines`
(split like the hero). `contact.description` as one muted line. Actions: primary `lg`
`mailto:` button showing the address, visually joined to `CopyEmailButton`; then secondary
`lg` LinkedIn ↗, GitHub ↗, Download CV.

**`CopyEmailButton`** (`features/contact/CopyEmailButton.tsx`, `"use client"`): props
`email`, `label`, `copiedLabel`. Click → `navigator.clipboard.writeText(email)`; on success an
`aria-live="polite"` span shows `copiedLabel` for 2s; on failure nothing changes (the adjacent
`mailto:` link remains the fallback, including without JS). CLAUDE.md's client-component list
gains this file.

**Footer** (`features/layout/SiteFooter.tsx`): left `footer.copyright` + `footer.builtWith`
("Built with Next.js, GSAP, Three.js"); right "Lighthouse" followed by four scores from
`site.lighthouse` (`{ performance, accessibility, bestPractices, seo }`), each with an
`sr-only` category name from `footer.lighthouse.*`. Scores come from one Lighthouse mobile run
against the production build of `/en`. Social links are removed from the footer.

## 5. Copy (English)

| Key                                    | Value                                                                                                                                                                                                                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nav.brand`                            | dat.nguyen                                                                                                                                                                                                                                                                             |
| `hero.role`                            | Front-End Engineer · Ho Chi Minh City                                                                                                                                                                                                                                                  |
| `hero.titleLines`                      | ["Nguyen", "Thanh Dat"]                                                                                                                                                                                                                                                                |
| `hero.tagline`                         | I build fast, well-structured React & TypeScript apps — 4 years shipping Shopify embedded apps for global merchants.                                                                                                                                                                   |
| `hero.ctaWork`                         | View work                                                                                                                                                                                                                                                                              |
| `hero.scrollHint`                      | Scroll                                                                                                                                                                                                                                                                                 |
| `about.label` / `about.title`          | About / From fresher to mid-level engineer                                                                                                                                                                                                                                             |
| `about.lead`                           | Front-End Engineer with ~4 years building Shopify embedded apps. I rebuilt a production client from legacy JavaScript to strict TypeScript, helped restructure a multi-app monorepo into a layered architecture, and designed an 8-language i18n loader.                               |
| `about.body`                           | current third paragraph (spec before code, API contracts, AI tools)                                                                                                                                                                                                                    |
| `about.stats`                          | 4 · years of front-end; 3 · Shopify apps shipped; 8 · languages in one i18n system                                                                                                                                                                                                     |
| `about.timeline`                       | 2022 · Joined FireGroup — Swift; 2024 · Oneloyalty monorepo; 2026 · SafeBulk (side project)                                                                                                                                                                                            |
| `work.label` / `work.title`            | Selected work / Selected work                                                                                                                                                                                                                                                          |
| `work.sideProject`                     | Side project                                                                                                                                                                                                                                                                           |
| `work.swift.title`                     | Swift — SEO & Speed Suite                                                                                                                                                                                                                                                              |
| `work.swift.summary`                   | Rebuilt the client from legacy JS to strict TypeScript and React 18, then cut load time with code splitting, session tokens and vendor chunking.                                                                                                                                       |
| `work.swift.stats`                     | 1–3s · load, from 12–13s; 2 teams · adopted the NPM package                                                                                                                                                                                                                            |
| `work.oneloyalty.title`                | Oneloyalty — Loyalty & Rewards                                                                                                                                                                                                                                                         |
| `work.oneloyalty.summary`              | Helped unify Admin apps, Storefront extensions and shared packages in one Turborepo, moved my features to a layered architecture, and designed a dependency-injection i18n loader.                                                                                                     |
| `work.oneloyalty.stats`                | 40+ · components de-duplicated; 5–10 min · stable CI builds                                                                                                                                                                                                                            |
| `work.safebulk.title`                  | SafeBulk — Bulk Product Editor                                                                                                                                                                                                                                                         |
| `work.safebulk.summary`                | Sole front-end developer. A 3-step bulk-edit wizard with per-row preview, resumable CSV import/export, and long-running jobs tracked by polling — in strict TypeScript with zero `any`.                                                                                                |
| `work.safebulk.stats`                  | 12.6k · lines of TypeScript; 520+ · i18n keys                                                                                                                                                                                                                                          |
| `skills.label` / `skills.title`        | Skills / Toolbox                                                                                                                                                                                                                                                                       |
| `skills.groups`                        | Core: TypeScript, React, HTML / CSS · Architecture: Turborepo, Layered, Feature-Driven · State & data: React Query, Zustand, Redux Toolkit, GraphQL · Build & performance: Vite, Code splitting, Web Vitals · UI: Tailwind, Polaris, Figma · DevOps: GitLab CI, Docker, NPM publishing |
| `contact.label`                        | Contact                                                                                                                                                                                                                                                                                |
| `contact.titleLines`                   | ["Let's build", "something fast."]                                                                                                                                                                                                                                                     |
| `contact.description`                  | Open to front-end roles with remote and international teams.                                                                                                                                                                                                                           |
| `contact.copyEmail` / `contact.copied` | Copy email / Copied                                                                                                                                                                                                                                                                    |
| `footer.builtWith`                     | Built with Next.js, GSAP, Three.js                                                                                                                                                                                                                                                     |
| `footer.lighthouse`                    | { title: Lighthouse, performance: Performance, accessibility: Accessibility, bestPractices: Best practices, seo: SEO }                                                                                                                                                                 |

Vietnamese values are drafted during implementation and reviewed by the owner; keys are added
to both files in the same commit. Removed keys: `about.paragraphs`, `work.<key>.metric`,
`footer.social`.

## 6. Cross-cutting

- **i18n:** the existing `messages.test.ts` shape check already fails on unequal array lengths
  across locales (`titleLines`, `stats`, `timeline`, `groups`), so it needs no change.
- **Accessibility:** one `h1`; `h2` per section; `h3` per chapter and skill group; all
  placeholder slots `aria-hidden`; AA contrast for text pairs in both themes (`tokens.test.ts`);
  `bg-muted` and `earth` never used for text.
- **Performance:** Server Components except `CopyEmailButton`; fixed-aspect slots keep CLS at
  0; no new dependencies, fonts, or images. Report route JS size before/after from
  `next build`.
- **Theme:** verify both themes at 1440px and 390px against the wireframe.

## 7. Testing

- **Unit (Vitest):** `tokens.test.ts` covers `bg-muted`; `chapter-order.test.ts` asserts each
  slug has an English work doc and each key has exactly two stats in both locales.
- **e2e (Playwright):**
  - `h1` text unchanged in both locales; brand link has the home accessible name.
  - Hero CTAs point to `#work` and `/cv.pdf` with `download`.
  - Mobile menu opens via its accessible name "Menu".
  - Three work chapters with case study links; SafeBulk GitHub/Demo links match `site`.
  - Contact links to email, LinkedIn, GitHub, CV (replaces the footer-links test).
  - Chromium with clipboard permissions: clicking Copy writes the email and shows "Copied".
  - Footer shows the tech line and four Lighthouse scores.
- **Done when:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build` and `pnpm test:e2e`
  pass.

## Out of scope

The wireframe's Case study board; GSAP, Lenis, and 3D (Phases 4, 5, 5B); real portrait/avatar
images; blog styling.
