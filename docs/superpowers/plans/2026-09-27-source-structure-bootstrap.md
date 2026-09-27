# Source Structure Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap a runnable, bilingual Next.js App Router scaffold with the plan's layered `app → features → shared` directory structure, quality tooling (ESLint boundaries enforcement, Prettier, Vitest, Playwright, CI), and a `CLAUDE.md` rules file for AI-assisted implementation.

**Architecture:** Single Next.js 15 (App Router, TypeScript strict, React 19) package managed with pnpm. Locale routing via next-intl (`en` default, `vi`) under `src/app/[locale]`. Layering (`app`/`features`/`shared`) is enforced with `eslint-plugin-boundaries`, not just documented. Content pipeline (Velite) is configured now but left unconsumed by real content — Phase 2 wires it up.

**Tech Stack:** Next.js 15, React 19, TypeScript 5 (strict), Tailwind CSS v4, next-intl, Zustand, Velite, ESLint 9 (flat config) + eslint-plugin-boundaries, Prettier, Vitest, Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-27-source-structure-design.md`

## Global Constraints

- TypeScript strict mode (`strict: true`, `noUncheckedIndexedAccess: true`) across the whole project.
- Package manager is pnpm only — no `package-lock.json` or `yarn.lock` may be introduced.
- Layering is `app → features → shared`; a lower layer never imports a higher one. Enforced by `eslint-plugin-boundaries`, not review-only convention.
- Locales are exactly `en` (default) + `vi`, locale-prefixed routing (`/en`, `/vi`).
- No 3D (three/R3F), no GSAP, no real case-study/blog content in this task — those are later phases per the project plan.
- Every user-facing string goes through next-intl message files (`shared/i18n/messages/*.json`) — no hardcoded copy in components.
- Vercel project linking and Lighthouse CI budget gating are explicitly out of scope — manual/later-phase follow-ups only, not built here.
- Empty directories are never committed — a folder is created only in the task that puts real content in it.

## Review Focus

- Unknown/unsupported locale segments (e.g. `/fr`) must fail cleanly (404), never crash or serve the wrong locale's content — tested in Task 5.
- The root path `/` must redirect to the default locale (`/en`), never 404 or serve unprefixed content — tested in Task 5 and Task 8.
- The ESLint boundaries rule must catch violations via **relative** imports, not only aliased (`@/...`) ones — a common way such rules get silently bypassed — tested in Task 3.
- `pnpm build` must succeed even though `content/work` and `content/blog` don't exist on disk yet (no seed content committed) — tested in Task 7.
- The committed lockfile must actually satisfy `pnpm install --frozen-lockfile` (what CI runs) — verified explicitly in Task 9, not assumed from a plain `pnpm install` succeeding.

---

### Task 1: Project scaffold — pnpm, Next.js, TypeScript strict

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `.gitignore`
- Create: `src/app/globals.css`
- Create: `src/app/[locale]/layout.tsx`
- Create: `src/app/[locale]/page.tsx`

**Interfaces:**
- Produces: path alias `@/*` → `./src/*` (used by every later task); route segment `src/app/[locale]` (used by Tasks 2, 5, 6, 7).

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "portfolio",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "next-intl": "^3.26.0",
    "zustand": "^5.0.0",
    "zod": "^3.24.0",
    "velite": "^0.2.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "postcss": "^8.4.49",
    "eslint": "^9.17.0",
    "eslint-config-next": "^15.1.0",
    "eslint-plugin-boundaries": "^5.0.1",
    "@eslint/eslintrc": "^3.2.0",
    "prettier": "^3.4.2",
    "prettier-plugin-tailwindcss": "^0.6.9",
    "vitest": "^2.1.8",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "@playwright/test": "^1.49.1"
  }
}
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "."
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create `next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 5: Create `.gitignore`**

```
# dependencies
node_modules
.pnpm-store

# next.js
.next
out

# testing
coverage
playwright-report
test-results

# velite
.velite

# env
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# misc
.DS_Store
*.pem
```

- [ ] **Step 6: Create `src/app/globals.css`**

```css
:root {
  --color-bg: #ffffff;
  --color-fg: #0a0a0a;
}
```

- [ ] **Step 7: Create `src/app/[locale]/layout.tsx`**

```tsx
import type { ReactNode } from "react";
import "../globals.css";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "vi" }];
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Create `src/app/[locale]/page.tsx`**

```tsx
export default async function HomePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <main>
      <h1>Portfolio scaffold ({locale})</h1>
    </main>
  );
}
```

- [ ] **Step 9: Install dependencies**

Run: `pnpm install`
Expected: installs successfully, creates `pnpm-lock.yaml`.

- [ ] **Step 10: Verify dev server serves both locale routes**

```bash
pnpm dev &
DEV_PID=$!
sleep 3
curl -s http://localhost:3000/en | grep -o "Portfolio scaffold (en)"
curl -s http://localhost:3000/vi | grep -o "Portfolio scaffold (vi)"
kill $DEV_PID
```

Expected: both `curl` calls print the matching text.

- [ ] **Step 11: Verify production build succeeds**

Run: `pnpm build`
Expected: exits 0, prints a route summary including `/[locale]`.

- [ ] **Step 12: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json next.config.ts .gitignore src
git commit -m "chore: bootstrap Next.js App Router scaffold with pnpm + strict TS"
```

---

### Task 2: Tailwind CSS v4 integration

**Files:**
- Create: `postcss.config.mjs`
- Modify: `src/app/globals.css`
- Modify: `src/app/[locale]/page.tsx`

**Interfaces:**
- Consumes: `src/app/[locale]/page.tsx` from Task 1.
- Produces: Tailwind utilities available to every component created afterward.

- [ ] **Step 1: Create `postcss.config.mjs`**

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {}
  }
};

export default config;
```

- [ ] **Step 2: Update `src/app/globals.css` to load Tailwind + design tokens**

```css
@import "tailwindcss";

:root {
  --color-bg: #ffffff;
  --color-fg: #0a0a0a;
  --color-accent: #6366f1;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0a0a0a;
    --color-fg: #f5f5f5;
  }
}

body {
  background: var(--color-bg);
  color: var(--color-fg);
}
```

- [ ] **Step 3: Add a Tailwind utility class to the scaffold heading**

In `src/app/[locale]/page.tsx`, change the `<h1>` to:

```tsx
<h1 className="text-3xl font-bold">Portfolio scaffold ({locale})</h1>
```

- [ ] **Step 4: Verify Tailwind actually compiles the utility**

```bash
pnpm build
grep -r "font-bold" .next/static/css/*.css
```

Expected: `pnpm build` exits 0; the `grep` finds at least one match (proves Tailwind processed the class, not just left it as a literal string).

- [ ] **Step 5: Commit**

```bash
git add postcss.config.mjs src/app/globals.css src/app/[locale]/page.tsx
git commit -m "feat: wire up Tailwind CSS v4"
```

---

### Task 3: ESLint (flat config) + boundaries enforcement + Prettier

**Files:**
- Create: `eslint.config.mjs`
- Create: `.prettierrc.json`
- Create: `.prettierignore`

**Interfaces:**
- Produces: `pnpm lint` and `pnpm format:check` scripts, enforced import layering (`app`/`features`/`shared`) that every later task's files must satisfy.

- [ ] **Step 1: Create `eslint.config.mjs`**

```js
import { FlatCompat } from "@eslint/eslintrc";
import boundaries from "eslint-plugin-boundaries";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "app", pattern: "src/app/**" },
        { type: "features", pattern: "src/features/**" },
        { type: "shared", pattern: "src/shared/**" }
      ]
    },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: "app", allow: ["app", "features", "shared"] },
            { from: "features", allow: ["features", "shared"] },
            { from: "shared", allow: ["shared"] }
          ]
        }
      ]
    }
  }
];

export default eslintConfig;
```

- [ ] **Step 2: Create `.prettierrc.json`**

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "none",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

- [ ] **Step 3: Create `.prettierignore`**

```
.next
.velite
node_modules
pnpm-lock.yaml
```

- [ ] **Step 4: Verify lint passes on the current codebase**

Run: `pnpm lint`
Expected: exits 0, no errors.

- [ ] **Step 5: Prove the boundaries rule actually fails a relative-import violation**

Create a temporary file `src/shared/lib/__boundary_check.ts`:

```ts
import HomePage from "../../app/[locale]/page";

export const check = HomePage;
```

Run: `pnpm lint`
Expected: fails with a `boundaries/element-types` error on `src/shared/lib/__boundary_check.ts` (a `shared` file importing from `app`).

- [ ] **Step 6: Remove the temporary file and confirm lint is clean again**

```bash
rm src/shared/lib/__boundary_check.ts
rmdir src/shared/lib src/shared 2>/dev/null || true
pnpm lint
```

Expected: exits 0, no errors (and the empty `src/shared` directories are gone — nothing to commit).

- [ ] **Step 7: Commit**

```bash
git add eslint.config.mjs .prettierrc.json .prettierignore package.json pnpm-lock.yaml
git commit -m "chore: add ESLint flat config with layering enforcement, Prettier"
```

---

### Task 4: Vitest + first shared-layer file (Zustand scroll store)

**Files:**
- Create: `vitest.config.ts`
- Create: `src/shared/lib/stores/scroll-store.ts`
- Test: `src/shared/lib/stores/scroll-store.test.ts`

**Interfaces:**
- Produces: `useScrollStore` (Zustand hook with `{ progress: number; setProgress(progress: number): void }` shape) — the store later GSAP/canvas work (Phase 4/5, not this task) will read and write.

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
```

- [ ] **Step 2: Write the failing test**

Create `src/shared/lib/stores/scroll-store.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { useScrollStore } from "./scroll-store";

describe("useScrollStore", () => {
  it("defaults progress to 0", () => {
    expect(useScrollStore.getState().progress).toBe(0);
  });

  it("updates progress via setProgress", () => {
    useScrollStore.getState().setProgress(0.42);
    expect(useScrollStore.getState().progress).toBe(0.42);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — cannot find module `./scroll-store`.

- [ ] **Step 4: Implement the store**

Create `src/shared/lib/stores/scroll-store.ts`:

```ts
import { create } from "zustand";

interface ScrollState {
  progress: number;
  setProgress: (progress: number) => void;
}

export const useScrollStore = create<ScrollState>((set) => ({
  progress: 0,
  setProgress: (progress) => set({ progress })
}));
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS, 2 tests.

- [ ] **Step 6: Verify lint and typecheck still pass**

Run: `pnpm lint && pnpm typecheck`
Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts src/shared/lib/stores package.json pnpm-lock.yaml
git commit -m "test: add Vitest and the shared scroll-progress store"
```

---

### Task 5: Bilingual routing with next-intl

**Files:**
- Create: `src/shared/i18n/routing.ts`
- Create: `src/shared/i18n/navigation.ts`
- Create: `src/shared/i18n/request.ts`
- Create: `src/shared/i18n/messages/en.json`
- Create: `src/shared/i18n/messages/vi.json`
- Create: `src/middleware.ts`
- Modify: `next.config.ts`
- Modify: `src/app/[locale]/layout.tsx`
- Modify: `src/app/[locale]/page.tsx`
- Create: `src/app/[locale]/not-found.tsx`

**Interfaces:**
- Consumes: `src/app/[locale]/layout.tsx` / `page.tsx` from Tasks 1–2.
- Produces: `routing.locales` (`["en", "vi"]`), `routing.defaultLocale` (`"en"`), and next-intl message keys `meta.title`, `meta.description`, `hero.title`, `hero.tagline`, `notFound.title`, `notFound.description` — consumed by Task 6.

- [ ] **Step 1: Create `src/shared/i18n/routing.ts`**

```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "vi"],
  defaultLocale: "en"
});
```

- [ ] **Step 2: Create `src/shared/i18n/navigation.ts`**

```ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

- [ ] **Step 3: Create `src/shared/i18n/request.ts`**

```ts
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
```

- [ ] **Step 4: Create message files**

`src/shared/i18n/messages/en.json`:

```json
{
  "meta": {
    "title": "Nguyen Thanh Dat — Frontend Engineer",
    "description": "Frontend Engineer specializing in React, TypeScript, performance, and architecture."
  },
  "hero": {
    "title": "Nguyen Thanh Dat",
    "tagline": "I build products quickly and with solid structure."
  },
  "notFound": {
    "title": "Page not found",
    "description": "The page you're looking for doesn't exist."
  }
}
```

`src/shared/i18n/messages/vi.json`:

```json
{
  "meta": {
    "title": "Nguyễn Thành Đạt — Kỹ sư Frontend",
    "description": "Kỹ sư Frontend chuyên về React, TypeScript, hiệu năng và kiến trúc."
  },
  "hero": {
    "title": "Nguyễn Thành Đạt",
    "tagline": "Tôi xây dựng sản phẩm nhanh chóng và có cấu trúc vững chắc."
  },
  "notFound": {
    "title": "Không tìm thấy trang",
    "description": "Trang bạn đang tìm không tồn tại."
  }
}
```

- [ ] **Step 5: Create `src/middleware.ts`**

```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "@/shared/i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"]
};
```

- [ ] **Step 6: Wire the next-intl plugin into `next.config.ts`**

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/shared/i18n/request.ts");

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
```

- [ ] **Step 7: Update `src/app/[locale]/layout.tsx` to validate the locale and provide messages**

```tsx
import type { ReactNode } from "react";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/shared/i18n/routing";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Update `src/app/[locale]/page.tsx` to render translated copy**

```tsx
import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations("hero");

  return (
    <main>
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p>{t("tagline")}</p>
    </main>
  );
}
```

- [ ] **Step 9: Create `src/app/[locale]/not-found.tsx`**

```tsx
import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <main>
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
    </main>
  );
}
```

- [ ] **Step 10: Verify translated routes and locale edge cases**

```bash
pnpm build
pnpm start &
APP_PID=$!
sleep 3
curl -s http://localhost:3000/en | grep -o "Nguyen Thanh Dat"
curl -s http://localhost:3000/vi | grep -o "Nguyễn Thành Đạt"
curl -s -o /dev/null -w "%{http_code}\n" -L http://localhost:3000/fr
curl -s -o /dev/null -w "%{http_code}\n" -L http://localhost:3000/
kill $APP_PID
```

Expected: both `grep` calls find their translated string; the `/fr` request's final status is `404`; the `/` request's final status is `200` (it followed a redirect to `/en`).

- [ ] **Step 11: Commit**

```bash
git add src/shared/i18n src/middleware.ts next.config.ts src/app package.json pnpm-lock.yaml
git commit -m "feat: bilingual routing with next-intl (en default, vi)"
```

---

### Task 6: Hero feature + SEO metadata helper

**Files:**
- Create: `src/features/hero/HeroSection.tsx`
- Create: `src/shared/seo/build-metadata.ts`
- Modify: `src/app/[locale]/page.tsx`

**Interfaces:**
- Consumes: `hero.title`, `hero.tagline`, `meta.title`, `meta.description` message keys from Task 5.
- Produces: `HeroSection` (Server Component, no props) for later phases to extend; `buildMetadata({ title, description, path, locale })` returning `Metadata`, reusable by every future route's `generateMetadata`.

- [ ] **Step 1: Create `src/features/hero/HeroSection.tsx`**

```tsx
import { getTranslations } from "next-intl/server";

export async function HeroSection() {
  const t = await getTranslations("hero");

  return (
    <main>
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p>{t("tagline")}</p>
    </main>
  );
}
```

- [ ] **Step 2: Create `src/shared/seo/build-metadata.ts`**

```ts
import type { Metadata } from "next";

interface BuildMetadataInput {
  title: string;
  description: string;
  path: string;
  locale: string;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function buildMetadata({
  title,
  description,
  path,
  locale
}: BuildMetadataInput): Metadata {
  const url = `${siteUrl}/${locale}${path}`;

  return {
    title,
    description,
    alternates: {
      canonical: url
    },
    openGraph: {
      title,
      description,
      url,
      locale
    },
    twitter: {
      card: "summary_large_image",
      title,
      description
    }
  };
}
```

- [ ] **Step 3: Update `src/app/[locale]/page.tsx` to use both**

```tsx
import { getTranslations } from "next-intl/server";
import { HeroSection } from "@/features/hero/HeroSection";
import { buildMetadata } from "@/shared/seo/build-metadata";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("meta");

  return buildMetadata({
    title: t("title"),
    description: t("description"),
    path: "/",
    locale
  });
}

export default function HomePage() {
  return <HeroSection />;
}
```

- [ ] **Step 4: Verify the app layer, features layer, and shared layer compose correctly**

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm start &
APP_PID=$!
sleep 3
curl -s http://localhost:3000/en | grep -o "Nguyen Thanh Dat"
curl -s http://localhost:3000/en | grep -o "<title>Nguyen Thanh Dat — Frontend Engineer</title>"
kill $APP_PID
```

Expected: lint/typecheck/build all pass; both `grep` calls find a match (hero text renders, and `generateMetadata` produced the `<title>` tag).

- [ ] **Step 5: Commit**

```bash
git add src/features src/shared/seo src/app/[locale]/page.tsx
git commit -m "feat: hero feature section and shared SEO metadata helper"
```

---

### Task 7: Velite content pipeline (schemas only, no seed content)

**Files:**
- Create: `velite.config.ts`
- Create: `src/app/[locale]/work/[slug]/page.tsx`
- Create: `src/app/[locale]/blog/[slug]/page.tsx`
- Modify: `package.json` (add `prebuild`/`predev` scripts)
- Modify: `.gitignore` (already covers `.velite`, confirm)

**Interfaces:**
- Produces: Velite collections `work` and `blog` (schemas: `slug`, `title`, `summary`, `locale`, `tags`, `dateCreated`/`datePublished`, `content`) — Phase 2 will import and render these; this task leaves the routes as explicit placeholders.

- [ ] **Step 1: Create `velite.config.ts`**

```ts
import { defineCollection, defineConfig, s } from "velite";

const work = defineCollection({
  name: "Work",
  pattern: "work/**/*.mdx",
  schema: s.object({
    slug: s.slug("work"),
    title: s.string(),
    summary: s.string(),
    locale: s.enum(["en", "vi"]),
    tags: s.array(s.string()),
    dateCreated: s.isodate(),
    content: s.mdx()
  })
});

const blog = defineCollection({
  name: "Blog",
  pattern: "blog/**/*.mdx",
  schema: s.object({
    slug: s.slug("blog"),
    title: s.string(),
    summary: s.string(),
    locale: s.enum(["en", "vi"]),
    tags: s.array(s.string()),
    datePublished: s.isodate(),
    content: s.mdx()
  })
});

export default defineConfig({
  root: "content",
  collections: { work, blog },
  output: {
    data: ".velite",
    assets: "public/static",
    base: "/static/",
    name: "[name]-[hash:6].[ext]",
    clean: true
  }
});
```

- [ ] **Step 2: Add `prebuild`/`predev` scripts to `package.json`**

```json
"predev": "velite build",
"prebuild": "velite build",
```

(add these two entries to the existing `"scripts"` object from Task 1)

- [ ] **Step 3: Create placeholder `src/app/[locale]/work/[slug]/page.tsx`**

```tsx
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return [];
}

export default function WorkCaseStudyPage() {
  // Phase 2 wires this up to Velite's `work` collection with real case studies.
  notFound();
}
```

- [ ] **Step 4: Create placeholder `src/app/[locale]/blog/[slug]/page.tsx`**

```tsx
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return [];
}

export default function BlogPostPage() {
  // Phase 2 wires this up to Velite's `blog` collection with real posts.
  notFound();
}
```

- [ ] **Step 5: Verify the build succeeds with no `content/` directory on disk**

```bash
ls content 2>&1 || echo "confirmed: content/ does not exist yet"
pnpm build
ls .velite
```

Expected: `content/` is confirmed absent; `pnpm build` still exits 0 (Velite's `predev`/`prebuild` step tolerates zero matching files); `.velite` contains generated (empty) collection data.

- [ ] **Step 6: Verify placeholder routes 404 cleanly**

```bash
pnpm start &
APP_PID=$!
sleep 3
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/en/work/anything
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/en/blog/anything
kill $APP_PID
```

Expected: both return `404`.

- [ ] **Step 7: Commit**

```bash
git add velite.config.ts package.json pnpm-lock.yaml src/app/[locale]/work src/app/[locale]/blog
git commit -m "feat: configure Velite content schemas and placeholder work/blog routes"
```

---

### Task 8: Playwright e2e smoke suite

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/home.spec.ts`

**Interfaces:**
- Consumes: the built app from Tasks 1–7 (via `pnpm build && pnpm start`, orchestrated by Playwright's `webServer`).

- [ ] **Step 1: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000"
  },
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }]
});
```

- [ ] **Step 2: Write the e2e smoke tests**

Create `e2e/home.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("home page renders in English by default", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Nguyen Thanh Dat"
  );
});

test("home page renders in Vietnamese", async ({ page }) => {
  await page.goto("/vi");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Nguyễn Thành Đạt"
  );
});

test("root path redirects to the default locale", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
});

test("an unknown work slug 404s", async ({ page }) => {
  const response = await page.goto("/en/work/does-not-exist");
  expect(response?.status()).toBe(404);
});
```

- [ ] **Step 3: Install Playwright's browser binary**

Run: `pnpm exec playwright install --with-deps chromium`
Expected: exits 0.

- [ ] **Step 4: Run the e2e suite**

Run: `pnpm test:e2e`
Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts e2e package.json pnpm-lock.yaml
git commit -m "test: add Playwright e2e smoke suite"
```

---

### Task 9: GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: every script in `package.json` (`lint`, `typecheck`, `test`, `build`) produced by Tasks 1–8.

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main, master]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build

      # Lighthouse CI budget gating lands in Phase 3 (SEO phase) per the
      # project plan — placeholder left here intentionally.
      # - run: pnpm dlx @lhci/cli autorun
```

- [ ] **Step 2: Verify the lockfile actually satisfies what CI runs**

```bash
pnpm install --frozen-lockfile
```

Expected: exits 0 with no changes to `pnpm-lock.yaml` (proves the committed lockfile is in sync — if this step modifies the lockfile, commit it before moving on).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow (lint, typecheck, test, build)"
```

---

### Task 10: `CLAUDE.md` rules and final verification

**Files:**
- Create: `CLAUDE.md`

**Interfaces:**
- None — this is documentation plus a full-repo verification pass.

- [ ] **Step 1: Create `CLAUDE.md`**

```markdown
# CLAUDE.md — Rules for AI-assisted implementation

This file governs how AI-assisted changes are made in this repo. See also the
two planning docs in `docs/`: the project plan and the Phase 5B avatar spec.

## Architecture

- Layering is `app → features → shared`. A lower layer never imports a higher
  one. This is enforced by ESLint (`eslint-plugin-boundaries` in
  `eslint.config.mjs`) — if `pnpm lint` fails on a boundaries error, that is
  the correct signal to redesign the change, not to suppress the rule.
- Server Components are the default. Add `"use client"` only to a file that
  directly touches GSAP or the React Three Fiber canvas.

## 3D and animation conventions (apply once those phases start)

- Any 3D canvas import goes through
  `dynamic(() => import(...), { ssr: false })`. The canvas element is always
  `aria-hidden="true"`. Every piece of text rendered inside the canvas has a
  real DOM counterpart — never canvas-only text.
- Scroll/section progress state lives in exactly one Zustand store
  (`shared/lib/stores/scroll-store.ts`). GSAP writes to it; `useFrame` reads
  from it. Never drive per-frame updates through React state/re-renders.
- Exactly one `Lenis` instance and one `gsap.ticker` for the whole app,
  created once at the app root. Do not instantiate either inside a feature
  component.
- Respect `prefers-reduced-motion`: disable scrubbing/pinning and Lenis, and
  keep any 3D scene static.

## Performance budget (informational — enforced by Lighthouse CI from Phase 3)

- Initial JS (gzip) < 150 KB.
- Lazy-loaded 3D chunk < 250 KB.
- `.glb` models < 500 KB (except the Phase 5B avatar, budgeted separately at
  ≤ 1.5 MB).
- Flag budget-relevant changes during implementation rather than waiting for
  Lighthouse CI to catch them later.

## i18n

- No hardcoded user-facing strings. Every piece of copy goes through
  next-intl message keys in `shared/i18n/messages/en.json` and
  `shared/i18n/messages/vi.json`. Add a key to both files together.

## Testing

- TDD expectation: write or adjust the relevant Vitest (unit) or Playwright
  (e2e) test alongside feature code, not as an afterthought.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` must all pass
  before a change is considered done.

## Content

- Case studies and blog posts live in `content/work/*.mdx` and
  `content/blog/*.mdx`, validated by the Zod schemas in `velite.config.ts`.
  Don't hand-write JSON for this content — add an `.mdx` file matching the
  schema.

## Out of scope reminders

- No CMS, no blog comments, no admin dashboard, no multiple 3D scenes per
  page, no WebGPU (v1.0 non-goals from the project plan).
- If a convention here becomes outdated, update this file in the same
  change that changes the convention.
```

- [ ] **Step 2: Run the full definition-of-done verification**

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Expected: every command exits 0.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md rules for AI-assisted implementation"
```

- [ ] **Step 4: Note manual follow-ups for the user (not part of this plan's scope)**

- Connect this GitHub repo to a Vercel project via the Vercel dashboard, to get PR preview deployments (per the spec's non-goals — this requires the user's Vercel account).
- Push to a real GitHub remote and confirm `.github/workflows/ci.yml` runs green there (this plan verifies the equivalent commands locally, since no remote is configured yet in this session).
