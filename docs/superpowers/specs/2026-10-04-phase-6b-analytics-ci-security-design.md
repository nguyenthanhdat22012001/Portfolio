# Phase 6B — Analytics, CI gates, security headers — Design

Date: 2026-10-04 · Source spec: `docs/SPEC-phase-6-launch.en.md` · Follows:
`docs/superpowers/specs/2026-10-04-phase-6a-launch-content-design.md`

## Scope

This work implements Tasks **6.3 (analytics), 6.4 (quality gates in CI) and
6.5 (security headers)** of the Phase 6 spec — the tasks the Phase 6A design
moved to `phase-6-b`. Task 6.7 (launch checklist) stays with Dat.

Production origin: `https://portfolio-zeta-cyan-13.vercel.app` (the value of
`NEXT_PUBLIC_SITE_URL` in Vercel Production). The project is connected to
Vercel; PRs get preview deployments behind Vercel Authentication.

Success: `pnpm lint && pnpm typecheck && pnpm test && pnpm build &&
pnpm check:claims && pnpm check:bundles` pass; the full Playwright matrix and
both Lighthouse CI runs (local and preview) are green; the done-when lists
below hold; initial JS ≤ 150 KB gzip and lazy-chunk budgets still met.

## Decisions that differ from or refine the Phase 6 spec

| Topic | Phase 6 spec | Decision here | Why |
| --- | --- | --- | --- |
| Event markup | `data-umami-event` attributes | Own `data-track*` attributes + one delegated listener that calls `umami.track` | Umami's listener `preventDefault()`s same-tab links and sets `location.href`: breaks the CV `download`, client-side case study navigation + View Transition, and Lenis `#work` scrolling |
| `cv_download` in footer | `location: footer` | Not tracked there | The footer has no CV link; no new UI in this phase |
| `case_study_open` on "Next project" | Work block + Next project | Work block only | No "Next project" link exists |
| Bundle budgets | `check-bundles.mjs` checks initial and lazy chunks | Script checks initial JS + no `WebGLRenderer` in initial chunks; lazy budgets stay in `hero-3d`, `about-avatar`, `motion` e2e specs | A lazy chunk is defined by what the browser loads; guessing chunk names from build output is brittle; avoids two sources of truth |
| About chunk budget | 28 KB | 26 KB (CLAUDE.md) | Stricter wins (same as 6A) |
| `Permissions-Policy` | includes `interest-cohort=()` | Dropped | Chrome logs an "Unrecognized feature" console error → Lighthouse Best Practices < 100 |
| `upgrade-insecure-requests` | always | Vercel production only | Over `http://localhost` (e2e, local LHCI) some browsers upgrade subresources to https and break them |
| `'unsafe-eval'` | never | `next dev` only | React dev tooling needs it; production never has it |
| Merge target | `main` | `master` | The repo's default branch |
| Preview LHCI URLs | `/en/work/oneloyalty-monorepo`, `/vi/work/safebulk` | `/en/work/oneloyalty-layered-architecture`, `/vi/work/safebulk-bulk-editor` | Slugs kept in 6A |
| Local LHCI | — | Kept, alongside preview LHCI | Catches regressions before Vercel finishes building |

## Task 6.3 — Analytics

### Units

- `src/shared/analytics/events.ts` (server-safe, no `"use client"`):
  - `AnalyticsEvent` — a union of the seven event names below, each with
    its typed props.
  - `trackAttrs(name, props?)` → `{ "data-track": name,
    "data-track-<key>": value, … }`. Server Components spread it, like
    `motion()`.
  - `track(name, props?)` → `window.umami?.track(name, props)`; a no-op
    when Umami is absent or blocked, never throws.
- `src/shared/analytics/tracking-script.ts`: `trackingScript`, an inline
  string (like `themeScript`). It adds one capture-phase `click` listener on
  `document`; on a click inside an element with `data-track`, it collects
  `data-track-*` into props and calls `window.umami?.track`. It never calls
  `preventDefault` and never navigates; Umami's `fetch` uses `keepalive`, so
  the request survives a page load.
- `src/shared/analytics/umami-config.ts`: `umamiConfig(env = process.env)`
  → `{ websiteId, domains } | null`:
  - no `NEXT_PUBLIC_UMAMI_ID` → `null`;
  - `VERCEL_ENV === "production"` → `domains` = hostname of `getSiteUrl()`
    (`portfolio-zeta-cyan-13.vercel.app`);
  - anything else (Vercel preview, CI, local) → `domains` =
    `"tracking-disabled.invalid"`, so the script loads (realistic CSP and
    e2e) but never sends. `getSiteUrl()` falls back to the preview host or
    `localhost` outside production, so it must not decide this on its own.
- Root layout (`app/[locale]/layout.tsx`):
  - When `umamiConfig()` is non-null: `next/script`
    `src="https://cloud.umami.is/script.js"`, `strategy="afterInteractive"`,
    `data-website-id={websiteId}`, `data-domains={domains}`,
    `data-do-not-track="true"`; plus `trackingScript`. When null: neither is
    rendered.
  - Always: `<SpeedInsights />` from `@vercel/speed-insights/next` (reports
    only on Vercel).
  - Vercel Web Analytics stays off.

### Events

| Event | Where | Mechanism | Props |
| --- | --- | --- | --- |
| `cta_view_work` | Hero "View work" (`#work`) | `trackAttrs` | — |
| `cv_download` | Hero CV link, Contact CV link | `trackAttrs` | `location`: `hero` / `contact` |
| `email_copy` | `CopyEmailButton` | `trackAttrs` | — |
| `case_study_open` | `WorkChapter` "Read" link | `trackAttrs` | `slug` |
| `outbound_click` | Contact LinkedIn + GitHub, footer repo link, `ExternalLinks` | `trackAttrs` | `target`: `linkedin` / `github` / `repo` / `live` / `appStore` / `demo` / `source` |
| `avatar_wave_click` | `AvatarHitProxy` `onClick` (canvas, no DOM element) | `track()` | — |
| `locale_switch` | `LocaleSwitcher`, non-current locale link only | `trackAttrs` | `to`: `en` / `vi` |

`ExternalLink` gains an optional `kind` (the frontmatter `links` key:
`live`, `appStore`, `github`, `demo`) used as `target`.

### Failure modes

- No `NEXT_PUBLIC_UMAMI_ID` → no Umami script, no listener.
- Script blocked → `window.umami` undefined → `track` does nothing.
- Preview / CI / localhost → `data-domains` is a never-matching host, so
  Umami never sends.
- No cookies are set (Umami and Speed Insights are cookieless).

## Task 6.4 — Quality gates in CI

### `scripts/check-bundles.mjs` (`pnpm check:bundles`)

- For `.next/server/app/en.html` and `vi.html`: collect every
  `<script src="/_next/static/…">`, gzip each file from `.next/static`, sum.
  Fail if a page's sum is > 150 KB (153 600 bytes).
- Fail if any of those files contains `WebGLRenderer`.
- Print the measured KB per page.
- Logic in a pure function, unit-tested with a fixture directory.

### `ci.yml` jobs

1. **`checks`**: install → lint → typecheck → test → build (with
   `NEXT_PUBLIC_UMAMI_ID=ci-dummy`) → `check:claims` → `check:bundles`.
   Upload `.next` without `.next/cache` as an artifact.
2. **`e2e`** (`needs: checks`): matrix over `chromium`, `chromium-no-webgl`,
   `firefox`, `webkit`, `iphone-13`, `pixel-7`, `chromium-reduced-motion`;
   `fail-fast: false`. Downloads the build, installs only that project's
   browser, runs `playwright test --project=<project>`.
3. **`lhci`** (`needs: checks`): the existing local `pnpm lhci` run, with its
   report artifact.

### Playwright projects and tags

- Projects: `chromium` (Desktop Chrome, SwiftShader args as today),
  `chromium-no-webgl` (unchanged), `firefox`, `webkit`, `iphone-13`
  (`devices["iPhone 13"]`), `pixel-7` (`devices["Pixel 7"]`),
  `chromium-reduced-motion` (Desktop Chrome, `reducedMotion: "reduce"`).
- Tags:
  - `@webgl`: tests needing WebGL or measuring 3D/motion chunk budgets
    (`hero-3d`, `hero-3d-visual`, `about-avatar`, `about-avatar-visual`,
    budget tests in `motion.spec`, the avatar part of `security.spec`). Run
    only on `chromium`.
  - `@motion`: tests asserting animation. Excluded from
    `chromium-reduced-motion` by `grepInvert`.
- Everything else runs on every project.
- Cross-browser failures from specs that never ran outside Chromium in CI
  are fixed in the page. A skip is allowed only for a harness-specific
  limitation and carries a comment with the reason.
- `PLAYWRIGHT_BASE_URL` (optional): when set, Playwright targets that URL,
  starts no `webServer`, and sends `x-vercel-protection-bypass` from
  `VERCEL_AUTOMATION_BYPASS_SECRET` if present.

### Lighthouse CI on previews — `.github/workflows/lighthouse-preview.yml`

- Trigger: `deployment_status`; job condition
  `github.event.deployment_status.state == 'success' &&
  startsWith(github.event.deployment_status.environment, 'Preview')`.
- Base URL: `github.event.deployment_status.target_url`.
- If `secrets.VERCEL_AUTOMATION_BYPASS_SECRET` is empty, the job fails with
  a message naming the secret (never audits the Vercel login page).
- Config `lighthouserc.preview.cjs`: imports `assert` from
  `lighthouserc.json`; sets `collect.url` to `/en`, `/vi`,
  `/en/work/oneloyalty-layered-architecture`,
  `/vi/work/safebulk-bulk-editor`; `numberOfRuns: 3`; mobile (LHCI
  default); `settings.extraHeaders` with `x-vercel-protection-bypass`.
- Uploads the report as an artifact.

### Assertions (`lighthouserc.json`, shared by both runs)

Existing: performance ≥ 0.9, accessibility ≥ 0.95, best-practices = 1,
seo = 1, CLS ≤ 0.1, script size ≤ 150 KB. Added:
`largest-contentful-paint` ≤ 2500 and `total-blocking-time` ≤ 200
(median-run). The local run also adds `/vi/work/safebulk-bulk-editor`.
A miss is fixed in the page; thresholds are never loosened.

### Required checks on `master`

`checks`, every `e2e (<project>)`, `lhci`, `lighthouse-preview`. Dat
applies branch protection (a repository setting); the README gives the
exact `gh api` command and check names.

## Task 6.5 — Security headers

### Unit

`src/shared/security/headers.ts`: `securityHeaders(env)` with
`env: "development" | "preview" | "production"`, derived in
`next.config.ts` (`NODE_ENV !== "production"` → development;
`VERCEL_ENV === "production"` → production; else preview). `headers()`
applies the result to `/:path*`.

### Headers

| Header | Value |
| --- | --- |
| `Content-Security-Policy` | Policy below |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `X-Frame-Options` | `DENY` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` — production only |

CSP (static; a nonce would force dynamic rendering):

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
upgrade-insecure-requests          ← production only
```

- Development only: `'unsafe-eval'` in `script-src`; `ws:` in
  `connect-src` if HMR needs it (checked in the `pnpm dev` pass).
- `'wasm-unsafe-eval'` is for the meshopt decoder (`avatar.glb`).
- Hosts: a host is removed only when a captured network log from the
  preview deployment shows it unused; nothing else is loosened or added.

## Testing and verification

### Vitest

- `trackAttrs` output; `track` is a no-op without `window.umami`.
- `umamiConfig`: null without an ID; production hostname only when
  `VERCEL_ENV === "production"`; never-matching domain otherwise (including
  a preview with `VERCEL_URL` set).
- `trackingScript` (jsdom): calls `umami.track` with `data-track-*` props;
  ignores clicks outside `data-track`; never calls `preventDefault`.
- `securityHeaders` per environment: all directives present; no
  `'unsafe-eval'` outside development; HSTS and
  `upgrade-insecure-requests` only in production; no `interest-cohort`.
- `check-bundles` on fixtures: sums gzip sizes, fails over budget, fails on
  `WebGLRenderer`.

### Playwright

- Shared helper `e2e/helpers/umami.ts`: routes
  `https://cloud.umami.is/script.js` to a stub that records `umami.track`
  calls in `window.__umamiCalls`.
- `e2e/analytics.spec.ts`: each event in the table fires with the right
  props (avatar wave tagged `@webgl`); the CV link still downloads; the case
  study link still navigates client-side; with the Umami script aborted,
  clicks don't throw; no cookies are set.
- `e2e/security.spec.ts`: headers present on `/en`; no
  `securitypolicyviolation` events (collected via an init script) on Home
  and a case study; same after the About avatar has loaded (`@webgl`).
- Against the preview (`PLAYWRIGHT_BASE_URL` + bypass secret):
  `security.spec` runs and the loaded third-party hosts are recorded in the
  PR description.

### Budgets

Re-measure and report initial JS (now with Speed Insights) and the
`about-avatar` chunk (now importing `track`; ~0.5 KB headroom at 25.5 of
26 KB). Neither budget is raised.

### Final

`pnpm lint && pnpm typecheck && pnpm test && pnpm build &&
pnpm check:claims && pnpm check:bundles`, the full Playwright matrix,
`pnpm lhci`, and a `pnpm dev` (Turbopack) pass confirming the development
CSP doesn't break HMR, the Hero canvas or the About avatar.

## Docs

- README: analytics (Umami + Speed Insights, cookieless, events table);
  environment variables (`NEXT_PUBLIC_UMAMI_ID`,
  `VERCEL_AUTOMATION_BYPASS_SECRET`, existing ones); quality gates
  (jobs, Playwright projects/tags, preview LHCI, required check names,
  `gh api` branch-protection command); security headers.
- CLAUDE.md: `trackAttrs`/`track` convention (never `data-umami-event`),
  the security-headers module and the rule for changing CSP hosts,
  Playwright `@webgl`/`@motion` tags, `check:bundles` and the required
  checks.

## Order of work

Each step is one or more commits, green before the next:

1. `securityHeaders` + unit tests + `next.config.ts` wiring.
2. `check-bundles.mjs` + tests + `pnpm check:bundles`.
3. Analytics units (`events.ts`, `umamiConfig`, `trackingScript`) + unit
   tests.
4. Layout: Umami script, listener, `<SpeedInsights />`; budget re-measure.
5. Event wiring in components (+ `ExternalLink.kind`, avatar `track`);
   `analytics.spec.ts` with the Umami stub.
6. `security.spec.ts`.
7. Playwright projects + tags; cross-browser fixes.
8. `ci.yml` restructure; `lighthouserc.json` assertions;
   `lighthouserc.preview.cjs` + `lighthouse-preview.yml`.
9. Preview verification (needs Dat's bypass secret); trim CSP hosts only
   with evidence.
10. README + CLAUDE.md.

## Dat's follow-ups

- Vercel: create Protection Bypass for Automation; add it to GitHub Actions
  secrets as `VERCEL_AUTOMATION_BYPASS_SECRET`.
- Umami Cloud: create the site; set `NEXT_PUBLIC_UMAMI_ID` in Vercel
  (Production only).
- Enable Speed Insights for the project in the Vercel dashboard.
- Apply branch protection on `master` with the README command.

## Refinements made while planning

These supersede the matching lines above.

- **Analytics files.** `events.ts` holds the types and `trackAttrs` (server
  code, plus `LocaleSwitcher`). `track()` lives alone in
  `src/shared/analytics/track.ts`, so the `about-avatar` chunk imports only
  that file and no module is shared with the initial bundle.
  `CopyEmailButton` takes its `data-track` attributes as props from
  `ContactSection`.
- **Outbound targets.** `linkedin` and `github` (Contact profile links),
  `repo` (footer), and for `ExternalLinks`: `appStore`, `live`, `demo`, and
  `source` for the frontmatter `github` key, so a case study's source link
  is never confused with the profile link. `ExternalLink.kind` is the
  `LinkKey` from `shared/content/links.ts`.
- **Preview LHCI config.** No `lighthouserc.preview.cjs`. The workflow runs
  `lhci collect --no-lighthouserc` with the URLs and `extraHeaders` on the
  command line, then `lhci assert --config=./lighthouserc.json`, so the
  assertions still have one source.
- **Bypass header scope.** Lighthouse `extraHeaders` and Playwright
  `extraHTTPHeaders` go with every request, including the
  `cloud.umami.is` script request. Accepted risk: the secret only opens
  previews of a public site, and Umami never sends from a preview. The
  README says so.
- **Where specs run.**
  - `@webgl` stays a tag for single tests (the motion-chunk budget).
  - WebGL spec files (`hero-3d`, `hero-3d-visual`, `about-avatar`,
    `about-avatar-visual`) are matched by file, as `chromium-no-webgl`
    already is.
  - `@motion` tests are excluded from `chromium-reduced-motion`.
  - `@desktop` (desktop layout, mouse or wheel input) is excluded from
    `iphone-13` and `pixel-7`.
- **Avatar event and avatar CSP check** live in `about-avatar.spec.ts`
  (WebGL-only, has the scroll and phase helpers), not in
  `analytics.spec.ts` or `security.spec.ts`.
- **Artifact upload** of `.next` sets `include-hidden-files: true`
  (`actions/upload-artifact@v4` skips dot-directories otherwise).
- **Speed Insights only on Vercel.** Off Vercel, `<SpeedInsights />`
  requests `/_vercel/speed-insights/script.js`, which returns 404 under
  `pnpm start`. That console error would break the "no console problems"
  e2e checks and Lighthouse Best Practices = 100. The layout renders it only
  when `speedInsightsEnabled()` is true (`VERCEL === "1"` at build time).
  Its bundle cost is enforced on the real preview by the preview LHCI
  `resource-summary:script:size ≤ 150 KB` assertion, and measured once in
  the plan with a forced build. Both helpers live in
  `src/shared/analytics/config.ts` (not `umami-config.ts`).
- **Umami loads on first input (Dat's decision, 2026-10-04).** Lighthouse's
  `resource-summary:script:size ≤ 150 KB` counts third-party scripts, and
  Umami's `script.js` (+2.3 KB) pushed `/en` over it. Like the motion chunk,
  the Umami script is now injected by an inline loader on the first
  `scroll` / `pointermove` / `keydown` / `touchstart`, so Lighthouse never
  loads it and no threshold changes. The click listener queues events fired
  before Umami arrives, and the loader flushes them once the script loads.
  Cost: a visit with no input at all records no pageview. The script is a
  plain server-rendered tag, not `next/script`, which ships a client runtime
  (+1.6 KB initial JS).
- **CSP `connect-src` includes `blob:`.** GLTFLoader fetches the avatar's
  embedded GLB textures from `blob:` URLs.
