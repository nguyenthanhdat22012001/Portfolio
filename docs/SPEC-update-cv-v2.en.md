# SPEC — Update the portfolio to match CV v2 (after Phase 4, before Phase 5)

> Version 1.0 · 2026-09-30 · Requested by: Nguyen Thanh Dat
> Applies to the portfolio repo (Next.js App Router + next-intl + MDX + GSAP), with Phases 1–4 complete.
> Read together with the repo's `CLAUDE.md` (shared conventions).

---

## 0. Context & rules

The CV has been updated to **v2**. The current site (Phases 1–4) was written against CV v1, so it shows several figures that **CV v2 no longer claims** — most visibly the Swift animation running **12s → 1.8s**. Recruiters read both the CV and the portfolio, so the two must match.

**Mandatory rules for every change:**

1. Every number, project name and role on the site must appear in CV v2 (table in section 1). The site may go deeper than the CV (how, lessons learned) but **must never claim more than the CV**.
2. Do not invent figures. Where information is missing, leave a `TODO(Dat)` comment that does not render in the UI.
3. Do not change: the stack, folder architecture, design system/tokens, the slugs of the 3 case studies, the Hero 3D scene (Phase 5) or the avatar (Phase 5B).
4. Work on one branch, `update-cv-v2`, one PR, one commit per task (U.1 … U.8), Conventional Commits.
5. Before editing: read the existing code and list the files you will change. Real key/file names in the repo may differ from this spec — **keep the existing names** and change only the content; locate things via `data-anim`, the `messages` namespaces and `content/work/`.

---

## 1. Source of truth — CV v2 (summary)

| Item | CV v2 |
| --- | --- |
| Headline | Front-End Engineer · ~4 years |
| Summary | ~4 years building production eCommerce web apps for Shopify merchants with TypeScript/React/Tailwind; hands-on Next.js (App Router, SSR); OOP, SOLID, Design Patterns; JS → TS migration; Layered & Feature-Driven architecture; shared packages in a monorepo; **CLS ≤ 0.1**; **~20% faster page load**; Agile/Scrum with Designers, BE and POs; **personal-project MVP in ~1.5 months** |
| Oneloyalty (Jun 2024 – Aug 2026, team of 9 · 2 FE) | Senior-led migration of 2 repos → Turborepo, `packages/ui`, Feature-Driven → Layered, on schedule · Dashboard **CLS ≤ 0.1**, keeping the **Built for Shopify** badge · Formik + Redux Toolkit → React Hook Form + Zustand, **−14 kB gzip (~55%)** · `packages/i18n` with **one i18next instance**, preventing duplicate initialization · Owned the FE deploy pipeline on GitLab CI/CD (Node mismatch, removed unnecessary Extensions install from the Admin job) · GitHub Copilot with project rules |
| Swift (Oct 2022 – Jun 2024, team of 9 · 2 FE) | Co-implemented senior-led JS → TS + Feature-Driven migration · Real-time progress UI (Pusher) for theme optimizations (JS/CSS minification, image lazy-loading, HTML cleanup) with step-by-step status and success/failure · UIs for SEO tools (alt text, meta tags, structured snippets, sitemaps) · **Initial load ~20% faster** (code splitting + WebP images) |
| SafeBulk (Jul 2026 – present, 1 FE + 1 BE) | Co-founder · AI-assisted market research · business-logic spec per feature · Figma AI prototype · **MVP in ~1.5 months**, AI-first · Bulk Edit Wizard, CSV import/export, **history log**, plan gating · Dockerfile for the FE build · Links: GitHub, **YouTube demo**, **App Store** |
| Skills | See U.5 |

**Old figures that must disappear from the site:** `12s`, `12–13s`, `1.8s`, `1–3s`, `8–9s`, `2 teams`, `40+`, `8 languages` / `8 ngôn ngữ`, `5–10 min`, `12.6k`, `520+`, `0 any` (as a metric), `4 tiers`, and the **Loom** link.

---

## 2. Change overview

| Task | Scope | Main files (per the Phase 1–2 structure) |
| --- | --- | --- |
| U.1 | Content schema | `src/shared/content/*` (workSchema) |
| U.2 | 3 case studies | `content/work/*.en.mdx`, `*.vi.mdx` |
| U.3 | Hero + About | `messages/{en,vi}.json`, `src/features/hero`, `src/features/about`, `public/cv.pdf` |
| U.4 | Selected Work + 2 new effects | `src/features/work`, `src/shared/animation` |
| U.5 | Skills | `messages/{en,vi}.json`, `src/features/skills` |
| U.6 | SEO | `src/shared/seo/*`, `opengraph-image.tsx` files, `generateMetadata` |
| U.7 | Remove old code | `load-bar`, `hello-morph` and every reference |
| U.8 | Tests | `tests/*`, `scripts/check-stale-claims.mjs`, CI |

---

## U.1 — Content schema

Update `workSchema` (Zod):

```ts
export const workSchema = z.object({
  title: z.string(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  summary: z.string().max(160),                 // used as meta description → max 160
  role: z.string(),
  team: z.string().optional(),                  // NEW — "Team of 9 (2 FE)"
  company: z.string().optional(),
  period: z.object({ start: z.string(), end: z.string().optional() }),
  stack: z.array(z.string()),
  metrics: z.array(z.object({ value: z.string(), label: z.string() })).min(1).max(4),
  links: z.object({
    live: z.string().url().optional(),
    appStore: z.string().url().optional(),      // NEW
    github: z.string().url().optional(),
    demo: z.string().url().optional(),
  }),
  cover: z.string(),
  order: z.number(),
  featured: z.boolean().default(true),
  draft: z.boolean().default(false),
});
```

- The case study header shows `team` next to `role` (when present). The `appStore` link is labeled "Shopify App Store ↗" and listed before GitHub/Demo.
- `metrics[0]` is the headline metric (used by the OG image, U.6). The order of metrics in frontmatter is intentional — do not re-sort.
- If the actual field names differ (e.g. `metrics` items ordered differently), keep the existing names; only add `team` and `appStore` and tighten `summary` to ≤ 160.
- Unit test: frontmatter with a missing `summary`, or a `summary` longer than 160 characters, fails the build.

---

## U.2 — Content of the 3 case studies

Replace the **entire** contents of the three files below. Keep the `cover` and `order` values already in the repo if they differ from these samples. `{/* ... */}` is an MDX comment and does not render.

**Vietnamese versions:** if `*.vi.mdx` files exist, set `draft: true` on all three (they are re-translated in Phase 6). `/vi/work/[slug]` then shows the EN version with a "Bài viết bằng tiếng Anh" label, and `hreflang` points only to the EN version (as in the Phase 6 convention). If that fallback is not implemented yet, add it in this task.

### `content/work/swift-performance.en.mdx`

```mdx
---
title: "Swift: live feedback for store speed optimizations"
slug: "swift-performance"
summary: "Helped migrate a Shopify SEO & speed app from JavaScript to TypeScript, built its real-time optimization UI, and cut initial load by ~20%."
role: "Front-End Engineer (joined as a fresher)"
team: "Team of 9 (2 FE)"
company: "FireGroup"
period: { start: "2022-10", end: "2024-06" }
stack: ["React", "TypeScript", "Redux Toolkit", "Formik + Yup", "Pusher", "Shopify Polaris"]
metrics:
  - { value: "−20%", label: "initial load" }
  - { value: "JS → TS", label: "codebase migration" }
  - { value: "4", label: "SEO tools" }
links:
  live: "https://apps.shopify.com/swift"
cover: "/work/swift/cover.webp"
order: 1
featured: true
---

## Context

Swift is a Shopify embedded app that makes merchants' stores faster and easier to find. It applies speed optimizations to a merchant's storefront theme — JS/CSS minification, image lazy-loading, HTML cleanup — and offers standalone SEO tools. I joined in 2022 as a fresher on a team of nine, two of us on the front end, and built the admin screens merchants use to run those tools.

## Problem

- **The codebase was plain JavaScript.** Type errors only showed up at runtime, and features were hard to find and extend.
- **Optimizations are slow and they touch a live store.** Minifying and rewriting a theme runs as a long backend job. Without feedback, a merchant is left watching a spinner, unsure whether their storefront changed, is still changing, or failed.
- **A speed app that loaded slowly.** The app's own first screen took too long to appear — not a good look for a product that sells speed.

## Solution

**1. JavaScript to TypeScript.** I co-implemented a senior-led migration of the entire codebase to TypeScript and into a Feature-Driven Architecture. Type errors moved from production to compile time, and each feature got its own folder that was easy to locate and extend.

**2. A progress UI in real time.** I built the screen merchants watch while an optimization runs. Over **Pusher**, the backend streams each step — minifying CSS, minifying JS, lazy-loading images, cleaning up HTML — and the UI shows live step-by-step status with a clear success or failure for each one. Merchants can keep working in the app meanwhile. Because the backend stays the source of truth, a missed intermediate event after a reconnect is harmless: the next event brings the UI back to the right state.

**3. SEO tools.** I built the interfaces for the standalone SEO tools: alt-text automation, meta tag editing, structured snippets and sitemap management.

**4. A faster first screen.** The biggest delay turned out to sit outside the front end, but I started with what I owned: route-based **code splitting** (`React.lazy` + `Suspense`) so the first screen no longer waited for the whole app, and converting images to optimized **WebP**. Together they cut initial page load by about **20%**.

## Results

| Metric | Result |
| --- | --- |
| Initial page load | **~20% faster** (code splitting + WebP) |
| Codebase | **JavaScript → TypeScript**, Feature-Driven Architecture |
| Optimization feedback | Live, step-by-step status with success/failure per step |
| SEO tools shipped | **4**: alt text, meta tags, structured snippets, sitemaps |

## Takeaways

- **Improve what you control while you investigate.** The root cause of the slow start was not in my code, but code splitting still made the app faster for merchants in the meantime.
- **Long-running work needs visible progress.** A step list with honest failure states builds more trust than a spinner that finishes silently.
- **Types are worth the migration.** Moving to TypeScript paid off by catching mistakes at compile time instead of in front of merchants.
- **Be clear about whose decision it was.** The migration was senior-led; my part was implementing it alongside them and owning the screens described here.

{/* TODO(Dat): screenshot of the optimization progress screen (blur the store name). */}
```

### `content/work/oneloyalty-monorepo.en.mdx`

```mdx
---
title: "Oneloyalty: one monorepo, steady layouts, lighter forms"
slug: "oneloyalty-monorepo"
summary: "Helped merge two Shopify app repos into one Turborepo, kept the Built for Shopify badge with CLS ≤ 0.1, and cut form/state library weight by ~55%."
role: "Middle Front-End Engineer"
team: "Team of 9 (2 FE)"
company: "FireGroup"
period: { start: "2024-06", end: "2026-08" }
stack: ["React", "TypeScript", "Turborepo", "React Query", "Zustand", "React Hook Form + Yup", "i18next", "Pusher", "Vite", "GitLab CI/CD", "Docker"]
metrics:
  - { value: "≤ 0.1", label: "dashboard CLS" }
  - { value: "−55%", label: "form/state bundle (~14 kB gzip)" }
  - { value: "2 → 1", label: "repositories" }
links:
  live: "https://apps.shopify.com/oneloyalty"
cover: "/work/oneloyalty/cover.webp"
order: 2
featured: true
---

## Context

Oneloyalty is a loyalty and rewards suite for Shopify stores: points, VIP tiers, rewards, campaigns and gamification. It has two front ends — an admin app inside Shopify Admin and storefront extensions shoppers see — which started out in two separate repositories. I was one of two front-end engineers on a team of nine and owned the reward-related features, from the MVP through a large revamp.

## Problem

- **Duplicated UI across two repos.** The admin app reused the extensions' components through a package published to GitLab Package Registry, with `npm link` during development: access tokens for everyone and a slow build → link → test → publish loop for every UI change.
- **Features importing each other.** Code was organized by feature, but features reached into each other's hooks and types. A reward type, `TDataRewards`, lived inside the Rewards feature yet was imported by Campaign and VIP Tier. Part of that coupling was mine: during the MVP I treated two response shapes of the same reward concept as two concepts and duplicated their types.
- **A dashboard that jumped.** Sections loaded asynchronously and pushed the rest of the page around. For a Shopify app that matters beyond polish: the **Built for Shopify** badge, which lifts App Store ranking and recommendations, requires CLS ≤ 0.1.
- **More library than the job needed.** Forms and client state ran on Formik and Redux Toolkit, with slice/action boilerplate for state that React Query already covered on the server side.
- **i18n set up more than once.** i18next could be initialized from more than one place, which led to duplicate-initialization bugs.
- **A pipeline that blocked releases.** Front-end deploys failed on GitLab CI, holding up releases.

## Solution

**One repository, a plan everyone could live with.** I implemented a senior-led migration of both repos into a **Turborepo** monorepo, extracting duplicated components into a shared `packages/ui`. A UI change now reaches every app at once, with nothing to publish. While moving code, the senior proposed also switching features from feature-driven to a **layered architecture** to end the cross-imports. I pushed back — re-architecting during a revamp could cost the deadline. We argued it through and agreed on a plan that addressed both worries: migrate feature by feature, starting with the one most others depended on (Rewards); each developer migrates the features they own; consolidate shared UI in parallel, never blocking revamp work. For `TDataRewards`, I moved the type into a neutral shared layer so Rewards, Campaign and VIP Tier depend on it instead of on each other. When hotfixes landed on a component mid-migration, I patched both copies the same day. The migration shipped on schedule.

**CLS ≤ 0.1 by reserving space.** I found which async sections shifted the layout and gave each one its space up front — a fixed `height` where the final size is known, `min-height` where content length varies — so skeletons match what arrives. The dashboard reached **CLS ≤ 0.1** and kept the Built for Shopify badge.

**Lighter forms and state.** I replaced Formik + Redux Toolkit with **React Hook Form + Zustand**. React Hook Form's uncontrolled inputs avoid re-rendering the whole form on each keystroke, Zustand needs no slices or actions, and existing Yup schemas carried over through a resolver. The change removed **~14 kB gzipped (~55%)** of form and state library code.

**One i18n instance.** I built a shared `packages/i18n` that exposes a **single i18next instance** for every app, which ended the duplicate-initialization bugs and gave the team one way to use translations.

**Fixing a class of bug, not one bug.** QC caught campaign start/end times displayed in server time rather than the store's timezone. I fixed it the same day, then checked every other date on screen unasked — and found point and billing history logs had shown the wrong timezone in production for months. I replaced the one-off fix with a **shared hook** for store-timezone conversion used everywhere.

**Owning the deploy pipeline.** I took over the front-end deployment pipeline on GitLab CI/CD: fixed Node version mismatches between local and CI images, and removed an unnecessary install of the Extensions project that a `prepare` hook triggered inside the Admin job. Front-end releases were unblocked.

**AI with guardrails.** I brought **GitHub Copilot** into the team workflow with project rules and instructions, so AI-generated code followed our conventions, which sped up delivery, debugging and refactoring.

## Results

| Metric | Result |
| --- | --- |
| Dashboard CLS | **≤ 0.1** — Built for Shopify badge retained |
| Form + state libraries | **−14 kB gzip (~55%)**, no Redux boilerplate |
| Repositories | **2 → 1** Turborepo, shared `packages/ui` and `packages/i18n` |
| Architecture migration | Shipped **on schedule**, during the revamp |
| i18n | **1** shared i18next instance, no duplicate-init bugs |
| Front-end releases | Pipeline fixed and owned; releases unblocked |

## Takeaways

- **Disagreeing well means finding the plan, not the winner.** My worry about time was right — the migration did cost extra work. So was the worry about coupling. The step-by-step plan let both be true and still hit the deadline.
- **Performance can be a product requirement.** CLS was not a nice-to-have here; it decided whether the app kept a badge that drives installs.
- **Naming an architecture is not enforcing it.** Next time I would add boundary lint rules (such as `eslint-plugin-boundaries`) on day one.
- **Technical debt compounds.** A small MVP shortcut grew into an architecture problem later. I now pay debt back early.
- **When you find a bug, look for its siblings.** The worst version of the timezone bug was the one nobody reported.

{/* TODO(Dat): before/after screenshots of the dashboard with reserved layout space. */}
```

### `content/work/safebulk.en.mdx`

```mdx
---
title: "SafeBulk: from idea to an MVP on the Shopify App Store"
slug: "safebulk"
summary: "Co-founded a Shopify bulk product editor and built its entire front end, shipping the MVP in ~1.5 months with an AI-first workflow."
role: "Co-founder · Sole Front-End Developer"
team: "1 FE, 1 BE"
period: { start: "2026-07" }
stack: ["React 19", "TypeScript (strict)", "TanStack Router", "React Query", "Zustand", "Docker", "Figma AI"]
metrics:
  - { value: "~1.5 mo", label: "idea to MVP" }
  - { value: "Live", label: "on the Shopify App Store" }
  - { value: "4", label: "core features" }
links:
  appStore: "https://apps.shopify.com/safebulk-editor"
  github: "https://github.com/nguyenthanhdat22012001/safe-bulk-shopify"
  demo: "https://youtu.be/uaKi8VwIrKE"
cover: "/work/safebulk/cover.webp"
order: 3
featured: true
---

## Context

SafeBulk is a bulk product editor for Shopify merchants who need to change many products at once. I co-founded it with a backend engineer: two people, no product manager and no designer. Besides building the whole front end, I did much of the product work myself — research, specs and the first UI.

{/* TODO(Dat): one sentence on why you two chose this problem. */}

## Problem

- **Is it worth building?** The Shopify App Store already has bulk editors. We needed to know where a new one could stand out before writing code.
- **Bulk edits are risky.** One wrong rule can change hundreds of products before anyone notices, and edits and imports run as long jobs in the background.
- **Two people, one product.** With no PM or designer, every requirement, screen and API contract had to be decided by us — and decided clearly enough that frontend and backend could build in parallel.

## Solution

**Validate first.** I researched the Shopify market with AI assistance to decide what SafeBulk should do differently.

{/* TODO(Dat): what the research covered — competing apps, 1–2 star reviews, pricing… */}

**Write the logic down.** For each feature I wrote a detailed business-logic spec and aligned the API contract with the backend before either of us built it, so we could work in parallel without rework.

**Prototype with AI.** I sketched the UI in **Figma AI** to settle layouts and flows quickly before building them in code.

**Build AI-first.** I built the entire front end with an AI-first workflow and shipped the MVP in **about 1.5 months**. It covers four core features:

{/* TODO(Dat): the concrete AI-first workflow — tools, project rules, specs as input… */}

- **Bulk Edit Wizard** — filter products, configure rules, then preview every change before it is applied, with each row flagged by severity.
- **CSV import/export** — with a validation preview so errors surface before an import starts.
- **History log** — a record of what changed and when.
- **Plan gating** — paid tiers and quotas, including the case where a quota limit is hit while a job is running.

Long-running jobs are tracked with React Query conditional polling, and their state lives in the URL, so a job survives a refresh and can be reopened from a link.

**Ship it.** I containerized the front-end build stage with a Dockerfile. The app is now live on the Shopify App Store.

## Results

| Metric | Result |
| --- | --- |
| Idea to MVP | **~1.5 months**, 2-person team |
| Status | **Live** on the Shopify App Store |
| Core features | **4**: Bulk Edit Wizard, CSV import/export, history log, plan gating |
| Front end | Built solo, React 19 + strict TypeScript |

The code is public on GitHub, with a video walkthrough of the main flows.

## Takeaways

- **Owning the product changes the questions you ask.** At work, many architecture and library choices were made for me. Here every choice was mine — and so was the market question behind it.
- **AI speeds up the work you have already defined.** The clear specs and contracts are what made an AI-first workflow fast instead of chaotic.
- **A written spec is the cheapest refactor.** Agreeing on the contract on paper beats changing it after both sides have built on it.

{/* TODO(Dat): one lesson of your own — what you would do differently if you started again. Real install/review numbers, if any → add to Results. */}
```

---

## U.3 — Hero & About

### Hero (`messages` › `hero`)

| Key (suggested) | EN | VI |
| --- | --- | --- |
| `eyebrow` | FRONT-END ENGINEER · HO CHI MINH CITY | FRONT-END ENGINEER · TP. HỒ CHÍ MINH |
| `title` | Nguyen Thanh Dat | Nguyễn Thành Đạt |
| `tagline` | I build fast, well-structured React apps — and measure the difference. | Mình xây ứng dụng React nhanh, có cấu trúc — và đo được sự khác biệt. |
| `subline` | Front-End Engineer · ~4 years building production eCommerce apps for Shopify merchants. | Front-End Engineer · ~4 năm xây ứng dụng eCommerce production cho merchant Shopify. |
| `ctaWork` | View work | Xem dự án |
| `ctaCv` | Download CV | Tải CV |

- If `eyebrow`, `tagline` and the CTAs already match the above, leave them; only `subline` definitely changes.
- **`public/cv.pdf`: replace with the CV v2 PDF** (provided by Dat). Keep the same file name so links do not break.

### About (`messages` › `about`)

**Paragraph 1**

- EN: Front-End Engineer with ~4 years building production eCommerce apps for Shopify merchants with React, TypeScript and Tailwind CSS — and, more recently, Next.js. I care about code that stays easy to change (layered architecture, shared packages in a monorepo, a JavaScript-to-TypeScript migration) and about products that feel fast and steady, like bringing a dashboard's CLS to ≤ 0.1.
- VI: Front-End Engineer với ~4 năm xây ứng dụng eCommerce production cho merchant Shopify bằng React, TypeScript và Tailwind CSS — gần đây thêm Next.js. Mình quan tâm tới code dễ thay đổi (layered architecture, shared package trong monorepo, migration JavaScript sang TypeScript) và sản phẩm nhanh, ổn định — như đưa CLS của một dashboard về ≤ 0.1.

**Paragraph 2**

- EN: I work closely with designers, backend engineers and product owners in Scrum teams. On my own product, SafeBulk, I wrote the business-logic specs myself and shipped the MVP in about 1.5 months.
- VI: Mình làm việc sát với designer, backend engineer và PO trong team Scrum. Với sản phẩm của riêng mình, SafeBulk, mình tự viết spec business logic và ra MVP trong khoảng 1.5 tháng.

**Three stats (`data-anim="counter"`)**

| `data-value` | `data-decimals` | EN label | VI label |
| --- | --- | --- | --- |
| `4` | `0` | years of front-end | năm làm front-end |
| `3` | `0` | Shopify apps shipped | Shopify app đã ra mắt |
| `1.5` | `1` | months from idea to MVP | tháng từ ý tưởng tới MVP |

This replaces the old `8 languages` stat. **Update the counter to support decimals:**

```ts
// src/shared/animation/counter.ts (or wherever the counter effect lives)
const target = Number(el.dataset.value);
const decimals = Number(el.dataset.decimals ?? 0);
const obj = { v: 0 };
gsap.to(obj, {
  v: target,
  duration: 1.5,
  ease: 'power3.out',
  onUpdate: () => { el.textContent = obj.v.toFixed(decimals); },
  scrollTrigger: { trigger: el, start: 'top 80%', once: true },
});
```

No-JS / reduced-motion state: the text in the DOM is the final value (`1.5`), not `0`.

**Timeline**

| Year | EN | VI |
| --- | --- | --- |
| 2022 | Joined FireGroup · Swift | Gia nhập FireGroup · Swift |
| 2024 | Middle Engineer · Oneloyalty | Middle Engineer · Oneloyalty |
| 2026 | Co-founded SafeBulk | Đồng sáng lập SafeBulk |

---

## U.4 — Selected Work

### Data per block

The Work section **must read from frontmatter** (U.2): `title`, `summary`, `metrics[0..1]`, the first 4–5 tags of `stack`, and `links`. If it is currently hard-coded in `messages`, move it to frontmatter (EN; VI uses the EN content until Phase 6). Eyebrow per block:

| Block | Eyebrow | Metrics shown | Links |
| --- | --- | --- | --- |
| Swift | `01 · FIREGROUP · 2022–2024` | −20% initial load · JS → TS codebase migration | Read case study → |
| Oneloyalty | `02 · FIREGROUP · 2024–2026` | ≤ 0.1 dashboard CLS · −55% form/state bundle | Read case study → |
| SafeBulk | `03 · CO-FOUNDER · 2026` | ~1.5 mo idea to MVP · Live on the Shopify App Store | Read case study → · App Store ↗ · GitHub ↗ · Demo ↗ |

External links: `target="_blank" rel="noopener noreferrer"` plus a visually hidden "(opens in new tab)" label.

### Effect `components-merge` (Oneloyalty) — keep, change the label

Change the label `40+ SHARED COMPONENTS` → `SHARED packages/ui`. Do not change the animation.

### Effect `wizard-steps` (SafeBulk) — keep as is

### NEW effect `live-progress` (Swift) — replaces `load-bar`

Purpose: illustrate Swift's real-time progress UI and the −20% result.

**DOM (server-rendered, final state):**

```html
<figure data-anim="live-progress" class="...bg-elevated radius-lg p-10...">
  <p class="sr-only">Theme optimization: 4 steps completed. Initial load reduced by about 20%.</p>
  <div aria-hidden="true">
    <figcaption class="label">THEME OPTIMIZATION · LIVE</figcaption>
    <ol>
      <li data-step data-state="done">  <i data-icon></i> <span>Minify CSS</span>        <span data-status>Done</span></li>
      <li data-step data-state="done">  <i data-icon></i> <span>Minify JS</span>         <span data-status>Done</span></li>
      <li data-step data-state="done" data-fail-once>
                                         <i data-icon></i> <span>Lazy-load images</span>  <span data-status>Done</span></li>
      <li data-step data-state="done">  <i data-icon></i> <span>Clean up HTML</span>     <span data-status>Done</span></li>
    </ol>
    <div data-result>
      <span class="stat accent" data-result-value>−20%</span>
      <span class="fg-muted">initial load · code splitting + WebP</span>
    </div>
  </div>
</figure>
```

**States & styling (CSS, not GSAP):**

| `data-state` | Icon | Status text color | Status text |
| --- | --- | --- | --- |
| `pending` | empty circle | `--fg-muted` | Pending |
| `running` | rotating spinner (CSS `animation`, off under reduced motion) | `--accent` | Running… |
| `failed` | × mark | `--earth` | Failed · retrying |
| `done` | ✓ mark | `--fg` | Done |

State changes use a 200 ms CSS transition on `opacity`/`transform`. Icons are inline stroke SVGs, no emoji.

**Scroll logic (desktop ≥ 768px, no-preference):**

- ScrollTrigger: `trigger` = the Swift block, `start: 'top top'`, `end: '+=150%'`, `pin: true`, `scrub: 1`.
- **Do not use `tl.call()`** (it does not reverse correctly when scrolling back). Use a pure `stateAt(progress)` function and set `data-state` in `onUpdate`, writing to the DOM only when a value changes:

```ts
type StepState = 'pending' | 'running' | 'failed' | 'done';
const SEG = 0.2; // 4 steps × 0.2 = 0.8; 0.8 → 1.0 is reserved for the result

export function stateAt(p: number, i: number, failOnce: boolean): StepState {
  const start = i * SEG, t = (p - start) / SEG;     // t ∈ [0,1] within step i's segment
  if (t <= 0) return 'pending';
  if (t >= 1) return 'done';
  if (failOnce && t > 0.35 && t < 0.6) return 'failed';
  return 'running';
}

export function resultAt(p: number): number {       // 0 → 20
  return Math.round(Math.min(Math.max((p - 0.8) / 0.2, 0), 1) * 20);
}
```

- `data-result-value` shows `−${resultAt(p)}%`; hidden (`opacity: 0`) while `p < 0.8`.
- Unit tests (Vitest) for `stateAt` and `resultAt`: p = 0 → all pending; p = 1 → all done, result 20; step 3 is `failed` in the middle of its segment; states are monotonic as p increases (except the failed branch).

**Mobile (< 768px):** no pin; a timeline that plays once at `top 70%`, ~0.4 s per step, step 3 shows failed for 0.3 s, then counts to −20%.
**Reduced motion:** no animation; keep the final-state DOM.
**No JS:** final state (4 done, −20%) — exactly the server HTML.

### NEW effect `cls-demo` (Oneloyalty) — replaces `hello-morph`

Purpose: illustrate layout shift → reserved space → CLS ≤ 0.1.

> **The most important constraint:** simulate the movement **only with `transform`**, inside a frame of fixed size. Never change the `height`/`margin`/`top` of real elements — otherwise the portfolio itself will shift and its CLS will drop.

**DOM:**

```html
<figure data-anim="cls-demo" class="relative w-full aspect-[16/10] overflow-hidden bg-elevated radius-lg">
  <p class="sr-only">Before: an async section loads and pushes the cards down. After: space is reserved, nothing moves, CLS ≤ 0.1.</p>
  <div aria-hidden="true" class="absolute inset-0">
    <!-- BEFORE layer -->
    <div data-layer="before" class="absolute inset-0 p-6">
      <span class="label">BEFORE · LAYOUT SHIFT</span>
      <div data-mock-header></div>
      <div data-async-block></div>          <!-- 96px tall, revealed with clip-path -->
      <div data-cards>(3 cards)</div>        <!-- start at translateY(-72px), jump to 0 -->
    </div>
    <!-- AFTER layer -->
    <div data-layer="after" class="absolute inset-0 p-6">
      <span class="label accent">AFTER · SPACE RESERVED · CLS ≤ 0.1</span>
      <div data-mock-header></div>
      <div data-async-block data-skeleton></div>  <!-- full 96px skeleton from the start -->
      <div data-cards>(3 cards, static)</div>
    </div>
  </div>
</figure>
```

Colors: mock background `--bg`, cards `--bg-elevated` with `--border`, skeleton `--border` with a light shimmer (off under reduced motion). A "Built for Shopify" label, if used, is plain text — **never Shopify's logo or badge artwork**.

**Timeline (desktop, scrub):** ScrollTrigger `trigger` = the figure, `start: 'top 70%'`, `end: 'bottom 30%'`, `scrub: 1`, no pin.

| Progress | BEFORE layer | AFTER layer |
| --- | --- | --- |
| 0 → 0.15 | visible; async block `clip-path: inset(0 0 100% 0)`; cards `y: -72` | hidden (`autoAlpha: 0`) |
| 0.15 → 0.4 | async block revealed (`inset(0 0 0 0)`); **cards jump `y: -72 → 0`** with `ease: 'power4.in'` (feels janky on purpose) | hidden |
| 0.4 → 0.55 | hold; label pulses once | hidden |
| 0.55 → 0.65 | crossfade out | crossfade in |
| 0.65 → 1 | hidden | skeleton already in place; async content `opacity 0 → 1`; cards **stay still** |

**Mobile & reduced motion:** no scrub. Show both states statically, stacked (BEFORE in its final state with a dashed outline where the cards used to be and a "↓ shift" arrow; AFTER in its final state).
**No JS:** same as mobile.

### Checks specific to U.4

- Run Lighthouse / `web-vitals` on Home after scrolling to the bottom: **CLS < 0.1**, no worse than before the PR.
- `ScrollTrigger.getAll().length` does not grow after 10 round trips Home ↔ case study (no leaks).
- Keep the 3 `gsap.matchMedia()` branches from Phase 4.

---

## U.5 — Skills

Regroup to match CV v2 (keep the `skill-tag` effect). Tag names are the same in both languages; only group names are translated.

| # | Group (EN) | Group (VI) | Tags |
| --- | --- | --- | --- |
| 1 | Languages & Core | Ngôn ngữ & nền tảng | TypeScript, JavaScript (ES6+), React 18/19, HTML5, CSS3, OOP, SOLID, Design Patterns |
| 2 | Architecture | Kiến trúc | Turborepo, Layered, Feature-Driven, Component-Driven |
| 3 | State & Data | State & dữ liệu | React Query, TanStack Router, TanStack Virtual, Zustand, Redux Toolkit, REST, WebSockets (Pusher) |
| 4 | Forms & i18n | Form & i18n | React Hook Form, Formik, Yup, i18next |
| 5 | UI & Styling | UI & styling | Tailwind CSS, SCSS Modules, styled-components, Polaris / Polaris Viz, Figma |
| 6 | Performance & Build | Hiệu năng & build | Vite, Code splitting, Lazy loading, Core Web Vitals |
| 7 | DevOps & Workflow | DevOps & quy trình | Git, GitLab CI/CD, Docker, Jira, Confluence, Scrum |
| 8 | AI Tools | Công cụ AI | GitHub Copilot, Claude |
| 9 | Also working with | Đang dùng thêm | Next.js (App Router, SSR), Vitest, GSAP, Three.js |

- Group 9: the `Next.js (App Router, SSR)` tag carries a small note `— this site` / `— chính site này` (in `--fg-muted`).
- Layout: desktop 3 columns × 3 rows; tablet 2 columns; mobile 1 column.
- **No GraphQL** (CV v2 dropped it — see section 5, open questions).
- Store the data as an array in `messages` (or `src/features/skills/data.ts` plus group names in `messages`) — no hard-coded display strings in components.

---

## U.6 — SEO

| Item | Change |
| --- | --- |
| Home `description` | EN: "Front-End Engineer with ~4 years building fast, well-structured eCommerce apps for Shopify merchants with React, TypeScript and Next.js." · VI: "Front-End Engineer với ~4 năm xây ứng dụng eCommerce nhanh, có cấu trúc cho merchant Shopify bằng React, TypeScript và Next.js." |
| Home `title` | Keep `Nguyen Thanh Dat — Front-End Engineer (React, TypeScript)` |
| Case study meta | `description` = frontmatter `summary` (already ≤ 160) |
| Case study OG image | Headline metric = `metrics[0]`: Swift "−20% initial load", Oneloyalty "≤ 0.1 dashboard CLS", SafeBulk "~1.5 mo idea to MVP". The font must render "−", "≤", "→" and "~" |
| `personSchema()` | `jobTitle: "Front-End Engineer"`; `knowsAbout` = React, TypeScript, Next.js, Tailwind CSS, Shopify, GSAP, Three.js; `address` keeps only `addressLocality: "Ho Chi Minh City", addressCountry: "VN"` (no street address) |
| `creativeWorkSchema(work)` | `keywords` = `stack`; SafeBulk: `sameAs` includes the App Store and GitHub URLs; `url` = the case study page |
| Sitemap | Slugs unchanged → URLs unchanged; `lastModified` of the 3 case studies = PR merge date |

After merging: resubmit the sitemap in Search Console and re-run the Rich Results Test (done manually by Dat).

---

## U.7 — Remove old code

- Fully delete the `load-bar` and `hello-morph` implementations (components, hooks, CSS, `messages` keys, tests, stories if any). `grep -r "load-bar\|hello-morph\|loadBar\|helloMorph"` must return nothing.
- Delete `messages` keys that are no longer used (e.g. the list of 8 greetings, the "12–13s before" label). The EN ↔ VI key-parity test must still pass.
- Delete unused assets (images/Lottie files for the two old effects, if any).

---

## U.8 — Tests & CI

1. **Unit (Vitest):** `stateAt`, `resultAt` (U.4); decimal formatting in the counter; `workSchema` (summary > 160 → fail, `appStore` must be a URL).
2. **Playwright:**
   - Update the screenshot baselines for Home + the 3 case studies at 390px and 1440px (`pnpm test:e2e --update-snapshots`) — the changes are intentional; review the images in the PR.
   - With `reducedMotion: 'reduce'`: `live-progress` shows 4 × "Done" and "−20%"; `cls-demo` shows both static states; no `pin-spacer` elements.
   - The SafeBulk case study links to `https://apps.shopify.com/safebulk-editor` and `https://youtu.be/uaKi8VwIrKE`; no `loom.com` links anywhere.
   - The existing `seo.spec.ts` still passes.
3. **Stop old claims from coming back** — `scripts/check-stale-claims.mjs`, run in CI right after `pnpm build`:

```js
// scripts/check-stale-claims.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['.next/server/app', 'content', 'messages'];
const BANNED = [
  // (?<![\d.]) avoids false positives on CSS such as "0.12s"
  /(?<![\d.])1[23](?:[–-]13)?\s?s\b/,   // 12s, 13s, 12–13s
  /(?<![\d.])1\.8\s?s\b/, /(?<![\d.])1–3\s?s\b/, /(?<![\d.])8–9\s?s\b/,
  /\b40\+/, /\b12\.6k\b/, /\b520\+/,
  /\b8 (languages|ngôn ngữ)\b/i, /\b2 teams\b/i, /\b5–10 min/i,
  /loom\.com/i,
];

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

const hits = [];
for (const root of ROOTS) {
  let files = [];
  try { files = walk(root); } catch { continue; }
  for (const f of files.filter((f) => /\.(html|mdx|json|rsc)$/.test(f))) {
    const text = readFileSync(f, 'utf8');
    for (const re of BANNED) if (re.test(text)) hits.push(`${f}: ${re}`);
  }
}
if (hits.length) { console.error('Stale CV v1 claims found:\n' + hits.join('\n')); process.exit(1); }
console.log('No stale CV v1 claims.');
```

   Add the script `"check:claims": "node scripts/check-stale-claims.mjs"` and a CI step after the build. If draft `*.vi.mdx` files still contain old figures, either skip them in the script or remove the old figures from them as well.

---

## Acceptance criteria

- [ ] Every number and role on the site appears in CV v2 (checked against the table in section 1)
- [ ] `pnpm check:claims` passes; no `load-bar` / `hello-morph` left in the code
- [ ] The 3 case studies render the U.2 content, show `team`, and SafeBulk links to the App Store and the YouTube demo
- [ ] Hero `subline` and About (2 paragraphs, 3 counters with `1.5` rendered correctly, timeline) match U.3 in both EN and VI
- [ ] `live-progress` and `cls-demo` behave correctly in all 3 branches (desktop / mobile / reduced motion); without JS they show their final state
- [ ] Home CLS < 0.1 after scrolling to the bottom; no ScrollTrigger leaks
- [ ] Skills shows the 9 groups from U.5, with no GraphQL
- [ ] `public/cv.pdf` is CV v2
- [ ] Meta, OG images and JSON-LD updated per U.6; `seo.spec.ts` passes; Rich Results Test shows no errors
- [ ] Lint, typecheck, unit, e2e and build are green; Lighthouse mobile is no lower than before the PR (Performance ≥ 95 as in Phase 2, SEO 100)

## Out of scope

Phase 5 (Hero 3D), Phase 5B (avatar), Phase 6 (VI case studies, blog, contact form, analytics), slug changes, changes to the design system or wireframes.

---

## 5. Dat's tasks (not for the AI)

**Before merging**

- [ ] Export the CV v2 PDF to replace `public/cv.pdf`.
- [ ] Fill in the `TODO(Dat)` comments in `safebulk.en.mdx` (why you built it, how you researched, the AI-first workflow, your own lesson; install/review numbers if any). The site works even if they stay empty — the TODOs are comments that do not render.
- [ ] Confirm two SafeBulk details are still accurate: per-row severity preview; polling + job state in the URL.
- [ ] Images: Swift progress screen (store name blurred), Oneloyalty dashboard before/after, SafeBulk wizard GIF, App Store listing screenshot → `public/work/*`.

**Align CV v2 with your interview answers** (the site follows CV v2)

| Topic | Interview prep file | CV v2 | Action |
| --- | --- | --- | --- |
| Form/state in Oneloyalty | Used React Hook Form + Zustand from the start | *Replaced* Formik + Redux Toolkit, −14 kB (~55%) | Confirm the real history; fix either the answer or the CV |
| Swift load time | 12–13s → ~8–9s (≈ 30%) | ~20% (code splitting + WebP) | Pick one number and use it everywhere |
| i18n | DI loader, 8 languages, designed by you | One shared i18next instance | Tell the CV v2 version when asked |
| GraphQL | Used Shopify GraphQL | No longer in Skills | Dropped on purpose → keep; an oversight → add it back to the CV and to U.5 |

Also: the CV v2 summary says "hands-on Next.js", but Skills lists Next.js under *Familiar with*. Once the portfolio launches, consider moving Next.js into the main groups and adding the portfolio link to the CV.
