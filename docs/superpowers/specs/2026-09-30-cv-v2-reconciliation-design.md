# CV v2 update — reconciliation with the repo

> 2026-09-30 · Addendum to `docs/SPEC-update-cv-v2.en.md`.
> The spec stays the source of truth for **copy and figures**. This document
> records where the repo differs from the spec's assumptions and what was
> decided in each case. Where the two disagree, this document wins.

## Workflow

- Work on the current branch, `phase-4` (not `update-cv-v2`). One
  Conventional Commit per task, U.1 … U.8.
- Existing names are kept (spec rule 5). The spec's names map to the repo's
  names as follows:

| Spec | Repo |
| --- | --- |
| `oneloyalty-monorepo`, `safebulk` slugs | `oneloyalty-layered-architecture`, `safebulk-bulk-editor` (unchanged) |
| `content/work/*.en.mdx` / `*.vi.mdx` | `content/work/<slug>.mdx` with `locale: en`; no VI files |
| `workSchema` (Zod) | Work collection in `velite.config.ts` |
| `messages/{en,vi}.json` | `src/shared/i18n/messages/{en,vi}.json` |
| `data-anim="…"` | `motion("…")` → `data-motion`, registered in `app/[locale]/_motion/registry.ts` |
| `load-bar` | the `swift` effect's bars/timer + `swift-timer.ts` |
| `hello-morph` | the greeting cycle in the `oneloyalty` effect + `greeting-cycle.ts` |
| `components-merge` | the grid half of the `oneloyalty` effect |
| `wizard-steps` | the `safebulk` effect (unchanged) |
| `skill-tag` effect | `stagger` on `TagList` |
| `seo.spec.ts` | `e2e/seo-metadata.spec.ts` |

## U.1 — Work schema

Kept: `slug`, `title` (≤ 60), `summary` (rendered on the page), `description`
(140–160, meta/OG only), `locale`, `content`.

Added:

- `role: string`, `team?: string`, `company?: string`
- `period: { start: "YYYY-MM", end?: "YYYY-MM" }`
- `stack: string[]`, which **replaces `tags` for Work** (Blog keeps `tags`)
- `metrics: { value, label }[]`, min 1, max 4, kept in frontmatter order;
  `metrics[0]` is the headline metric
- `links: { live?, appStore?, github?, demo? }`, each a URL
- `dateModified?: isodate`

Removed from Work: `tags`, `dateCreated`. Anything that used
`dateCreated` now uses `period.start`: the "Started …" line, JSON-LD
`dateCreated`, and the sitemap fallback.

Not added (YAGNI): `cover`, `order`, `featured`, `draft`. No cover images
exist; display order lives in `chapter-order.ts`; there are no VI files to
mark as draft, since the VI fallback and notice already work.

The spec's summaries become `summary`. Each study also gets a new
`description` of 140–160 characters. It rephrases the summary and adds no
claim that isn't in CV v2. Swift's (138) and SafeBulk's (131) summaries are
too short to be used as the meta description as-is.

Tests: a non-URL `links.appStore` fails, a missing or
out-of-range `description` fails, and `metrics` outside 1–4 fails.

## U.2 — Case studies

The body and frontmatter follow spec U.2, adapted to the schema above, with
the repo slugs and `dateModified: 2026-09-30`; bump it on merge day if the
merge slips. `TODO(Dat)` notes stay as MDX comments. Loom disappears
everywhere, including `site.safebulkDemo`, which becomes the YouTube URL.

## U.3 — Hero & About

- Hero keeps its keys (`role`, `titleLines`, `tagline`, `ctaWork`, `ctaCv`).
  `tagline` takes the spec's text and a new `subline` key renders under it
  (EN + VI). The old tagline's "4 years … Shopify" moves into `subline`, so
  the claim isn't repeated.
- About: `lead` / `body` take the spec's paragraphs 1 / 2. `stats` are
  `4`, `3`, `1.5`; `timeline` takes the spec's three items.
- Counter: `parseStat` already derives decimals from the text, so `"1.5"`
  counts up with one decimal and the no-JS DOM shows `1.5`. No code change;
  a test is added for it. No `data-decimals` attribute.
- `public/cv.pdf` is replaced by Dat.

## U.4 — Selected Work

### Data flow

`chapter-order.ts` keeps only `{ slug, key, eyebrowKey? }` in display order.
`key` selects the visual and the motion effect. Everything else comes from
`getWorkBySlug(slug, locale)`:

- title, summary
- stats = `metrics.slice(0, 2)`
- tags = `stack.slice(0, 5)`
- external links, in the order App Store, GitHub, Demo. Swift and Oneloyalty
  show only "Read case study →" on Home.
- eyebrow = `NN · {company ?? t("work.coFounder")} · {start year}–{end year}`
  (a single year when they are equal or when there is no end)

The chapter content is English until Phase 6, so a chapter whose entry is a
fallback gets `lang="en"`. Messages keep only UI labels such as "Read case
study", link labels, "Co-founder" and "(opens in new tab)". Each
`work.<key>.title/summary/stats` key is deleted.

External links: `target="_blank" rel="noopener noreferrer"` plus a
visually hidden "(opens in new tab)" label.

### Case-study header (`ArticleLayout`)

It gains an optional `role · team` line and a links row ("Shopify App Store
↗" first, then Live, GitHub, Demo). The labels come from `caseStudy.*`
messages. The tag list shows `stack`.

### Swift — `live-progress`, implemented inside the `swift` effect

- `SwiftVisual` renders the spec's final-state DOM: sr-only summary, 4 steps
  with `data-state="done"`, inline stroke-SVG icons, and a `−20%` result.
  State styling is CSS on `data-state`, with 200 ms transitions and a spinner
  that is disabled under reduced motion. The copy comes from
  `work.swift.*` messages.
- `features/work/motion/live-progress.ts` exports the pure `stateAt` and
  `resultAt` from the spec, both unit-tested.
- Desktop: the existing pin is kept (`start: "center center"`,
  `end: "+=150%"`, `pin: true`, `scrub: 0.5`), because the navigation and
  Lenis e2e tests depend on it. `onUpdate` writes `data-state` / the result
  text only when a value changes. The result is hidden while `p < 0.8`, set
  from JS only.
- Mobile: no pin. The **same** update function is driven by a tween of
  `progress` from 0 to 1 over about 2 s that plays once at `top 70%`.
- Reduced motion: the effect doesn't run, so the server HTML (the final
  state) stays.
- Cleanup restores the final state.
- `isAtOrAboveViewport` guard as in the other effects.

### Oneloyalty — components grid + `cls-demo`

- The figure keeps the components grid; its caption becomes
  "SHARED packages/ui". The animation is unchanged.
- The i18n greeting half is replaced by `cls-demo`, as **two panes side by
  side inside one fixed 16:10 frame** (decision A):
  - BEFORE pane: a mock header, an async block revealed by `clip-path`, and
    3 cards that jump from `y: -72` to `0` (`power4.in`). Transforms and
    clip-path only.
  - AFTER pane: the skeleton is in place from the start, the async content
    fades in, and the cards never move.
  - Desktop with JS: scrubbed on the figure (`top 70%` → `bottom 30%`, no
    pin). BEFORE plays first, then AFTER.
  - No JS, reduced motion, and mobile show both panes in their final state.
    The BEFORE pane shows a dashed outline where the cards were and a
    "↓ shift" marker. On mobile the panes stack.
  - Page layout never changes between states, so the demo adds no CLS.
    The skeleton shimmer is off under reduced motion. "Built for Shopify" is
    plain text only.
- The `oneloyalty` effect loses its greeting code and handles grid +
  `cls-demo`.

### Safebulk

Unchanged apart from the data flow above.

## U.5 — Skills

The nine groups from spec U.5 live in messages. An item is either a string or
`{ "name": string, "note": string }`; `TagList` renders the note in
`fg-muted` next to the tag. The note is used for `Next.js (App Router, SSR)`,
with "— this site" / "— chính site này". Grid: 1 / 2 / 3 columns (as
today). No GraphQL.

## U.6 — SEO

- Home `meta.title` is unchanged in both locales. `meta.description` in EN
  and VI is rewritten from the spec's sentence and brought into 140–160
  characters without adding claims.
- Work metadata uses `description`.
- OG image: `renderOgImage` / `OgCard` take an optional `metric`
  (`metrics[0]`), rendered large under the title. Glyph coverage for "−",
  "≤", "→" and "~" in OpenSans-Bold is verified. For any glyph that's
  missing, an OFL symbol-font subset is added as a fallback entry in
  `fonts`; the copy is not changed.
- `site.knowsAbout` = React, TypeScript, Next.js, Tailwind CSS, Shopify,
  GSAP, Three.js.
- `buildPerson` adds `address: { "@type": "PostalAddress",
  addressLocality: "Ho Chi Minh City", addressCountry: "VN" }`.
- `buildCreativeWork`: `keywords` = `stack` (replacing `about: tags`),
  `dateCreated` = `period.start`, and `sameAs` = `[links.appStore,
  links.github]` when present. `url` is unchanged.
- Sitemap: work `lastModified` = `dateModified ?? period.start`.

## U.7 — Removal

Delete `swift-timer.ts`, `greeting-cycle.ts` and their tests; the swift
before/after bar DOM; the message keys `work.swift.{caption,beforeLabel,
beforeValue,afterValue,steps}`, `work.oneloyalty.{greetings,counter,
i18nCaption}`, `work.*.{title,summary,stats}`; and the Loom URL. The EN ↔ VI
key-parity test stays green. There are no image or Lottie assets to remove.

## U.8 — Tests & CI

- Unit: `stateAt` / `resultAt` (p = 0 → all pending; p = 1 → all done and
  20; step 3 failed mid-segment; monotonic apart from the failed branch),
  decimal `parseStat`, the Velite schema, `chapter-order` against the real
  content, `TagList` notes, `OgCard` metric, JSON-LD builders.
- e2e:
  - `work.spec.ts`: App Store + YouTube links, no `loom.com`, header shows
    role and team; greeting assertions removed.
  - `motion.spec.ts`: the timer/counter checks are replaced by
    "`data-state` changes while pinned".
  - Under reduced motion: 4 × "Done", "−20%", both `cls-demo` panes, no
    `.pin-spacer`.
  - Home scrolled to the bottom: CLS < 0.1 via `PerformanceObserver`.
  - `ScrollTrigger.getAll().length` doesn't grow after repeated
    Home ↔ case-study round trips.
  - The existing SEO, JSON-LD, OG and sitemap specs are updated.
- No screenshot baselines (the repo has no screenshot tests).
- `scripts/check-stale-claims.mjs` as in the spec, with roots
  `.next/server/app`, `content`, `src/shared/i18n/messages`.
  `"check:claims"` is added to `package.json`, and a CI step runs it right
  after `pnpm build`. It is run once against a real build; if a pattern
  false-positives on CSS or minified JS, the pattern is narrowed rather than
  files skipped.

## Budgets

The new visuals are server HTML plus CSS. The `swift` effect no longer
drives bar or timer tweens, and `oneloyalty` loses the SplitText greeting
loop, so the motion chunk should shrink. `motion.spec.ts` still enforces the
70 KB gzip limit; Lighthouse CI thresholds are not touched.

## Out of scope

Everything in the spec's "Out of scope" section, plus: screenshot baselines,
Search Console / Rich Results Test (Dat), the CV PDF export (Dat), and filling
in `TODO(Dat)` comments (Dat).
