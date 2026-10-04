# Phase 6B — Analytics, CI gates, security headers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cookieless Umami events and Vercel Speed Insights, a full CI quality gate (bundle script, cross-browser Playwright matrix, local and preview Lighthouse CI), and static security headers with a CSP.

**Architecture:**
- **Analytics:** Server Components mark elements with `trackAttrs()`, and one inline capture-phase click listener forwards those clicks to `window.umami.track` without ever cancelling them. The canvas avatar calls a guarded `track()`. Environment rules (production-only sending, Vercel-only Speed Insights) live in pure, tested functions in `src/shared/analytics/config.ts`.
- **Security headers:** a pure `securityHeaders(env)` module that `next.config.ts` applies.
- **CI:** a `checks` job uploads the build; a matrix of e2e jobs and a local LHCI job run from it; a separate `deployment_status` workflow audits the Vercel preview.

**Tech Stack:** Next 16.3 (webpack build), React 19, next-intl, Vitest 2 (jsdom), Playwright 1.49, @lhci/cli 0.15.1, GitHub Actions, Umami Cloud, `@vercel/speed-insights` 2.x.

**Spec:** `docs/superpowers/specs/2026-10-04-phase-6b-analytics-ci-security-design.md`. Read it fully. Its final section, "Refinements made while planning", overrides earlier lines.

**Branch:** work directly on the current branch (`phase-6-a`). Do not create a branch or a worktree. Commit after each task. Do not push without asking Dat (Task 10).

## Global Constraints

- Layering `app → features → shared`, enforced by `eslint-plugin-boundaries`. `src/shared/**` imports only `src/shared/**`.
- Server Components by default. No new `"use client"` files. `CopyEmailButton`, `LocaleSwitcher` and the avatar files are already client.
- No hardcoded user-facing strings. This plan adds none: event names and props are data, not copy.
- Initial JS (gzip) ≤ 150 KB (153 600 bytes); 3D chunk ≤ 250 KB; `about-avatar` chunk ≤ 26 KB (measured 25.5 KB); motion chunk ≤ 70 KB. Never raise a budget. Never loosen a `lighthouserc.json` threshold.
- Lighthouse: performance ≥ 0.9, accessibility ≥ 0.95, best-practices = 1, seo = 1, CLS ≤ 0.1, LCP ≤ 2500 ms, TBT ≤ 200 ms.
- Production origin: `https://portfolio-zeta-cyan-13.vercel.app`. Umami may only send from a build where `VERCEL_ENV === "production"`.
- Umami script: `https://cloud.umami.is/script.js`, `strategy="afterInteractive"`, `data-do-not-track="true"`. Never use `data-umami-event` attributes.
- CSP `script-src` never contains `'unsafe-eval'` outside `next dev`. `Permissions-Policy` never contains `interest-cohort`.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` must pass at the end of every task that touches code.
- Production builds use `next build --webpack` (`pnpm build`). Turbopack is dev only; check `pnpm dev` too where noted.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Same-tab tracked links keep their default behaviour.** The CV link still downloads, the case study link still navigates client-side (no full reload, View Transition intact), and `#work` still scrolls. Pinned in Task 5 (`analytics.spec.ts`: download, no-reload marker, `#work` in viewport).
2. **Umami blocked or missing never throws.** An aborted script request leaves every click working with no `pageerror`. Pinned in Task 3 (unit: no `umami`, throwing `track`) and Task 5 (e2e: aborted script).
3. **Preview/CI builds never send.** A Vercel preview has `VERCEL_URL` set and `getSiteUrl()` returns the preview host, yet `data-domains` must not match it. Pinned in Task 3 (`umamiConfig` with `VERCEL_ENV=preview` + `VERCEL_URL`).
4. **The production CSP breaks nothing on a real page,** including the meshopt WASM decoder after the avatar loads, the theme inline script, Next's inline bootstrap, and OG/`next/image` images. Pinned in Task 6 (`securitypolicyviolation` collection on Home, case studies, and after `avatar.glb`).
5. **Speed Insights doesn't 404 off Vercel.** `pnpm start` must not request `/_vercel/speed-insights/script.js`, or console-clean checks and Best Practices = 100 fail. Pinned in Task 3 (`speedInsightsEnabled`) and Task 4 (e2e: no request to `/_vercel/`).

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/shared/security/headers.ts` (create) | `securityEnv()`, `contentSecurityPolicy()`, `securityHeaders()`: pure |
| `src/shared/security/headers.test.ts` (create) | Unit tests per environment |
| `next.config.ts` (modify) | `headers()` applies `securityHeaders(securityEnv())` to `/:path*` |
| `scripts/bundles.mjs` + `scripts/bundles.d.mts` (create) | `initialScripts(html)`, `measurePage(html, staticDir)`, `INITIAL_BUDGET_BYTES` |
| `scripts/bundles.test.ts` (create) | Fixture-based tests |
| `scripts/check-bundles.mjs` (create) | CLI: measures `en.html`/`vi.html`, exits 1 on failure |
| `src/shared/analytics/events.ts` (create) | Event types, `trackAttrs()`, `linkTarget` |
| `src/shared/analytics/track.ts` (create) | `track()` (guarded) + `Window.umami` type; imported only by the avatar |
| `src/shared/analytics/config.ts` (create) | `umamiConfig()`, `speedInsightsEnabled()`, `UMAMI_SCRIPT_SRC`, `DISABLED_DOMAIN` |
| `src/shared/analytics/tracking-script.ts` (create) | `trackingScript`: the inline click listener |
| `src/shared/analytics/*.test.ts` (create) | Unit tests |
| `src/app/[locale]/layout.tsx` (modify) | Umami `<Script>`, listener, `<SpeedInsights />` |
| `src/features/hero/HeroSection.tsx`, `src/features/contact/ContactSection.tsx`, `src/features/contact/CopyEmailButton.tsx`, `src/features/work/WorkChapter.tsx`, `src/features/work/WorkSection.tsx`, `src/app/[locale]/work/[slug]/page.tsx`, `src/shared/ui/ExternalLinks.tsx`, `src/features/layout/SiteFooter.tsx`, `src/features/layout/LocaleSwitcher.tsx`, `src/features/about/avatar/AvatarHitProxy.tsx` (modify) | Event wiring |
| `e2e/helpers/umami.ts` (create) | Umami stub route + call reader |
| `e2e/helpers/csp.ts` (create) | `securitypolicyviolation` collector |
| `e2e/analytics.spec.ts`, `e2e/security.spec.ts` (create) | Event and header/CSP e2e |
| `e2e/about-avatar.spec.ts` (modify) | Avatar wave event + CSP after avatar load |
| `playwright.config.ts` (modify) | 7 projects, tag filters, `PLAYWRIGHT_BASE_URL`, webServer env |
| `.github/workflows/ci.yml` (modify) | `checks` → `e2e` matrix + `lhci` |
| `.github/workflows/lighthouse-preview.yml` (create) | Preview LHCI on `deployment_status` |
| `lighthouserc.json` (modify) | LCP/TBT assertions, extra URL |
| `package.json` (modify) | `check:bundles` script, `@vercel/speed-insights` |
| `README.md`, `CLAUDE.md` (modify) | Docs |

---

### Task 1: Security headers

**Files:**
- Create: `src/shared/security/headers.ts`
- Test: `src/shared/security/headers.test.ts`
- Modify: `next.config.ts`

**Interfaces:**
- Produces:
  - `type SecurityEnv = "development" | "preview" | "production"`
  - `securityEnv(env?: Record<string, string | undefined>): SecurityEnv`
  - `contentSecurityPolicy(mode: SecurityEnv): string`
  - `securityHeaders(mode: SecurityEnv): { key: string; value: string }[]`

- [ ] **Step 1: Write the failing test** at `src/shared/security/headers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  contentSecurityPolicy,
  securityEnv,
  securityHeaders,
  type SecurityEnv
} from "./headers";

const header = (mode: SecurityEnv, key: string) =>
  securityHeaders(mode).find((h) => h.key === key)?.value;

describe("securityEnv", () => {
  it("is development under next dev", () => {
    expect(securityEnv({ NODE_ENV: "development" })).toBe("development");
  });
  it("is production only on a Vercel production build", () => {
    expect(
      securityEnv({ NODE_ENV: "production", VERCEL_ENV: "production" })
    ).toBe("production");
  });
  it("is preview for Vercel previews, CI and local next start", () => {
    expect(securityEnv({ NODE_ENV: "production", VERCEL_ENV: "preview" })).toBe(
      "preview"
    );
    expect(securityEnv({ NODE_ENV: "production" })).toBe("preview");
  });
});

describe("contentSecurityPolicy", () => {
  const modes: SecurityEnv[] = ["development", "preview", "production"];

  it.each(modes)("%s has every fixed directive", (mode) => {
    const csp = contentSecurityPolicy(mode);
    for (const directive of [
      "default-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'"
    ]) {
      expect(csp).toContain(directive);
    }
    expect(csp).toMatch(
      /script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'.* https:\/\/cloud\.umami\.is https:\/\/va\.vercel-scripts\.com/
    );
    expect(csp).toContain("https://api-gateway.umami.dev");
    expect(csp).toContain("https://vitals.vercel-insights.com");
  });

  it("allows 'unsafe-eval' and ws: only in development", () => {
    expect(contentSecurityPolicy("development")).toContain("'unsafe-eval'");
    expect(contentSecurityPolicy("development")).toContain(" ws:");
    for (const mode of ["preview", "production"] as const) {
      expect(contentSecurityPolicy(mode)).not.toContain("'unsafe-eval'");
      expect(contentSecurityPolicy(mode)).not.toContain(" ws:");
    }
  });

  it("upgrades insecure requests only in production", () => {
    expect(contentSecurityPolicy("production")).toContain(
      "upgrade-insecure-requests"
    );
    expect(contentSecurityPolicy("preview")).not.toContain("upgrade-insecure");
    expect(contentSecurityPolicy("development")).not.toContain(
      "upgrade-insecure"
    );
  });
});

describe("securityHeaders", () => {
  it("sets the fixed headers in every mode", () => {
    for (const mode of ["development", "preview", "production"] as const) {
      expect(header(mode, "X-Content-Type-Options")).toBe("nosniff");
      expect(header(mode, "Referrer-Policy")).toBe(
        "strict-origin-when-cross-origin"
      );
      expect(header(mode, "Permissions-Policy")).toBe(
        "camera=(), microphone=(), geolocation=()"
      );
      expect(header(mode, "X-Frame-Options")).toBe("DENY");
      expect(header(mode, "Content-Security-Policy")).toBe(
        contentSecurityPolicy(mode)
      );
    }
  });

  it("never lists interest-cohort (Chrome logs it as an error)", () => {
    expect(header("production", "Permissions-Policy")).not.toContain(
      "interest-cohort"
    );
  });

  it("sends HSTS only in production", () => {
    expect(header("production", "Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains; preload"
    );
    expect(header("preview", "Strict-Transport-Security")).toBeUndefined();
    expect(header("development", "Strict-Transport-Security")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run src/shared/security/headers.test.ts`
Expected: FAIL, `Failed to resolve import "./headers"`.

- [ ] **Step 3: Implement** `src/shared/security/headers.ts`:

```ts
// Static security headers for every route (Phase 6 §6.5), applied by
// next.config.ts. Static, not nonce-based: a nonce would force every page
// to render dynamically. Pure so each environment is unit-tested.
export type SecurityEnv = "development" | "preview" | "production";

type Env = Record<string, string | undefined>;

export function securityEnv(env: Env = process.env): SecurityEnv {
  if (env.NODE_ENV === "development") return "development";
  return env.VERCEL_ENV === "production" ? "production" : "preview";
}

// Third-party hosts. Remove one only when a network capture from a real
// deployment shows it unused; never add a wildcard.
const UMAMI = "https://cloud.umami.is";
const UMAMI_API = "https://api-gateway.umami.dev";
const VERCEL_SCRIPTS = "https://va.vercel-scripts.com";
const VERCEL_VITALS = "https://vitals.vercel-insights.com";

export function contentSecurityPolicy(mode: SecurityEnv): string {
  const dev = mode === "development";
  const directives: string[][] = [
    ["default-src", "'self'"],
    [
      "script-src",
      "'self'",
      // Next's inline bootstrap and the theme script on static pages.
      "'unsafe-inline'",
      // The meshopt decoder for avatar.glb is WebAssembly.
      "'wasm-unsafe-eval'",
      // React dev tooling only; production never evals.
      ...(dev ? ["'unsafe-eval'"] : []),
      UMAMI,
      VERCEL_SCRIPTS
    ],
    ["style-src", "'self'", "'unsafe-inline'"],
    ["img-src", "'self'", "data:", "blob:"],
    ["font-src", "'self'"],
    [
      "connect-src",
      "'self'",
      // HMR websocket; Safari doesn't treat ws: as 'self'.
      ...(dev ? ["ws:"] : []),
      UMAMI,
      UMAMI_API,
      VERCEL_VITALS
    ],
    ["worker-src", "'self'", "blob:"],
    ["frame-ancestors", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["object-src", "'none'"],
    // Over http://localhost (e2e, local Lighthouse) this would break
    // subresources in some browsers.
    ...(mode === "production" ? [["upgrade-insecure-requests"]] : [])
  ];
  return directives.map((parts) => parts.join(" ")).join("; ");
}

export function securityHeaders(
  mode: SecurityEnv
): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(mode) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // No interest-cohort: Chrome logs it as an unrecognized feature, which
    // costs the Lighthouse Best Practices score.
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()"
    },
    { key: "X-Frame-Options", value: "DENY" },
    ...(mode === "production"
      ? [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload"
          }
        ]
      : [])
  ];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/shared/security/headers.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Wire `next.config.ts`.** Replace the file with:

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { securityEnv, securityHeaders } from "./src/shared/security/headers";

const withNextIntl = createNextIntlPlugin("./src/shared/i18n/request.ts");

const nextConfig: NextConfig = {
  // OG image routes read this font with fs at request time.
  outputFileTracingIncludes: {
    "/**": ["./src/shared/seo/og/fonts/OpenSans-Bold.ttf"]
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders(securityEnv()) }];
  }
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 6: Verify the build and the live headers**

Run: `pnpm build && (pnpm start & curl -sI --retry 30 --retry-connrefused --retry-delay 1 http://localhost:3000/en | grep -iE "content-security|x-frame|permissions|referrer|x-content|strict-transport"; kill %1)`
Expected: the CSP (without `upgrade-insecure-requests` or `'unsafe-eval'`), `X-Frame-Options: DENY`, the Permissions-Policy, the Referrer-Policy and `nosniff` are printed. No `Strict-Transport-Security`.

If `next build` fails to load `next.config.ts` because of the relative TS import, check `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/` (search "TypeScript"). The fallback is to move the module to `security-headers.mjs` at the repo root with a `security-headers.d.mts` (same pattern as `scripts/stale-claims.mjs`), keep the test beside it, and add the root `*.test.ts` glob to `vitest.config.ts` `include`.

- [ ] **Step 7: Verify `next dev` with the dev CSP.** Run `pnpm dev`, open `http://localhost:3000/en` in a browser (or Playwright against the dev server), and check:
  - No CSP violations in the console.
  - HMR still works: edit a string in `en.json`, the page updates, then revert the edit.
  - The Hero canvas mounts.

  Stop the dev server.

- [ ] **Step 8: Lint, typecheck, test, commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add src/shared/security next.config.ts
git commit -m "feat(security): static CSP and security headers per environment

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Bundle budget script

**Files:**
- Create: `scripts/bundles.mjs`, `scripts/bundles.d.mts`, `scripts/check-bundles.mjs`
- Test: `scripts/bundles.test.ts`
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces:
  - `INITIAL_BUDGET_BYTES: number` (153 600)
  - `initialScripts(html: string): string[]`: paths relative to `.next/static`, decoded, de-duplicated, `noModule` excluded
  - `measurePage(html: string, staticDir: string): { files: string[]; gzipBytes: number; threeFiles: string[] }`
  - `pnpm check:bundles`

- [ ] **Step 1: Write the failing test** at `scripts/bundles.test.ts`:

```ts
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { beforeAll, describe, expect, it } from "vitest";
import { INITIAL_BUDGET_BYTES, initialScripts, measurePage } from "./bundles.mjs";

const html = [
  '<script src="/_next/static/chunks/polyfills-1.js" noModule=""></script>',
  '<script src="/_next/static/chunks/webpack-2.js" id="_R_" async=""></script>',
  '<script src="/_next/static/chunks/app/%5Blocale%5D/page-3.js" async=""></script>',
  '<script src="/_next/static/chunks/webpack-2.js" async=""></script>',
  '<link rel="preload" as="script" href="/_next/static/chunks/lazy-4.js"/>',
  '<script>self.__next_f.push([1,""])</script>'
].join("");

describe("initialScripts", () => {
  it("lists module scripts once, decoded, without noModule polyfills or preloads", () => {
    expect(initialScripts(html)).toEqual([
      "chunks/webpack-2.js",
      "chunks/app/[locale]/page-3.js"
    ]);
  });
});

describe("measurePage", () => {
  let dir: string;
  const webpack = "console.log('runtime');".repeat(50);
  const page = "export const WebGLRenderer = 1;";

  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), "bundles-"));
    mkdirSync(path.join(dir, "chunks/app/[locale]"), { recursive: true });
    writeFileSync(path.join(dir, "chunks/webpack-2.js"), webpack);
    writeFileSync(path.join(dir, "chunks/app/[locale]/page-3.js"), page);
  });

  it("sums gzip sizes of the initial scripts", () => {
    const result = measurePage(html, dir);
    expect(result.gzipBytes).toBe(
      gzipSync(webpack).length + gzipSync(page).length
    );
    expect(result.files).toHaveLength(2);
  });

  it("names initial files that contain three.js", () => {
    expect(measurePage(html, dir).threeFiles).toEqual([
      "chunks/app/[locale]/page-3.js"
    ]);
  });

  it("budgets 150 KB", () => {
    expect(INITIAL_BUDGET_BYTES).toBe(150 * 1024);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run scripts/bundles.test.ts`
Expected: FAIL, cannot resolve `./bundles.mjs`.

- [ ] **Step 3: Implement** `scripts/bundles.mjs`:

```js
// Initial-JS budget from the build output (Phase 6 §6.4.2). Recent Next
// versions no longer print First Load JS, so this reads the prerendered HTML
// and gzips the scripts it names. Lazy chunks are budgeted by the e2e specs
// that load them (hero-3d, about-avatar, motion).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

export const INITIAL_BUDGET_BYTES = 150 * 1024;

const SCRIPT_TAG = /<script\b[^>]*>/g;
const SRC = /\bsrc="\/_next\/static\/([^"]+\.js)"/;

// Script files the document loads on its own, relative to .next/static.
// noModule polyfills are skipped: modern browsers never fetch them.
export function initialScripts(html) {
  const files = [...html.matchAll(SCRIPT_TAG)].flatMap(([tag]) => {
    if (/\bnomodule\b/i.test(tag)) return [];
    const src = SRC.exec(tag)?.[1];
    return src ? [decodeURIComponent(src)] : [];
  });
  return [...new Set(files)];
}

export function measurePage(html, staticDir) {
  const files = initialScripts(html);
  let gzipBytes = 0;
  const threeFiles = [];
  for (const file of files) {
    const body = readFileSync(join(staticDir, file));
    gzipBytes += gzipSync(body).length;
    if (body.includes("WebGLRenderer")) threeFiles.push(file);
  }
  return { files, gzipBytes, threeFiles };
}
```

And `scripts/bundles.d.mts`:

```ts
export declare const INITIAL_BUDGET_BYTES: number;
export declare function initialScripts(html: string): string[];
export declare function measurePage(
  html: string,
  staticDir: string
): { files: string[]; gzipBytes: number; threeFiles: string[] };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run scripts/bundles.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the CLI** `scripts/check-bundles.mjs`:

```js
// Fails when a home page's initial JS exceeds 150 KB gzip or pulls in
// three.js. Runs in CI right after `pnpm build`.
import { readFileSync } from "node:fs";
import { INITIAL_BUDGET_BYTES, measurePage } from "./bundles.mjs";

const PAGES = ["en", "vi"];
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const problems = [];

for (const page of PAGES) {
  const file = `.next/server/app/${page}.html`;
  let html;
  try {
    html = readFileSync(file, "utf8");
  } catch {
    console.error(`Cannot read ${file}; run \`pnpm build\` first.`);
    process.exit(1);
  }
  const { files, gzipBytes, threeFiles } = measurePage(html, ".next/static");
  console.log(`/${page}: ${kb(gzipBytes)} gzip initial JS in ${files.length} files`);
  if (files.length === 0) {
    problems.push(`/${page}: no initial scripts found; did the HTML format change?`);
  }
  if (gzipBytes > INITIAL_BUDGET_BYTES) {
    problems.push(`/${page}: ${kb(gzipBytes)} > ${kb(INITIAL_BUDGET_BYTES)}`);
  }
  for (const three of threeFiles) {
    problems.push(`/${page}: initial chunk ${three} contains three.js`);
  }
}

if (problems.length > 0) {
  console.error(`Bundle budget failed:\n${problems.join("\n")}`);
  process.exit(1);
}
console.log("Initial JS within budget; no three.js in initial chunks.");
```

Add to `package.json` `scripts`, right after `"check:claims"`:

```json
"check:bundles": "node scripts/check-bundles.mjs",
```

- [ ] **Step 6: Run it against a real build**

Run: `pnpm build && pnpm check:bundles`
Expected: `/en: ~142 KB gzip initial JS in 8 files`, the same for `/vi`, then the success line. The number must match the `initial:` figure `hero-3d.spec.ts` prints, to within 0.5 KB. If it doesn't, the script is counting the wrong set; fix it before continuing.

- [ ] **Step 7: Lint, typecheck, test, commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add scripts/bundles.mjs scripts/bundles.d.mts scripts/bundles.test.ts scripts/check-bundles.mjs package.json
git commit -m "feat(ci): check-bundles script for the initial JS budget and no three.js

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Analytics core (pure units)

**Files:**
- Create: `src/shared/analytics/events.ts`, `track.ts`, `config.ts`, `tracking-script.ts`
- Test: `src/shared/analytics/events.test.ts`, `track.test.ts`, `config.test.ts`, `tracking-script.test.ts`

**Interfaces:**
- Consumes: `getSiteUrl(env)` from `@/shared/seo/site-url`; `LinkKey` from `@/shared/content/links`; `Locale` from `@/shared/i18n/routing`.
- Produces:
  - `type OutboundTarget = "linkedin" | "github" | "repo" | "appStore" | "live" | "demo" | "source"`
  - `interface AnalyticsEvents { cta_view_work: undefined; cv_download: { location: "hero" | "contact" }; email_copy: undefined; case_study_open: { slug: string }; outbound_click: { target: OutboundTarget }; avatar_wave_click: undefined; locale_switch: { to: Locale } }`
  - `type AnalyticsEvent = keyof AnalyticsEvents`
  - `type EventArgs<N>`: `[]` for prop-less events, else `[props]`
  - `type TrackAttrs = { "data-track": AnalyticsEvent } & Record<\`data-track-${string}\`, string>`
  - `trackAttrs<N>(name: N, ...args: EventArgs<N>): TrackAttrs`
  - `linkTarget: Record<LinkKey, OutboundTarget>` (`github` → `source`)
  - `track<N>(name: N, ...args: EventArgs<N>): void` (in `track.ts`)
  - `UMAMI_SCRIPT_SRC = "https://cloud.umami.is/script.js"`, `DISABLED_DOMAIN = "tracking-disabled.invalid"`
  - `umamiConfig(env?): { websiteId: string; domains: string } | null`
  - `speedInsightsEnabled(env?): boolean`
  - `trackingScript: string`

- [ ] **Step 1: Write the failing tests.**

`src/shared/analytics/events.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { linkTarget, trackAttrs } from "./events";

describe("trackAttrs", () => {
  it("marks a prop-less event", () => {
    expect(trackAttrs("cta_view_work")).toEqual({
      "data-track": "cta_view_work"
    });
  });

  it("adds one data-track-<key> attribute per prop", () => {
    expect(trackAttrs("cv_download", { location: "hero" })).toEqual({
      "data-track": "cv_download",
      "data-track-location": "hero"
    });
    expect(trackAttrs("outbound_click", { target: "appStore" })).toEqual({
      "data-track": "outbound_click",
      "data-track-target": "appStore"
    });
  });
});

describe("linkTarget", () => {
  it("names a case study's source link apart from the GitHub profile", () => {
    expect(linkTarget).toEqual({
      appStore: "appStore",
      live: "live",
      github: "source",
      demo: "demo"
    });
  });
});
```

`src/shared/analytics/track.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { track } from "./track";

describe("track", () => {
  afterEach(() => {
    delete window.umami;
  });

  it("forwards to umami.track", () => {
    const spy = vi.fn();
    window.umami = { track: spy };
    track("avatar_wave_click");
    track("locale_switch", { to: "vi" });
    expect(spy).toHaveBeenNthCalledWith(1, "avatar_wave_click");
    expect(spy).toHaveBeenNthCalledWith(2, "locale_switch", { to: "vi" });
  });

  it("does nothing when Umami is missing or blocked", () => {
    expect(() => track("avatar_wave_click")).not.toThrow();
  });

  it("swallows errors thrown by Umami", () => {
    window.umami = {
      track: () => {
        throw new Error("blocked");
      }
    };
    expect(() => track("avatar_wave_click")).not.toThrow();
  });
});
```

`src/shared/analytics/config.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DISABLED_DOMAIN, speedInsightsEnabled, umamiConfig } from "./config";

const SITE = "https://portfolio-zeta-cyan-13.vercel.app";

describe("umamiConfig", () => {
  it("is off without a website id", () => {
    expect(umamiConfig({ VERCEL_ENV: "production", NEXT_PUBLIC_SITE_URL: SITE })).toBeNull();
  });

  it("tracks only the production host on a Vercel production build", () => {
    expect(
      umamiConfig({
        NEXT_PUBLIC_UMAMI_ID: "abc",
        VERCEL_ENV: "production",
        NEXT_PUBLIC_SITE_URL: SITE
      })
    ).toEqual({ websiteId: "abc", domains: "portfolio-zeta-cyan-13.vercel.app" });
  });

  it("never matches a preview host, even though getSiteUrl falls back to it", () => {
    expect(
      umamiConfig({
        NEXT_PUBLIC_UMAMI_ID: "abc",
        VERCEL_ENV: "preview",
        VERCEL_URL: "portfolio-git-x.vercel.app"
      })
    ).toEqual({ websiteId: "abc", domains: DISABLED_DOMAIN });
  });

  it("never matches in CI or locally", () => {
    expect(umamiConfig({ NEXT_PUBLIC_UMAMI_ID: "ci-dummy" })).toEqual({
      websiteId: "ci-dummy",
      domains: DISABLED_DOMAIN
    });
  });
});

describe("speedInsightsEnabled", () => {
  it("is on only for builds running on Vercel", () => {
    expect(speedInsightsEnabled({ VERCEL: "1" })).toBe(true);
    expect(speedInsightsEnabled({})).toBe(false);
  });
});
```

`src/shared/analytics/tracking-script.test.ts`:

```ts
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { trackingScript } from "./tracking-script";

function click(el: Element) {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return event;
}

describe("trackingScript", () => {
  // The listener lives on document, so install it once.
  beforeAll(() => {
    new Function(trackingScript)();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    delete window.umami;
  });

  it("sends a click inside a data-track element with its props", () => {
    const spy = vi.fn();
    window.umami = { track: spy };
    document.body.innerHTML =
      '<a href="#cv" data-track="cv_download" data-track-location="hero"><span>CV</span></a>';
    click(document.querySelector("span")!);
    expect(spy).toHaveBeenCalledWith("cv_download", { location: "hero" });
  });

  it("sends a prop-less event with the name only", () => {
    const spy = vi.fn();
    window.umami = { track: spy };
    document.body.innerHTML = '<a href="#work" data-track="cta_view_work">Work</a>';
    click(document.querySelector("a")!);
    expect(spy).toHaveBeenCalledWith("cta_view_work");
    expect(spy.mock.calls[0]).toHaveLength(1);
  });

  it("ignores clicks outside data-track elements", () => {
    const spy = vi.fn();
    window.umami = { track: spy };
    document.body.innerHTML = '<a href="#x">Plain</a>';
    click(document.querySelector("a")!);
    expect(spy).not.toHaveBeenCalled();
  });

  it("never cancels the click", () => {
    window.umami = { track: vi.fn() };
    document.body.innerHTML =
      '<a href="/cv.pdf" download data-track="cv_download" data-track-location="hero">CV</a>';
    expect(click(document.querySelector("a")!).defaultPrevented).toBe(false);
  });

  it("does nothing without Umami and survives a throwing track", () => {
    document.body.innerHTML = '<button data-track="email_copy">Copy</button>';
    expect(() => click(document.querySelector("button")!)).not.toThrow();
    window.umami = {
      track: () => {
        throw new Error("blocked");
      }
    };
    expect(() => click(document.querySelector("button")!)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm exec vitest run src/shared/analytics`
Expected: FAIL, unresolved imports `./events`, `./track`, `./config`, `./tracking-script`.

- [ ] **Step 3: Implement.**

`src/shared/analytics/events.ts`:

```ts
import type { LinkKey } from "@/shared/content/links";
import type { Locale } from "@/shared/i18n/routing";

// Umami events (Phase 6 §6.3.2). Names and props are data, not copy.
export type OutboundTarget =
  | "linkedin"
  | "github"
  | "repo"
  | "appStore"
  | "live"
  | "demo"
  | "source";

export interface AnalyticsEvents {
  cta_view_work: undefined;
  cv_download: { location: "hero" | "contact" };
  email_copy: undefined;
  case_study_open: { slug: string };
  outbound_click: { target: OutboundTarget };
  avatar_wave_click: undefined;
  locale_switch: { to: Locale };
}

export type AnalyticsEvent = keyof AnalyticsEvents;

export type EventArgs<N extends AnalyticsEvent> =
  AnalyticsEvents[N] extends undefined ? [] : [props: AnalyticsEvents[N]];

export type TrackAttrs = { "data-track": AnalyticsEvent } & Record<
  `data-track-${string}`,
  string
>;

// Marks an element for the click listener in tracking-script.ts, the way
// motion() marks it for an effect. Prop keys must be lowercase: HTML
// attribute names are case-insensitive.
export function trackAttrs<N extends AnalyticsEvent>(
  name: N,
  ...args: EventArgs<N>
): TrackAttrs {
  const attrs: Record<string, string> = { "data-track": name };
  const props = (args[0] ?? {}) as Record<string, string>;
  for (const [key, value] of Object.entries(props)) {
    attrs[`data-track-${key}`] = value;
  }
  return attrs as TrackAttrs;
}

// A case study's `github` link is its source, not the GitHub profile.
export const linkTarget: Record<LinkKey, OutboundTarget> = {
  appStore: "appStore",
  live: "live",
  github: "source",
  demo: "demo"
};
```

`src/shared/analytics/track.ts`:

```ts
import type { AnalyticsEvent, EventArgs } from "./events";

declare global {
  interface Window {
    umami?: { track(name: string, data?: Record<string, string>): unknown };
  }
}

// For events with no DOM element to mark (the canvas avatar). Its own file
// so the about-avatar chunk shares no module with the initial bundle.
export function track<N extends AnalyticsEvent>(
  name: N,
  ...args: EventArgs<N>
): void {
  try {
    const props = args[0] as Record<string, string> | undefined;
    if (props) window.umami?.track(name, props);
    else window.umami?.track(name);
  } catch {
    // Analytics must never break the page.
  }
}
```

`src/shared/analytics/config.ts`:

```ts
import { getSiteUrl } from "@/shared/seo/site-url";

type Env = Record<string, string | undefined>;

export const UMAMI_SCRIPT_SRC = "https://cloud.umami.is/script.js";
// Never a real host: the script loads (so CSP and e2e see production
// markup) but Umami's data-domains check stops it from sending.
export const DISABLED_DOMAIN = "tracking-disabled.invalid";

// Umami sends only from the Vercel production build. getSiteUrl() falls
// back to the preview host or localhost elsewhere, so it can't decide this
// on its own.
export function umamiConfig(
  env: Env = process.env
): { websiteId: string; domains: string } | null {
  const websiteId = env.NEXT_PUBLIC_UMAMI_ID;
  if (!websiteId) return null;
  const domains =
    env.VERCEL_ENV === "production"
      ? new URL(getSiteUrl(env)).hostname
      : DISABLED_DOMAIN;
  return { websiteId, domains };
}

// Off Vercel the Speed Insights script URL (/_vercel/speed-insights/*)
// 404s, which logs a console error under `pnpm start` (e2e, local LHCI).
export function speedInsightsEnabled(env: Env = process.env): boolean {
  return env.VERCEL === "1";
}
```

`src/shared/analytics/tracking-script.ts`:

```ts
// Inlined at the end of <body> when Umami is on. One capture-phase listener
// sends clicks on [data-track] elements (see trackAttrs) to Umami. Unlike
// Umami's own data-umami-event handling it never cancels the click, so CV
// downloads, client-side navigation and Lenis anchors behave as without
// analytics. Umami's fetch uses keepalive, so a following page load doesn't
// drop the event.
export const trackingScript = `(function(){document.addEventListener("click",function(e){var t=e.target;var el=t&&t.closest?t.closest("[data-track]"):null;if(!el)return;var u=window.umami;if(!u||typeof u.track!=="function")return;var props={},n=0,a=el.attributes;for(var i=0;i<a.length;i++){var k=a[i].name;if(k.indexOf("data-track-")===0){props[k.slice(11)]=a[i].value;n++}}var name=el.getAttribute("data-track");try{if(n)u.track(name,props);else u.track(name)}catch(err){}},true)})()`;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/shared/analytics`
Expected: PASS (4 files).

- [ ] **Step 5: Lint, typecheck, test, commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add src/shared/analytics
git commit -m "feat(analytics): typed events, guarded track, Umami config and click listener

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Load Umami and Speed Insights in the layout

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml` (dependency), `src/app/[locale]/layout.tsx`, `playwright.config.ts` (webServer env only)
- Test: `e2e/analytics.spec.ts` (create, first tests)

**Interfaces:**
- Consumes: `umamiConfig`, `speedInsightsEnabled`, `UMAMI_SCRIPT_SRC` (`config.ts`), `trackingScript` (Task 3).
- Produces: production HTML carrying `<script src="https://cloud.umami.is/script.js" data-website-id data-domains data-do-not-track>` and the listener whenever `NEXT_PUBLIC_UMAMI_ID` is set at build time. Playwright builds with `NEXT_PUBLIC_UMAMI_ID=ci-dummy` unless the variable is already set.

- [ ] **Step 1: Install Speed Insights**

Run: `pnpm add @vercel/speed-insights`
Then check the component's import path and props: `ls node_modules/@vercel/speed-insights/dist/next` and read its `index.d.ts`. The plan assumes `import { SpeedInsights } from "@vercel/speed-insights/next"` with no required props. If 2.x differs, follow its README.

- [ ] **Step 2: Make Playwright builds carry a dummy Umami id.** In `playwright.config.ts`, add `env` to `webServer` (keep everything else for now; Task 7 rewrites the file):

```ts
  webServer: {
    command: process.env.CI ? "pnpm start" : "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Builds the Umami markup e2e checks; data-domains never matches
    // outside a Vercel production build, so nothing is sent.
    env: { NEXT_PUBLIC_UMAMI_ID: process.env.NEXT_PUBLIC_UMAMI_ID ?? "ci-dummy" }
  },
```

- [ ] **Step 3: Write the failing e2e test** at `e2e/analytics.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("the Umami script is production-shaped and never targets this host", async ({
  page
}) => {
  await page.goto("/en");
  const script = page.locator('script[src="https://cloud.umami.is/script.js"]');
  await expect(script).toHaveCount(1);
  await expect(script).toHaveAttribute("data-website-id", /.+/);
  await expect(script).toHaveAttribute("data-domains", "tracking-disabled.invalid");
  await expect(script).toHaveAttribute("data-do-not-track", "true");
});

test("Speed Insights is not loaded off Vercel", async ({ page }) => {
  const vercel: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/_vercel/")) {
      vercel.push(request.url());
    }
  });
  await page.goto("/en");
  await page.waitForLoadState("networkidle");
  expect(vercel).toEqual([]);
});
```

- [ ] **Step 4: Run it to verify the first test fails**

Run: `pnpm exec playwright test e2e/analytics.spec.ts --project=chromium`
Expected: the first test FAILS (count 0), and the second passes (nothing renders Speed Insights yet).

- [ ] **Step 5: Implement in `src/app/[locale]/layout.tsx`.** Add these imports:

```tsx
import {
  UMAMI_SCRIPT_SRC,
  speedInsightsEnabled,
  umamiConfig
} from "@/shared/analytics/config";
import { trackingScript } from "@/shared/analytics/tracking-script";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
```

In `LocaleLayout`, after the `notFound()` guard:

```tsx
  const umami = umamiConfig();
```

and replace the `<body>` children so that the close of `NextIntlClientProvider` is followed by:

```tsx
        </NextIntlClientProvider>
        {umami ? (
          <>
            <Script
              src={UMAMI_SCRIPT_SRC}
              strategy="afterInteractive"
              data-website-id={umami.websiteId}
              data-domains={umami.domains}
              data-do-not-track="true"
            />
            <script dangerouslySetInnerHTML={{ __html: trackingScript }} />
          </>
        ) : null}
        {speedInsightsEnabled() ? <SpeedInsights /> : null}
      </body>
```

- [ ] **Step 6: Run the e2e again**

Run: `pnpm exec playwright test e2e/analytics.spec.ts --project=chromium`
Expected: PASS (2 tests). The webServer rebuilds locally with `ci-dummy`. If a server is already running on port 3000, stop it first: `reuseExistingServer` would reuse a build without the id.

- [ ] **Step 7: Re-measure the budgets.**
  - Run `NEXT_PUBLIC_UMAMI_ID=ci-dummy pnpm build && pnpm check:bundles`. Expected: still about 142 KB; the listener is inline and Umami is cross-origin.
  - Measure Speed Insights' share once, as it would ship on Vercel: `VERCEL=1 NEXT_PUBLIC_UMAMI_ID=ci-dummy pnpm build && pnpm check:bundles`. Record the delta for the README and the PR. It must stay ≤ 150 KB; if it doesn't, stop and tell Dat.
  - Rebuild without `VERCEL=1` afterwards (`pnpm build`), so later local runs don't 404 on `/_vercel/`.

- [ ] **Step 8: Run the existing console-clean and Lighthouse checks.** Umami now loads in every e2e page:

  Run: `pnpm exec playwright test e2e/hero-3d.spec.ts e2e/about-avatar.spec.ts e2e/motion.spec.ts --project=chromium && pnpm lhci`
  Expected: all pass, Best Practices = 1.

  If `collectConsoleProblems` reports something from `cloud.umami.is`, fix the cause. Don't add the message to `IGNORED` unless it is truly third-party noise; if it is, add it with a comment naming it.

- [ ] **Step 9: Lint, typecheck, test, commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add package.json pnpm-lock.yaml "src/app/[locale]/layout.tsx" playwright.config.ts e2e/analytics.spec.ts
git commit -m "feat(analytics): load Umami (production-only sending) and Speed Insights on Vercel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Event wiring + analytics e2e

**Files:**
- Create: `e2e/helpers/umami.ts`
- Modify: `src/features/hero/HeroSection.tsx`, `src/features/contact/ContactSection.tsx`, `src/features/contact/CopyEmailButton.tsx`, `src/features/work/WorkChapter.tsx`, `src/features/work/WorkSection.tsx`, `src/app/[locale]/work/[slug]/page.tsx`, `src/shared/ui/ExternalLinks.tsx`, `src/features/layout/SiteFooter.tsx`, `src/features/layout/LocaleSwitcher.tsx`, `src/features/about/avatar/AvatarHitProxy.tsx`
- Test: `e2e/analytics.spec.ts`, `e2e/about-avatar.spec.ts`

**Interfaces:**
- Consumes: `trackAttrs`, `linkTarget`, `TrackAttrs` (`events.ts`); `track` (`track.ts`); `LinkKey` (`@/shared/content/links`).
- Produces:
  - `ExternalLink` gains `kind?: LinkKey`.
  - `CopyEmailButton` gains `trackAttrs?: TrackAttrs`.
  - e2e helpers: `stubUmami(context)`, `umamiCalls(page)`, `waitForUmami(page)`, `type UmamiCall`.

- [ ] **Step 1: Write the e2e helper** `e2e/helpers/umami.ts`:

```ts
import type { BrowserContext, Page } from "@playwright/test";

export const UMAMI_SCRIPT = "https://cloud.umami.is/script.js";

// Stands in for Umami: records track() calls in sessionStorage, so calls
// made right before a same-tab navigation (locale switch) survive it.
const STUB = `(function(){var KEY="__umamiCalls";window.umami={track:function(name,data){var calls=JSON.parse(sessionStorage.getItem(KEY)||"[]");calls.push([name,data===undefined?null:data]);sessionStorage.setItem(KEY,JSON.stringify(calls))}}})()`;

export type UmamiCall = [name: string, data: Record<string, string> | null];

export async function stubUmami(context: BrowserContext) {
  await context.route(UMAMI_SCRIPT, (route) =>
    route.fulfill({ contentType: "application/javascript", body: STUB })
  );
}

// Umami loads on the first input (scroll, pointermove, keydown,
// touchstart); a synthetic scroll on window triggers it in every engine.
export async function waitForUmami(page: Page) {
  await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
  await page.waitForFunction(
    () => typeof (window as { umami?: { track?: unknown } }).umami?.track === "function"
  );
}

export function umamiCalls(page: Page): Promise<UmamiCall[]> {
  return page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("__umamiCalls") ?? "[]")
  );
}
```

- [ ] **Step 2: Write the failing event tests.** Append to `e2e/analytics.spec.ts`. Update the import line to:

```ts
import { expect, test, type Page } from "@playwright/test";
import { stubUmami, umamiCalls, waitForUmami, UMAMI_SCRIPT } from "./helpers/umami";
```

Then add:

```ts
const EXTERNAL = /linkedin\.com|github\.com|apps\.shopify\.com|youtu\.be/;

test.describe("events", () => {
  test.beforeEach(async ({ context }) => {
    await stubUmami(context);
    // Outbound links open in new tabs; never hit the real sites.
    await context.route(EXTERNAL, (route) =>
      route.fulfill({ contentType: "text/html", body: "<title>stub</title>" })
    );
  });

  async function home(page: Page, path = "/en") {
    await page.goto(path);
    await waitForUmami(page);
  }

  test("View work: cta_view_work, and it still scrolls to Work", async ({ page }) => {
    await home(page);
    await page.locator('#top a[data-track="cta_view_work"]').click();
    await expect(page.locator("#work")).toBeInViewport();
    expect(await umamiCalls(page)).toContainEqual(["cta_view_work", null]);
  });

  for (const location of ["hero", "contact"] as const) {
    test(`${location} CV: cv_download and the file still downloads`, async ({ page }) => {
      await home(page);
      const link = page.locator(
        `a[data-track="cv_download"][data-track-location="${location}"]`
      );
      const download = page.waitForEvent("download");
      await link.click();
      expect((await download).suggestedFilename()).toBe("cv.pdf");
      expect(await umamiCalls(page)).toContainEqual(["cv_download", { location }]);
    });
  }

  test("copy email: email_copy", async ({ page }) => {
    await home(page);
    await page.locator('button[data-track="email_copy"]').click();
    expect(await umamiCalls(page)).toContainEqual(["email_copy", null]);
  });

  test("case study link: case_study_open, navigating client-side", async ({ page }) => {
    await home(page);
    await page.evaluate(() => {
      (window as { __noReload?: boolean }).__noReload = true;
    });
    await page
      .locator('a[data-track="case_study_open"][data-track-slug="swift-performance"]')
      .click();
    await expect(page).toHaveURL(/\/en\/work\/swift-performance$/);
    expect(
      await page.evaluate(() => (window as { __noReload?: boolean }).__noReload)
    ).toBe(true);
    expect(await umamiCalls(page)).toContainEqual([
      "case_study_open",
      { slug: "swift-performance" }
    ]);
  });

  for (const target of ["linkedin", "github", "repo"] as const) {
    test(`${target} link: outbound_click`, async ({ page }) => {
      await home(page);
      const link = page.locator(
        `a[data-track="outbound_click"][data-track-target="${target}"]`
      );
      await expect(link).toHaveCount(1);
      if ((await link.getAttribute("target")) === "_blank") {
        const popup = page.waitForEvent("popup");
        await link.click();
        await (await popup).close();
      } else {
        await link.click();
        await page.waitForURL(EXTERNAL);
        await page.goBack();
      }
      expect(await umamiCalls(page)).toContainEqual(["outbound_click", { target }]);
    });
  }

  test("case study links carry their kind; App Store sends outbound_click", async ({
    page
  }) => {
    await home(page, "/en/work/safebulk-bulk-editor");
    const header = page.locator("main");
    for (const target of ["appStore", "source", "demo"]) {
      await expect(
        header.locator(`a[data-track="outbound_click"][data-track-target="${target}"]`).first()
      ).toBeAttached();
    }
    const popup = page.waitForEvent("popup");
    await header
      .locator('a[data-track="outbound_click"][data-track-target="appStore"]')
      .first()
      .click();
    await (await popup).close();
    expect(await umamiCalls(page)).toContainEqual([
      "outbound_click",
      { target: "appStore" }
    ]);
  });

  test("locale switch: locale_switch survives the page load", async ({ page }) => {
    await home(page);
    const nav = page.getByRole("navigation", { name: "Language" });
    await expect(nav.locator('a[aria-current="true"]')).not.toHaveAttribute(
      "data-track",
      /.*/
    );
    await nav.locator('a[data-track="locale_switch"][data-track-to="vi"]').click();
    await expect(page).toHaveURL(/\/vi$/);
    expect(await umamiCalls(page)).toContainEqual(["locale_switch", { to: "vi" }]);
  });
});

test("with Umami blocked, tracked controls still work and nothing throws", async ({
  page,
  context
}) => {
  await context.route(UMAMI_SCRIPT, (route) => route.abort());
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/en");
  await page.waitForLoadState("networkidle");
  const download = page.waitForEvent("download");
  await page.locator('a[data-track="cv_download"][data-track-location="hero"]').click();
  await download;
  await page.locator('button[data-track="email_copy"]').click();
  expect(errors).toEqual([]);
});

test("no cookies are set", async ({ page, context }) => {
  await stubUmami(context);
  await page.goto("/en");
  await waitForUmami(page);
  await page.locator('button[data-track="email_copy"]').click();
  await page.goto("/en/work/swift-performance");
  expect(await context.cookies()).toEqual([]);
});
```

On mobile projects the header language nav may sit behind the menu button. If `nav` isn't visible in Task 7's mobile runs, open the menu first, the way `layout.spec.ts` "mobile" does.

- [ ] **Step 3: Run them to verify they fail**

Run: `pnpm exec playwright test e2e/analytics.spec.ts --project=chromium`
Expected: the event tests FAIL (no `data-track` elements yet). The two Task 4 tests, "blocked" and "no cookies", fail on the missing locators too.

- [ ] **Step 4: Wire the events.**

`src/features/hero/HeroSection.tsx`: add `import { trackAttrs } from "@/shared/analytics/events";`, then:

```tsx
            <ButtonLink href="#work" {...magnetic()} {...trackAttrs("cta_view_work")}>
              {t("ctaWork")}
            </ButtonLink>
            <ButtonLink
              href={site.cv}
              download
              variant="secondary"
              {...magnetic()}
              {...trackAttrs("cv_download", { location: "hero" })}
            >
```

`src/features/contact/ContactSection.tsx`: add the same import, then add:
- `{...trackAttrs("outbound_click", { target: "linkedin" })}` to the LinkedIn `ButtonLink`
- `{...trackAttrs("outbound_click", { target: "github" })}` to the GitHub one
- `{...trackAttrs("cv_download", { location: "contact" })}` to the CV one
- `trackAttrs={trackAttrs("email_copy")}` to `<CopyEmailButton … />`

`src/features/contact/CopyEmailButton.tsx`: add `import type { TrackAttrs } from "@/shared/analytics/events";`, add `trackAttrs` to the props (`trackAttrs?: TrackAttrs;` in the type, destructured), and render `<button type="button" onClick={copy} className={className} {...trackAttrs}>`.

`src/shared/ui/ExternalLinks.tsx`: import `trackAttrs`, `linkTarget` from `@/shared/analytics/events` and `type LinkKey` from `@/shared/content/links`. Extend the interface:

```ts
export interface ExternalLink {
  href: string;
  label: string;
  // The frontmatter link key; tags the click for analytics.
  kind?: LinkKey;
}
```

and in the map: `{links.map(({ href, label, kind }) => (` with the `<a>` gaining `{...(kind ? trackAttrs("outbound_click", { target: linkTarget[kind] }) : {})}`.

`src/features/work/WorkSection.tsx` and `src/app/[locale]/work/[slug]/page.tsx`: in both `pickLinks(...).map(({ key, href }) => ({ href, label: tLinks(key) }))`, add `kind: key`.

`src/features/work/WorkChapter.tsx`: import `trackAttrs`; on the "Read" `<Link>` add `{...trackAttrs("case_study_open", { slug })}`.

`src/features/layout/SiteFooter.tsx`: import `trackAttrs`; on the repo `<a>` add `{...trackAttrs("outbound_click", { target: "repo" })}`.

`src/features/layout/LocaleSwitcher.tsx`: import `trackAttrs`; on the `<a>` add `{...(locale === current ? {} : trackAttrs("locale_switch", { to: locale }))}`.

`src/features/about/avatar/AvatarHitProxy.tsx`: add `import { track } from "@/shared/analytics/track";`, then change the click handler to:

```tsx
      onClick={(event) => {
        event.stopPropagation();
        if (!active()) return;
        track("avatar_wave_click");
        onWave();
      }}
```

- [ ] **Step 5: Add the avatar assertion** to `e2e/about-avatar.spec.ts`. Add the import `import { stubUmami, umamiCalls } from "./helpers/umami";`. In the test "hover sets the avatar cursor; a click in idle waves again", add as its first line `await stubUmami(page.context());`, and as its last line:

```ts
    expect(await umamiCalls(page)).toContainEqual(["avatar_wave_click", null]);
```

- [ ] **Step 6: Run the e2e to verify it passes**

Run: `pnpm exec playwright test e2e/analytics.spec.ts e2e/about-avatar.spec.ts e2e/layout.spec.ts e2e/home.spec.ts e2e/work.spec.ts --project=chromium`
Expected: all PASS, including the `about-avatar` chunk budget test. Its printed size may rise by tens of bytes; it must stay ≤ 26 KB. If it goes over, stop and report the number. Don't raise the cap.

- [ ] **Step 7: Check budgets and dev.** Run `pnpm build && pnpm check:bundles` (still ≤ 150 KB). Then use `pnpm dev`: click the Hero CV link in a browser, and confirm the PDF downloads and no console error appears.

- [ ] **Step 8: Lint, typecheck, test, commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add src e2e/helpers/umami.ts e2e/analytics.spec.ts e2e/about-avatar.spec.ts
git commit -m "feat(analytics): wire the seven Umami events without cancelling clicks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Security e2e

**Files:**
- Create: `e2e/helpers/csp.ts`, `e2e/security.spec.ts`
- Modify: `e2e/about-avatar.spec.ts`

**Interfaces:**
- Consumes: `stubUmami`, `waitForUmami` (Task 5); `securityHeaders` behaviour (Task 1).
- Produces: `watchCsp(page)`, `cspViolations(page)`, `thirdPartyHosts(page, baseURL)` in `e2e/helpers/csp.ts`.

- [ ] **Step 1: Write the helper** `e2e/helpers/csp.ts`:

```ts
import type { Page } from "@playwright/test";

// securitypolicyviolation fires in every engine; console wording does not.
const COLLECT = `window.__csp=[];document.addEventListener("securitypolicyviolation",function(e){window.__csp.push(e.violatedDirective+" "+e.blockedURI)})`;

export async function watchCsp(page: Page) {
  await page.addInitScript(COLLECT);
}

export function cspViolations(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as { __csp?: string[] }).__csp ?? []);
}

// Hosts other than the page's own that the page requested, for the CSP
// host review on a real deployment.
export function thirdPartyHosts(page: Page, baseURL: string): () => string[] {
  const own = new URL(baseURL).host;
  const hosts = new Set<string>();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith("http") && url.host !== own) hosts.add(url.host);
  });
  return () => [...hosts].sort();
}
```

- [ ] **Step 2: Write the spec** `e2e/security.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { cspViolations, thirdPartyHosts, watchCsp } from "./helpers/csp";
import { stubUmami, waitForUmami } from "./helpers/umami";

const remote = Boolean(process.env.PLAYWRIGHT_BASE_URL);

test("every page sends the security headers", async ({ page }) => {
  const response = await page.goto("/en");
  const headers = response!.headers();
  const csp = headers["content-security-policy"] ?? "";
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("'wasm-unsafe-eval'");
  expect(csp).not.toContain("'unsafe-eval'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toBe(
    "camera=(), microphone=(), geolocation=()"
  );
  expect(headers["x-frame-options"]).toBe("DENY");
  // Locally the build is "preview": no HSTS, no upgrade-insecure-requests.
  // Vercel adds its own HSTS on *.vercel.app, so skip that check remotely.
  if (!remote) {
    expect(headers["strict-transport-security"]).toBeUndefined();
    expect(csp).not.toContain("upgrade-insecure-requests");
  }
});

for (const path of [
  "/en",
  "/vi",
  "/en/work/swift-performance",
  "/vi/work/safebulk-bulk-editor"
]) {
  test(`${path} has no CSP violations`, async ({ page, context, baseURL }) => {
    if (!remote) await stubUmami(context);
    await watchCsp(page);
    const hosts = thirdPartyHosts(page, baseURL!);
    await page.goto(path);
    await waitForUmami(page);
    // First interaction loads the motion chunk; then walk the page so
    // lazy images and effects run.
    await page.mouse.move(200, 200);
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    });
    await page.waitForLoadState("networkidle");
    console.log(`${path} third-party hosts: ${hosts().join(", ") || "none"}`);
    expect(await cspViolations(page)).toEqual([]);
  });
}
```

- [ ] **Step 3: Add the post-avatar check** to `e2e/about-avatar.spec.ts`. Add the import `import { cspViolations, watchCsp } from "./helpers/csp";`, then add inside `test.describe("About avatar on desktop", …)`:

```ts
  test("no CSP violations once the avatar (meshopt WASM) has loaded", async ({
    page
  }) => {
    await watchCsp(page);
    const glb = trackGlb(page);
    await page.goto("/en");
    await heroLive(page);
    await scrollSlotTo(page, 1.2);
    await scrollSlotTo(page, 0.15);
    await expect(slot(page)).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    expect(glb).toHaveLength(1);
    expect(await cspViolations(page)).toEqual([]);
  });
```

- [ ] **Step 4: Run them**

Run: `pnpm exec playwright test e2e/security.spec.ts e2e/about-avatar.spec.ts --project=chromium`
Expected: PASS. The security tests were written against Task 1's existing behaviour, so they should pass straight away.

Prove the violation check can fail: temporarily change `"'wasm-unsafe-eval'"` to `"'self'"` in `headers.ts`, rebuild, and run only the avatar CSP test. Expected: FAIL with a `script-src` violation, or the avatar falls back and `idle` is never reached. Revert the change and rebuild.

- [ ] **Step 5: Lint, typecheck, test, commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add e2e/helpers/csp.ts e2e/security.spec.ts e2e/about-avatar.spec.ts
git commit -m "test(security): headers present, no CSP violations incl. after the avatar loads

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Playwright browser matrix

**Files:**
- Modify: `playwright.config.ts`; any `e2e/*.spec.ts` that needs tags or cross-browser fixes; product files when a failure is a real bug

**Interfaces:**
- Consumes: the webServer `env` from Task 4.
- Produces:
  - Project names (CI and the required checks use these exact names): `chromium`, `chromium-no-webgl`, `firefox`, `webkit`, `iphone-13`, `pixel-7`, `chromium-reduced-motion`.
  - Tags: `@webgl`, `@motion`, `@desktop`.
  - `PLAYWRIGHT_BASE_URL` support.

- [ ] **Step 1: Rewrite `playwright.config.ts`:**

```ts
import { defineConfig, devices } from "@playwright/test";

// WebGL specs run on desktop Chromium only (SwiftShader); the no-WebGL spec
// has its own project.
const WEBGL_SPECS =
  /\/(hero-3d|hero-3d-visual|about-avatar|about-avatar-visual)\.spec\.ts$/;
const NO_WEBGL_SPEC = /hero-3d-no-webgl\.spec\.ts$/;
const NOT_WEBGL = [WEBGL_SPECS, NO_WEBGL_SPEC];

// Optional: run against a deployment (e.g. a Vercel preview) instead of a
// local build. The bypass header goes with every request, third-party
// included; the secret only opens previews of a public site.
const remote = process.env.PLAYWRIGHT_BASE_URL;
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

const swiftshader = {
  // Headless Chromium no longer falls back to software WebGL on its own.
  launchOptions: {
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
  }
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: remote ?? "http://localhost:3000",
    ...(remote && bypass
      ? { extraHTTPHeaders: { "x-vercel-protection-bypass": bypass } }
      : {})
  },
  webServer: remote
    ? undefined
    : {
        command: process.env.CI ? "pnpm start" : "pnpm build && pnpm start",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        // Builds the Umami markup e2e checks; data-domains never matches
        // outside a Vercel production build, so nothing is sent.
        env: {
          NEXT_PUBLIC_UMAMI_ID: process.env.NEXT_PUBLIC_UMAMI_ID ?? "ci-dummy"
        }
      },
  projects: [
    {
      name: "chromium",
      testIgnore: NO_WEBGL_SPEC,
      use: { ...devices["Desktop Chrome"], ...swiftshader }
    },
    {
      name: "chromium-no-webgl",
      testMatch: NO_WEBGL_SPEC,
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { args: ["--disable-webgl", "--disable-3d-apis"] }
      }
    },
    {
      name: "firefox",
      testIgnore: NOT_WEBGL,
      grepInvert: /@webgl/,
      use: devices["Desktop Firefox"]
    },
    {
      name: "webkit",
      testIgnore: NOT_WEBGL,
      grepInvert: /@webgl/,
      use: devices["Desktop Safari"]
    },
    {
      name: "iphone-13",
      testIgnore: NOT_WEBGL,
      grepInvert: /@webgl|@desktop/,
      use: devices["iPhone 13"]
    },
    {
      name: "pixel-7",
      testIgnore: NOT_WEBGL,
      grepInvert: /@webgl|@desktop/,
      use: devices["Pixel 7"]
    },
    {
      name: "chromium-reduced-motion",
      testIgnore: NOT_WEBGL,
      grepInvert: /@webgl|@motion/,
      use: { ...devices["Desktop Chrome"], reducedMotion: "reduce" }
    }
  ]
});
```

- [ ] **Step 2: Tag the motion budget test.** In `e2e/motion.spec.ts`, change the declaration to:

```ts
  test("the lazily loaded motion code stays under 70 KB gzip", { tag: "@webgl" }, async ({
```

(It waits for the Hero canvas to go `live`, which needs WebGL.)

- [ ] **Step 3: Install the browsers**

Run: `pnpm exec playwright install chromium firefox webkit`

- [ ] **Step 4: Run every new project and triage.** Build once (`pnpm build`), then run `pnpm exec playwright test --project=<p>` for `firefox`, `webkit`, `iphone-13`, `pixel-7` and `chromium-reduced-motion`, one at a time. Start one server and reuse it: `NEXT_PUBLIC_UMAMI_ID=ci-dummy pnpm build && pnpm start &`, then run the projects (`reuseExistingServer` picks it up locally).

  Classify every failure into exactly one bucket and act:
  1. **Desktop-only by design.** The test asserts the desktop header nav, hover, mouse wheel / Lenis momentum, pinned chapters, or a desktop viewport layout. Add `{ tag: "@desktop" }` to that `test(...)` or `test.describe(...)`.
  2. **Asserts animation.** The test needs smooth scroll, pins, the cursor, count-up or a drifting node in motion. Add `{ tag: "@motion" }`. Tests that already `test.use({ reducedMotion: "reduce" })` stay untagged.
  3. **Product bug in that browser or device.** Fix it in `src/` and keep the test. If the fix touches layout or motion, also run the `chromium` project and `pnpm lhci`.
  4. **Harness limitation**, for example:
     - WebKit's Tab key skips links by default: use `browserName === "webkit" ? "Alt+Tab" : "Tab"`.
     - Clipboard permissions are Chromium-only: `test.skip(browserName !== "chromium", "clipboard permission is Chromium-only in Playwright")`.

     Adapt the test, or skip it with a reason string. Never skip a product bug.

  Expected from reading the specs, to confirm by running: `motion.spec.ts` (smooth-scroll header links, pinned navigation, Lenis momentum, desktop-to-mobile resize, layout stability) → `@desktop` and/or `@motion`; `home.spec.ts` "the copy button puts the email on the clipboard" → bucket 4; `layout.spec.ts` "the header lists section links" → `@desktop`.

  Record each classification in the commit message body: one line per test.

- [ ] **Step 5: Verify the whole matrix**

Run: `pnpm exec playwright test` (all projects, with the local server from Step 4)
Expected: 0 failures across all 7 projects. Report the per-project pass/skip counts.

- [ ] **Step 6: Lint, typecheck, test, commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add playwright.config.ts e2e src
git commit -m "test(e2e): Chromium/Firefox/WebKit/iPhone/Pixel/reduced-motion matrix with tags

<one line per classified failure>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: CI workflows and Lighthouse assertions

**Files:**
- Modify: `.github/workflows/ci.yml`, `lighthouserc.json`
- Create: `.github/workflows/lighthouse-preview.yml`

**Interfaces:**
- Consumes: `pnpm check:bundles` (Task 2); Playwright project names (Task 7); secret `VERCEL_AUTOMATION_BYPASS_SECRET`.
- Produces the required check names: `checks`, `e2e (chromium)`, `e2e (chromium-no-webgl)`, `e2e (firefox)`, `e2e (webkit)`, `e2e (iphone-13)`, `e2e (pixel-7)`, `e2e (chromium-reduced-motion)`, `lhci`, `lighthouse-preview`.

- [ ] **Step 1: Tighten `lighthouserc.json`.**
  - Add `"http://localhost:3000/vi/work/safebulk-bulk-editor"` to `collect.url`.
  - Add to `assert.assertions`:

```json
        "largest-contentful-paint": [
          "error",
          { "maxNumericValue": 2500, "aggregationMethod": "median-run" }
        ],
        "total-blocking-time": [
          "error",
          { "maxNumericValue": 200, "aggregationMethod": "median-run" }
        ],
```

- [ ] **Step 2: Run local Lighthouse**

Run: `pnpm build && pnpm lhci`
Expected: all assertions pass on all 4 URLs. If LCP or TBT fails, fix the page; never loosen the value. If the fix isn't obvious, stop and report the measured numbers to Dat.

- [ ] **Step 3: Rewrite `.github/workflows/ci.yml`:**

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main, master]

env:
  # Builds the Umami markup e2e and Lighthouse see; data-domains never
  # matches outside a Vercel production build, so nothing is sent.
  NEXT_PUBLIC_UMAMI_ID: ci-dummy

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
      - run: pnpm check:claims
      - run: pnpm check:bundles
      - uses: actions/upload-artifact@v4
        with:
          name: next-build
          path: |
            .next
            !.next/cache
          include-hidden-files: true
          retention-days: 1

  e2e:
    name: e2e (${{ matrix.project }})
    needs: checks
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        include:
          - { project: chromium, browser: chromium }
          - { project: chromium-no-webgl, browser: chromium }
          - { project: firefox, browser: firefox }
          - { project: webkit, browser: webkit }
          - { project: iphone-13, browser: webkit }
          - { project: pixel-7, browser: chromium }
          - { project: chromium-reduced-motion, browser: chromium }
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: actions/download-artifact@v4
        with:
          name: next-build
          path: .next
      - run: pnpm exec playwright install --with-deps ${{ matrix.browser }}
      - run: pnpm exec playwright test --project=${{ matrix.project }}
        env:
          CI: true
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-results-${{ matrix.project }}
          path: test-results/
          if-no-files-found: ignore

  lhci:
    needs: checks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: actions/download-artifact@v4
        with:
          name: next-build
          path: .next
      - run: pnpm lhci
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: lighthouse-report
          path: .lighthouseci/
          include-hidden-files: true
          if-no-files-found: ignore
```

- [ ] **Step 4: Check the LHCI CLI flags** before writing the preview workflow:

Run: `pnpm exec lhci collect --help | grep -iE "no-lighthouserc|settings|numberOfRuns|url"` and `pnpm exec lhci assert --help | grep -i config`
Expected: `--no-lighthouserc`, `--url`, `--numberOfRuns`, `--settings` and `--config` all exist. If `--settings.extraHeaders` isn't accepted as a JSON string, pass it with `--settings.extraHeaders='{"x-vercel-protection-bypass":"…"}'` exactly as the LHCI docs' "extraHeaders" FAQ shows (check `node_modules/@lhci/cli/README.md` or `docs/configuration.md` in the package).

- [ ] **Step 5: Create `.github/workflows/lighthouse-preview.yml`:**

```yaml
name: Lighthouse (preview)

on:
  deployment_status:

jobs:
  lighthouse-preview:
    if: >-
      github.event.deployment_status.state == 'success' &&
      startsWith(github.event.deployment_status.environment, 'Preview')
    runs-on: ubuntu-latest
    steps:
      - name: Require the Vercel protection bypass secret
        env:
          BYPASS: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}
        run: |
          if [ -z "$BYPASS" ]; then
            echo "::error::VERCEL_AUTOMATION_BYPASS_SECRET is not set. Without it Lighthouse would audit the Vercel login page, not the preview."
            exit 1
          fi
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.deployment.sha }}
      - uses: pnpm/action-setup@v4
        with:
          version: 11
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Collect (mobile, 3 runs per URL)
        env:
          BASE: ${{ github.event.deployment_status.target_url }}
          BYPASS: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}
        run: |
          BASE="${BASE%/}"
          pnpm exec lhci collect --no-lighthouserc \
            --url="$BASE/en" \
            --url="$BASE/vi" \
            --url="$BASE/en/work/oneloyalty-layered-architecture" \
            --url="$BASE/vi/work/safebulk-bulk-editor" \
            --numberOfRuns=3 \
            --settings.extraHeaders="{\"x-vercel-protection-bypass\":\"$BYPASS\"}"
      - name: Assert (same thresholds as the local run)
        run: pnpm exec lhci assert --config=./lighthouserc.json
      - if: always()
        run: pnpm exec lhci upload --target=filesystem --outputDir=.lighthouseci
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: lighthouse-preview-report
          path: .lighthouseci/
          include-hidden-files: true
          if-no-files-found: ignore
```

- [ ] **Step 6: Validate the YAML locally**

Run: `pnpm dlx @action-validator/cli .github/workflows/ci.yml && pnpm dlx @action-validator/cli .github/workflows/lighthouse-preview.yml`
Expected: no errors. If the validator can't be fetched, run `node -e "require('yaml')"`-style parsing via `pnpm dlx yaml-lint .github/workflows/*.yml` instead, and say which one ran.

- [ ] **Step 7: Commit**

```bash
git add .github/workflows lighthouserc.json
git commit -m "ci: e2e browser matrix, check:bundles, LCP/TBT gates, Lighthouse on Vercel previews

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: README and CLAUDE.md

**Files:**
- Modify: `README.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: check names (Task 8), the Speed Insights delta (Task 4 Step 7), the `check:bundles` output (Task 2), the event table (spec).

- [ ] **Step 1: README.** Make these changes:
  - **Scripts:** add `pnpm check:bundles`: "initial JS ≤ 150 KB gzip for `/en` and `/vi`, no three.js in initial chunks (run after `pnpm build`)".
  - **Quality gates:** replace the section with:
    - the CI jobs (`checks`: lint, typecheck, unit, build, `check:claims`, `check:bundles`; `e2e (<project>)` × 7; `lhci`; `lighthouse-preview` on Vercel preview deployments);
    - a table of Playwright projects and what each excludes (`@webgl`, `@desktop`, `@motion`, WebGL spec files);
    - lazy-chunk budgets enforced by e2e (3D ≤ 250 KB, About ≤ 26 KB, motion ≤ 70 KB);
    - Lighthouse thresholds (from `lighthouserc.json`);
    - the preview bypass: how the header is used, and the accepted risk that it is sent with third-party requests;
    - required checks on `master` with this exact command for Dat:

```bash
gh api -X PUT repos/nguyenthanhdat22012001/Portfolio/branches/master/protection --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "checks",
      "e2e (chromium)", "e2e (chromium-no-webgl)", "e2e (firefox)", "e2e (webkit)",
      "e2e (iphone-13)", "e2e (pixel-7)", "e2e (chromium-reduced-motion)",
      "lhci", "lighthouse-preview"
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null
}
EOF
```

  - **New section "Analytics"** (after Feature flags): Umami Cloud (cookieless, `data-do-not-track`, sends only from the Vercel production build via `data-domains`); Speed Insights only on Vercel, with its measured initial-JS delta; Vercel Web Analytics deliberately off; the 7-event table; "mark elements with `trackAttrs()`; never `data-umami-event`, which cancels same-tab clicks".
  - **New section "Security headers":** the header list, CSP per environment (dev adds `'unsafe-eval'`/`ws:`; production adds HSTS and `upgrade-insecure-requests`), and the rule for changing CSP hosts.
  - **Environment variables:** add rows:
    - `NEXT_PUBLIC_UMAMI_ID`: optional, Production only in Vercel; no script without it.
    - `VERCEL_AUTOMATION_BYPASS_SECRET`: GitHub Actions secret for preview Lighthouse and `PLAYWRIGHT_BASE_URL` runs.
    - `GOOGLE_SITE_VERIFICATION`: optional, Search Console meta tag.
    - `PLAYWRIGHT_BASE_URL`: optional, run e2e against a deployment.
  - **Live URL:** `https://portfolio-zeta-cyan-13.vercel.app`, if the README still says "added at launch".
  - Remove the sentence "Lighthouse CI on preview deployments, a bundle-budget script and the full browser matrix come in Phase 6B."

- [ ] **Step 2: CLAUDE.md.** Add:
  - Under **Architecture** (or a new **Analytics** heading): "Analytics events are marked with `trackAttrs()` from `shared/analytics/events.ts` (server-rendered `data-track*` attributes, sent by the inline listener in `tracking-script.ts`). Never use Umami's `data-umami-event`: it cancels same-tab clicks. Code with no DOM element (the canvas) calls `track()` from `shared/analytics/track.ts`, its own file so lazy chunks share no module with the initial bundle. `umamiConfig()` decides where Umami may send (Vercel production only); `speedInsightsEnabled()` renders Speed Insights only on Vercel."
  - A **Security headers** heading: "`shared/security/headers.ts` builds the static headers/CSP per environment; `next.config.ts` applies them. Change a CSP host only with a network capture from a real deployment; never add `'unsafe-eval'` outside development or a wildcard host."
  - Under **Performance budget**: "`pnpm check:bundles` (`scripts/check-bundles.mjs`) enforces initial JS ≤ 150 KB gzip from the build output in CI; lazy chunks stay in the e2e specs."
  - Under **Testing**: "Playwright projects: `chromium` (all, incl. WebGL specs), `chromium-no-webgl`, `firefox`, `webkit`, `iphone-13`, `pixel-7`, `chromium-reduced-motion`. Tag a test `@webgl` (desktop Chromium only), `@desktop` (not on phones) or `@motion` (not under reduced motion). Required checks on `master`: `checks`, every `e2e (<project>)`, `lhci`, `lighthouse-preview`."
  - Update the `"use client"` paragraph only if a new client file was added (none planned).

- [ ] **Step 3: Format and commit**

```bash
pnpm exec prettier --check README.md CLAUDE.md || pnpm exec prettier --write README.md CLAUDE.md
git add README.md CLAUDE.md
git commit -m "docs: Phase 6B analytics, quality gates and security headers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Final verification and preview check

**Files:** none new. Edit `src/shared/security/headers.ts` only if the preview evidence justifies trimming a host.

- [ ] **Step 1: Full local gate**

Run: `pnpm lint && pnpm typecheck && pnpm test && NEXT_PUBLIC_UMAMI_ID=ci-dummy pnpm build && pnpm check:claims && pnpm check:bundles && pnpm exec playwright test && pnpm lhci`
Expected: everything green. Report the `check:bundles` numbers, the `about-avatar` and motion chunk sizes printed by e2e, and the Lighthouse medians.

- [ ] **Step 2: Dev (Turbopack) pass.** Run `pnpm dev` and check in a browser:
  - `/en`: no CSP violations in the console, HMR works, the Hero canvas mounts, and scrolling to About loads the avatar.
  - `/en/work/swift-performance` renders.
  - The 404 drift runs on `/en/nope`.

- [ ] **Step 3: Ask Dat before pushing.** Pushing triggers a Vercel preview and the new workflows. Ask:
  - "Ready to push `phase-6-a` and open a PR to `master`?"
  - "Have you created the bypass secret and the GitHub secret `VERCEL_AUTOMATION_BYPASS_SECRET`?"

  Wait for a yes.

- [ ] **Step 4: Verify on the preview** (after the push, once Vercel reports the preview URL):

Run: `PLAYWRIGHT_BASE_URL=<preview-url> VERCEL_AUTOMATION_BYPASS_SECRET=<secret from Dat's env> pnpm exec playwright test e2e/security.spec.ts --project=chromium`

Expected: PASS. Copy the printed "third-party hosts" lines into the PR description. If `va.vercel-scripts.com` or `vitals.vercel-insights.com` never appears, while Speed Insights is confirmed working via a `/_vercel/speed-insights/` request in the same run, propose removing those hosts in a separate commit with that evidence. Never add hosts beyond the spec's list without asking.

- [ ] **Step 5: Confirm CI.** Check that every required check ran green on the PR, including `lighthouse-preview` (`gh pr checks`). Then give Dat the branch-protection command from the README.
