# Source Structure & AI-Implementation Rules — Design

Sep 27, 2026 · Design spec for bootstrapping the Portfolio repo

## Context

This repo currently contains only planning docs (`docs/Portfolio Nguyen Thanh Dat — Project Plan.md`,
`docs/Phase 5B — Avatar intro.md`) and no commits. This spec covers Phase 1 ("Foundation") from the
project plan: creating a runnable Next.js scaffold with the layered architecture the plan specifies,
and writing down the rules an AI assistant (Claude Code) should follow when implementing features in
this repo, so those rules are enforced by tooling rather than relying on being remembered.

This is a new project, so it is treated as an architectural task per the brainstorming process:
questions were asked and answered, a design was presented and approved, and this document is the
resulting spec, to be handed to the writing-plans skill next.

## Decisions carried in from clarifying questions

- Package manager: **pnpm**
- Content pipeline: **Velite** (type-safe MDX content collections with Zod schemas)
- Scope: **full runnable scaffold** — not just folders, an app that actually builds and runs
- AI rules file: **CLAUDE.md** only (this is a Claude Code session; no AGENTS.md duplicate needed)

## Goals

- Stand up a single-package Next.js App Router project (TypeScript strict) matching the plan's
  layered directory structure (`app` → `features` → `shared`, plus `content/` and `public/`).
- Make the plan's "Key Conventions" section enforceable, not just documented — specifically the
  layering rule, via ESLint rather than code-review-only discipline.
- Wire up the quality tooling the plan calls for at Phase 1: ESLint, Prettier, Vitest, Playwright,
  and a CI workflow that blocks on lint/typecheck/test/build.
- Seed bilingual (en default, vi) routing via next-intl and a Velite content pipeline for
  `content/work/*.mdx` and `content/blog/*.mdx`, even though no real content exists yet.
- Write `CLAUDE.md` capturing the conventions future implementation work (by Claude or otherwise)
  must follow, derived from the plan's conventions, performance budget, and accessibility sections.

## Non-goals

- No real page content, 3D assets, GSAP timelines, or case study/blog copy — this is scaffolding only.
  Those are later phases (2 onward) in the project plan.
- No Lighthouse CI budget gating — the plan places that in Phase 3; this task leaves a commented
  placeholder job in the CI workflow instead of wiring it now.
- No Vercel project linking / preview deployment setup — connecting the GitHub repo to a Vercel
  project is an account-level action only the user can perform in the Vercel dashboard. This is
  called out as a manual follow-up step, not built by this task.
- No custom domain, Search Console, or analytics setup (Phase 3/6 per the plan).

## Directory & package structure

Single Next.js App Router package at the repo root (not a monorepo):

```
.
├── CLAUDE.md
├── package.json                 # pnpm, Next.js 15+, React 19, TS strict
├── pnpm-workspace.yaml
├── tsconfig.json                 # strict: true; path aliases @/features/*, @/shared/*, @/content/*
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── velite.config.ts               # content schemas for work/*.mdx, blog/*.mdx
├── .eslintrc.json                 # next/core-web-vitals + eslint-plugin-boundaries
├── .prettierrc
├── vitest.config.ts
├── playwright.config.ts
├── .github/workflows/ci.yml       # install -> lint -> typecheck -> unit test -> build
├── src/
│   ├── app/[locale]/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── work/[slug]/page.tsx
│   │   ├── blog/[slug]/page.tsx
│   │   ├── sitemap.ts
│   │   └── robots.ts
│   ├── app/not-found.tsx
│   ├── middleware.ts              # next-intl locale routing
│   ├── features/
│   │   ├── hero/
│   │   ├── about/
│   │   ├── work/
│   │   ├── skills/
│   │   └── contact/
│   └── shared/
│       ├── ui/
│       ├── three/
│       ├── animation/
│       ├── seo/
│       ├── i18n/                  # next-intl config, messages/en.json, messages/vi.json
│       └── lib/  types/
├── content/
│   ├── work/*.mdx
│   └── blog/*.mdx
└── public/
    ├── models/  og/
    └── cv.pdf                     # placeholder until real CV is supplied
```

Every `features/*` and `shared/*` folder gets real, minimal content rather than being an empty
directory with a placeholder file — e.g. `shared/lib` gets the actual (empty-state) Zustand scroll
store, `shared/i18n` gets the actual next-intl config and seeded message files, `shared/seo` gets a
real `buildMetadata()` helper. Empty directories are not committed to git; if a folder has no real
content yet, it is not created until the phase that needs it.

## Tooling & config choices

- **TypeScript strict** (`strict: true`, plus `noUncheckedIndexedAccess`), path aliases for
  `@/features/*`, `@/shared/*`, `@/content/*`.
- **Layering enforcement via ESLint**: `eslint-plugin-boundaries` configured with element types
  `app` > `features` > `shared`, forbidding a lower layer from importing a higher one. This is a lint
  error, not a comment in a rules file — it must actually fail `pnpm lint` when violated, verified as
  part of this task's definition of done.
- **Velite** for `content/work/*.mdx` / `content/blog/*.mdx`, with Zod schemas covering the front
  matter the plan's case studies need: title, slug, dates, summary, metrics, tags, locale.
- **next-intl**: `en` default + `vi`, locale-prefixed routing (`/en`, `/vi`), `middleware.ts` for
  locale negotiation, seeded `messages/en.json` / `messages/vi.json` with placeholder keys per
  section (hero, about, work, skills, contact, nav, footer).
- **Vitest** for unit tests, with one real passing test (e.g. the Zustand scroll store or a shared
  utility) — not just a config file with no tests.
- **Playwright** for e2e smoke tests, with one real passing test (home page renders, locale switch
  from `/en` to `/vi` works, `prefers-reduced-motion` is respected where applicable at this stage).
- **GitHub Actions** (`.github/workflows/ci.yml`): a single workflow, triggered on PR and push to
  main, running `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` — all
  blocking. A commented-out placeholder job documents where Lighthouse CI will be added in Phase 3.
- **Vercel preview deployments**: out of scope for this task (see Non-goals) — flagged as a manual
  follow-up for the user to connect the repo via the Vercel dashboard.

## `CLAUDE.md` — rules for AI-assisted implementation

Content derived directly from the plan's "Key Conventions," performance budget, and accessibility
sections, written as concrete, checkable rules rather than general advice:

- Server Components by default; `"use client"` only for files that touch GSAP or the R3F canvas.
- Any 3D canvas import goes through `dynamic(() => import(...), { ssr: false })`; the canvas element
  is `aria-hidden="true"`; every piece of text rendered in the canvas has a real DOM counterpart
  (never canvas-only text).
- Scroll/section progress state lives in exactly one Zustand store; GSAP writes to it; `useFrame`
  reads from it. Never drive per-frame updates through React state/re-renders.
- Exactly one `Lenis` instance and one `gsap.ticker` for the whole app, created once at the app root.
  Do not instantiate either inside a feature component.
- Respect `prefers-reduced-motion`: disable scrubbing/pinning and Lenis, and keep any 3D scene static,
  for any animation work added later.
- Layering is enforced by ESLint (`eslint-plugin-boundaries`) — if a change seems to need `shared` to
  import from `features`, treat that as a signal the abstraction is wrong, not a rule to work around.
- Performance budget reminders inline: initial JS (gzip) < 150KB, lazy 3D chunk < 250KB, `.glb` models
  < 500KB (except the Phase 5B avatar, budgeted separately at ≤ 1.5MB) — flag budget-relevant changes
  during implementation rather than only at Lighthouse CI time.
- TDD expectation: write or adjust the relevant Vitest/Playwright test alongside feature code, not
  as an afterthought.
- No hardcoded user-facing strings — everything goes through next-intl message keys in
  `shared/i18n/messages/*.json`.
- Pointers back to the two plan docs in `docs/` for anything this file doesn't cover, and a note that
  this file itself should be updated if a convention changes.

## Testing / Definition of done

- `pnpm install && pnpm dev` serves a working (placeholder-content) bilingual homepage at `/en` and
  `/vi` with no runtime errors.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (Vitest), and `pnpm build` all pass locally.
- A deliberate bad import (e.g. `shared/ui` importing from `features/hero`) is added temporarily and
  confirmed to fail `pnpm lint`, then removed — proving the boundaries rule is live, not just
  configured.
- `pnpm playwright test` passes its one smoke test.
- `.github/workflows/ci.yml` runs green against the initial commit/push (verified via `gh` if a
  remote is set up, or documented as pending a remote otherwise).
- `CLAUDE.md` exists at the repo root and reads as a set of concrete, checkable rules (reviewed for
  the placeholder/ambiguity checks below).

## Risks carried from the project plan

- Directory/tooling choices here should not, by themselves, create the "3D scope creep" or "GSAP +
  React 19 Strict Mode" risks the plan calls out — this task adds no 3D or GSAP code, only the
  folders and conventions that later phases will fill in.
- Content pipeline (Velite) choice should not block later switching case studies/blog to a CMS if
  ever needed post-v1.0 — Velite reads from local MDX files only, no lock-in beyond the repo.
