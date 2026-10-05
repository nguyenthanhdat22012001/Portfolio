# SPEC — Phase 6: Finish & launch

> Version 1.2 · 2026-10-04 (adds Task 6.0 final content; contact form and blog posts removed in 1.1) · Requested by: Nguyen Thanh Dat
> Prerequisites: Phases 1–5C merged (CV v2 update, Hero graph, avatar in About).
> Read together with the repo's `CLAUDE.md`. Time box: **4 days of code**, plus Dat's content work (section 0.3).

---

## 0. Goal, scope & ownership

Put the site on its production domain with: a full **Vietnamese** version, privacy-friendly **analytics**, **quality gates in CI**, security headers, and a finished 404 page and README. The blog is hidden until posts exist. After this phase the portfolio is shareable on the CV, LinkedIn and GitHub.

### 0.1 Launch KPIs (all on mobile, production URL)

| Metric | Target |
| --- | --- |
| Lighthouse Performance / Accessibility / Best Practices / SEO | ≥ 90 / ≥ 95 / 100 / 100 |
| LCP · CLS · INP | < 2.5 s · < 0.1 · < 200 ms |
| Initial JS of `/[locale]` (gzip) | ≤ 150 KB |
| Every number on the site | present in CV v2 (`pnpm check:claims` passes) |

### 0.2 Out of scope

**Contact form** (contact stays email copy + LinkedIn + GitHub + CV), **blog posts** (blog is hidden, Task 6.2), new sections or effects, CMS, comments, newsletter, cookie banner (no cookies are set — Task 6.3), paid plans (everything runs on free tiers).

### 0.3 Who does what

| Task | Owner |
| --- | --- |
| 6.0 final content, 6.1 i18n completion, 6.2 hide blog, 6.3 analytics, 6.4 CI gates, 6.5 security, 6.6 404 + README + footer | AI |
| 6.0 screenshot export, 6.1 Vietnamese review, 6.7 launch checklist | **Dat** |

---

## Task 6.0 — Final content (do this first)

Dat has answered every `TODO(Dat)` and settled the 4 CV-vs-interview inconsistencies. The answers are already written into new content files, delivered in `content-final.zip`. This task puts them into the repo and makes the rest of the site agree with them.

### 6.0.1 Replace the case studies

- Replace `content/work/{swift-performance,oneloyalty-monorepo,safebulk}.en.mdx` with the files from the zip. They contain **no** `TODO(Dat)` markers.
- Add the 3 `*.vi.mdx` drafts from the zip (they carry `draft: true`; Task 6.1.2 covers review).
- Frontmatter changes the schema must accept:
  - Oneloyalty `stack` adds `"GraphQL"`; metrics are now `≤ 0.1` dashboard CLS · `2 → 1` repositories · `1` shared i18n core.
  - SafeBulk `stack` adds `"Shopify Admin GraphQL API"` and `"Claude"`; metrics are `~1.5 mo` idea to MVP · `Live` on the Shopify App Store · `3` competitor weaknesses targeted.
  - Swift metrics: `−20%` initial load · `JS → TS` codebase migration · `4` SEO tools.
- The SafeBulk body contains a Markdown table. Make sure the MDX pipeline renders GFM tables (`remark-gfm`) with the existing prose table styles.
- Exception to 6.1.2: metric `value`s with a unit word may be localized. The only case is SafeBulk `~1.5 mo` → `~1.5 th`.

### 6.0.2 Remove a claim that is not true

The old Oneloyalty story "replaced Formik + Redux Toolkit with React Hook Form + Zustand, −14 kB (~55%)" is **not true** and must not appear anywhere. Oneloyalty used React Hook Form + Zustand from the start, a choice informed by Swift.

- Delete every mention in components, `messages/*.json`, OG images, JSON-LD, the `cls-demo` / Work-block labels and tests. `grep -ri "formik\|55%\|14 kb\|14kB\|redux" src messages content` should only find Swift's stack and the Oneloyalty Context sentence.
- Add these patterns to `scripts/check-stale-claims` so the claim can never return: `55%`, `~55`, `14 kB`, `14kB`, `−14`, `-14 kB`, `Formik + Redux Toolkit →`, `replaced Formik`.
- The Home Work block for Oneloyalty must read its metrics from frontmatter (no hard-coded numbers).

### 6.0.3 Skills and other copy

- Skills section, group "State & Data": add **GraphQL** (EN and VI). It is a general skill, not Shopify-only.
- Any copy that describes Oneloyalty i18n should say: one shared i18next instance, with a translation loader **injected by each app** (dependency injection). Dat designed it.
- Swift load improvement is **~20%** everywhere (site, OG text, tests).

### 6.0.4 Swift screenshot

- Dat exports the Swift optimization progress screen to `public/work/swift/progress.webp`, 1600×1000, store name blurred, < 150 KB.
- The MDX `Image` component maps to `next/image`, keeps the `width`/`height` from MDX (no CLS), lazy-loads, and uses `sizes="(min-width: 768px) 720px, 100vw"`.
- Until the file exists, the build must not fail: show nothing and log a warning in dev.
- Oneloyalty gets **no** dashboard screenshot (the test store data is not worth showing).

### 6.0.5 Done when

- [ ] `pnpm check:claims` passes and fails on a test string containing "55%"
- [ ] No `TODO(Dat)` in `content/`
- [ ] All 3 EN case studies render, including the SafeBulk table and the Swift image
- [ ] GraphQL visible in Skills in both locales

---

## Task 6.1 — Vietnamese version

### 6.1.1 UI strings

- `messages/vi.json` complete for every key in `en.json` (parity test from Phase 1 must pass).
- Voice: first person **"mình"**, friendly-professional, short sentences — same voice as the About and Hero VI copy already in the repo.
- Dates and numbers via next-intl `useFormatter` (`vi-VN`): e.g. "Tháng 6 2024", decimal comma not required for "1.5" (keep "1.5" as written in the CV for consistency).

### 6.1.2 Case studies

- The VI drafts are already written from the final EN files and come with Task 6.0. AI only checks them against the rules below and fixes formatting; Dat reviews the wording.
- Same frontmatter keys and values except `title`, `summary`, `role`, `team`, metric `label`s (translated) — `slug`, `period`, `stack`, `links`, metric `value`s stay identical.
- Remove `draft: true` once Dat approves each file.
- **Glossary — keep in English:** monorepo, Turborepo, Layered / Feature-Driven Architecture, code splitting, CLS, LCP, INP, Built for Shopify, App Store, bundle, gzip, i18n, hook, Server Action, CI/CD, pipeline, MVP, spec, AI-first, React Query, Zustand, React Hook Form, Pusher, WebP, TypeScript, JavaScript. Translate the explanation around them, not the terms.
- No new claims: the VI text must not add or strengthen any fact compared with EN.

### 6.1.3 SEO follow-ups

- Sitemap: each case study now has both `en` and `vi` alternates.
- `alternates.languages` on case study pages lists both locales + `x-default` → en.
- `seo.spec.ts` updated to expect VI case study URLs.

---

## Task 6.2 — Hide the blog until there are posts

The blog routes from Phase 2 stay in the codebase but are switched off, so the site never shows an empty "Blog" page.

- Add `siteConfig.features.blog = false`.
- When `false`: remove "Blog" from the header nav, mobile menu and footer; `app/[locale]/blog/**` calls `notFound()`; blog URLs are excluded from `sitemap.ts`; no RSS `<link>` and no `feed.xml` route; `BlogPosting` JSON-LD code stays but is unused.
- Delete the draft test post from Phase 2 (or keep it with `draft: true`).
- Turning the flag on later must need no other code change (document this in the README).
- Tests: with the flag off, `/en/blog` returns 404, nav has no blog link, `sitemap.xml` contains no `/blog`.

---

## Task 6.3 — Analytics (free, cookieless)

Vercel's Hobby plan includes Web Analytics page views but **not custom events**, so events go to Umami Cloud's free plan.

| Tool | Purpose | Plan |
| --- | --- | --- |
| **Umami Cloud** | Page views + custom events, cookieless | Free Hobby plan (100k events/month, 3 sites, 6-month retention) |
| **Vercel Speed Insights** | Real-user Core Web Vitals (incl. INP) | Hobby allowance (10k events / 30 days) |

Do **not** also enable Vercel Web Analytics (duplicate page views, no events on Hobby).

### 6.3.1 Setup

- Umami script via `next/script`, `strategy="afterInteractive"`, attributes: `data-website-id={env.NEXT_PUBLIC_UMAMI_ID}`, `data-domains="<production domain>"` (no tracking on previews/localhost), `data-do-not-track="true"`.
- `<SpeedInsights />` from `@vercel/speed-insights/next` in the root layout.
- Env: `NEXT_PUBLIC_UMAMI_ID` (optional — omit the script entirely when absent).

### 6.3.2 Events (prefer `data-umami-event` attributes — zero extra JS)

| Event | Where | Properties |
| --- | --- | --- |
| `cta_view_work` | Hero "View work" | — |
| `cv_download` | every "Download CV" link | `location`: hero / contact / footer |
| `email_copy` | Contact copy button | — |
| `case_study_open` | Work block + Next project links | `slug` |
| `outbound_click` | GitHub, LinkedIn, App Store, live app, demo | `target` |
| `avatar_wave_click` | About avatar click-to-wave | — |
| `locale_switch` | Locale switcher | `to`: en / vi |

Guard every `umami.track` call (`window.umami?.track(...)`) so a blocked script never throws.

---

## Task 6.4 — Quality gates in CI

### 6.4.1 Lighthouse CI on preview deployments

- GitHub Actions workflow triggered on `deployment_status` (state `success`, environment `Preview`); URL = `github.event.deployment_status.target_url`.
- Vercel previews are protected by Vercel Authentication by default — LHCI would audit the login page. Use **Protection Bypass for Automation**: store the secret as `VERCEL_AUTOMATION_BYPASS_SECRET` and send header `x-vercel-protection-bypass` (LHCI `extraHeaders`). If the bypass isn't available on the account, disable protection for previews instead and note it in the README.
- URLs: `/en`, `/vi`, `/en/work/oneloyalty-monorepo`, `/vi/work/safebulk`. Preset mobile, 3 runs, median.
- Assertions (`lighthouserc.json`): `categories.performance ≥ 0.9`, `accessibility ≥ 0.95`, `best-practices = 1`, `seo = 1`, `largest-contentful-paint ≤ 2500`, `cumulative-layout-shift ≤ 0.1`, `total-blocking-time ≤ 200`. Failing → PR check fails.

### 6.4.2 Bundle budgets (version-independent)

Recent Next.js versions no longer print First Load JS in `next build`, so measure from the build output:

- `scripts/check-bundles.mjs`: for `.next/server/app/en.html` (and `vi.html`), collect `<script src="/_next/static/...">`, gzip each referenced file from `.next/static`, sum → must be **≤ 150 KB**. Also assert no initial chunk contains `three` (search file contents for a three.js signature such as `WebGLRenderer`).
- Lazy chunks: Hero 3D chunk ≤ 250 KB gzip; About avatar chunk ≤ 28 KB gzip (identify via `@next/bundle-analyzer` stats JSON or by entry name).
- Runs after `pnpm build` in CI, together with `pnpm check:claims`.

### 6.4.3 Playwright matrix

Projects: Chromium, WebKit, Firefox, iPhone 13 (WebKit), Pixel 7 (Chromium), and Chromium with `reducedMotion: 'reduce'`. WebGL-specific assertions (Phase 5/5C) run on desktop Chromium only; all other specs run everywhere.

### 6.4.4 Required checks before merge to `main`

lint · typecheck · unit · e2e matrix · build · `check:claims` · `check-bundles` · Lighthouse CI.

---

## Task 6.5 — Security headers

Set in `next.config` `headers()` for all routes:

| Header | Value |
| --- | --- |
| `Content-Security-Policy` | see below |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` (production only) |
| `X-Frame-Options` | `DENY` |

**CSP** (static pages — a nonce would force dynamic rendering, so use a static policy):

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cloud.umami.is https://va.vercel-scripts.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self';
connect-src 'self' https://cloud.umami.is https://api-gateway.umami.dev https://vitals.vercel-insights.com;
worker-src 'self' blob:;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none';
upgrade-insecure-requests
```

- `'unsafe-inline'` in `script-src` is needed for Next's inline bootstrap and the theme script on statically rendered pages; **no `'unsafe-eval'`**.
- `'wasm-unsafe-eval'` is required by the meshopt decoder (WebAssembly) used for `avatar.glb`.
- Verify every endpoint against the actual network panel in production (Umami and Speed Insights hosts may differ by version) and adjust `connect-src`/`script-src` — do not loosen anything else.
- Playwright: no CSP violation messages in the console on Home, a case study, and after the About avatar loads.

---

## Task 6.6 — 404, footer, README

### 6.6.1 404 page (`app/[locale]/not-found.tsx`)

- Reuse `HeroGraphStatic` (Phase 5 SVG, layered state) — **no three.js**. One node (an `app`-layer node) slowly drifts out of its layer via CSS animation (`transform`, 6 s, ease-in-out, alternate); static under reduced motion.
- Copy: EN "This page wandered off the graph." / VI "Trang này đã lạc khỏi sơ đồ." + link "Back to home" / "Về trang chủ".
- `robots: noindex`.

### 6.6.2 Footer

- Lighthouse scores shown as text from `siteConfig.lighthouse = { performance, accessibility, bestPractices, seo, measuredAt }` — **updated manually** after each release from a real production run; never hard-coded in components, never shown if older than 90 days.
- Links: GitHub repo of the portfolio, © year.

### 6.6.3 README

Sections: screenshot/GIF · live URL · what it is · stack · architecture (layers, folders) · 3D approach (tiers, fallbacks, budgets with measured numbers) · i18n · content model (MDX schema) · feature flags (blog) · scripts · quality gates · environment variables · credits (fonts; the avatar was generated with Meshy under a private license — no attribution required) · license.

---

## Task 6.7 — Launch checklist (Dat)

**Before switching DNS / announcing**
- [ ] VI case studies reviewed and `draft` removed
- [ ] Swift screenshot exported to `public/work/swift/progress.webp`
- [ ] CV updated: Formik/RTK −55% bullet removed, i18n bullet mentions the DI loader, GraphQL in skills; interview notes say ~20% for Swift
- [ ] `public/cv.pdf` = latest CV, which now includes the portfolio URL
- [ ] Umami site created, `NEXT_PUBLIC_UMAMI_ID` set in Vercel (Production only)
- [ ] Real-device pass: iPhone Safari, Android Chrome, macOS Safari, Windows Chrome/Edge — Hero graph, About avatar, theme and locale switch
- [ ] 2–3 people review the site for a day (ideally one recruiter or hiring manager)

**Launch day**
- [ ] Search Console: resubmit sitemap, URL Inspection on `/en` and `/vi`
- [ ] Rich Results Test on Home and one case study
- [ ] LinkedIn Post Inspector on Home and one case study (OG image renders)
- [ ] Update LinkedIn (Featured + Contact info), GitHub profile README, CV
- [ ] LinkedIn launch post with a short screen recording (Hero morph + avatar wave)
- [ ] Record the production Lighthouse scores in `siteConfig.lighthouse`

**Week after**
- [ ] Check Umami events and Speed Insights (INP, LCP by device); fix anything above target
- [ ] Search Console coverage: all EN/VI URLs indexed, no errors

---

## Delivery plan

| Day | Work |
| --- | --- |
| 1 | 6.0 final content + stale-claim patterns; 6.1 UI strings + sitemap/hreflang; 6.2 hide blog |
| 2 | 6.3 analytics + events; 6.6 404 page |
| 3 | 6.4 CI gates (LHCI with bypass, bundle script, Playwright matrix) |
| 4 | 6.5 headers/CSP + console checks; footer, README; fixes |

---

## Acceptance criteria

- [ ] Task 6.0 done-when list complete
- [ ] `/vi` fully translated; 3 VI case studies published with correct `hreflang`
- [ ] Blog hidden: no nav link, `/blog` routes 404, no blog URLs in the sitemap
- [ ] Umami records all events in section 6.3.2 on production only; Speed Insights reporting; no cookies set (check Application → Cookies)
- [ ] CI blocks merges on any failing gate in 6.4.4; LHCI audits the real preview (not the Vercel login page)
- [ ] Initial JS ≤ 150 KB gzip, no three.js in initial chunks; lazy chunk budgets met
- [ ] Security headers present; no CSP violations on Home, a case study, or after the avatar loads
- [ ] 404 page uses the static SVG, no three.js request
- [ ] README complete; footer Lighthouse scores from a real production run
- [ ] All launch KPIs in section 0.1 met on the production domain
- [ ] Every item in the Dat checklist "Before switching DNS / announcing" ticked

---

## Sources (checked 2026-10-04)

- Vercel Web Analytics pricing — custom events not included on Hobby: https://vercel.com/docs/analytics/limits-and-pricing
- Vercel Hobby plan — Speed Insights / Web Analytics allowances, personal non-commercial use: https://vercel.com/docs/plans/hobby
- Umami Cloud free plan (100k events/month, 3 sites, 6-month retention): https://canivibecodeit.com/umami-cloud
