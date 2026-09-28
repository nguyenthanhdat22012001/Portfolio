# Phase 2 — Static Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the full static portfolio — themed layout, five home sections, case study pages with `vi → en` fallback, and blog routes — with no animation JS.

**Architecture:** Everything is a Server Component in the existing `app → features → shared` layering, except two tiny client controls (`ThemeToggle`, `LocaleSwitcher`). Design tokens live in CSS variables mirrored by a TS constants file that tests check for contrast and drift. Velite content is read only through `shared/content`, a pure selection layer that handles locale fallback.

**Tech Stack:** Next.js 15.5 App Router, React 19, TypeScript strict, Tailwind CSS v4, next-intl 3.26, Velite 0.2, Vitest 2 (jsdom), Playwright.

**Spec:** `docs/superpowers/specs/2026-09-27-phase-2-static-content-design.md`

**Branch:** work directly on the current branch `phase-2`. Do not create a worktree or a new branch.

## Global Constraints

- Layering `app → features → shared`; a lower layer never imports a higher one (`pnpm lint` enforces it). Features do not import other features.
- `"use client"` only in `src/shared/theme/ThemeToggle.tsx` and `src/features/layout/LocaleSwitcher.tsx`. Client components receive translated strings as props.
- No hardcoded user-facing strings: all copy goes through `src/shared/i18n/messages/en.json` and `vi.json`, whose key trees must stay identical. Exception: data values in `src/shared/lib/site.ts` (URLs, the email address).
- No raw hex colors in components — use token utilities (`bg-bg`, `bg-bg-elevated`, `text-fg`, `text-fg-muted`, `text-accent`, `bg-accent`, `text-accent-fg`, `border-border`, `rounded-card`, `py-section`). `--earth` is never used for text.
- Token values (dark default / light): `--bg` `#1A1A1C`/`#F5F4F0`, `--bg-elevated` `#242427`/`#FFFFFF`, `--fg` `#E6E6E3`/`#1F1F21`, `--fg-muted` `#9A9A9A`/`#5E5E5E`, `--accent` `#C9A227`/`#8A6A10`, `--accent-fg` `#1A1A1C`/`#FFFFFF`, `--earth` `#8B5E3C`/`#6E4A2F`, `--border` `#34343A`/`#DDDAD2`.
- Fonts: `Google_Sans_Code` (headings, labels, numbers) and `Open_Sans` (body) via `next/font/google`, subsets `latin` + `vietnamese`; large headings `letter-spacing: -0.02em`.
- No new runtime dependencies.
- Every page must stay statically prerendered (no `headers()`, `cookies()`, or `searchParams` in pages/layouts).
- Commit messages end with a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Done = `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass and `pnpm test:e2e` passes.
- Before running `pnpm test:e2e`, make sure nothing is listening on port 3000 (`lsof -i :3000`); Playwright reuses an existing server locally and would test stale code.

## Review Focus

1. **A document exists only in `vi` (no `en` twin)** — it must not appear on `/en`, and `/en/work/<slug>` must 404 rather than render or crash. Pinned in Task 3 (`localize.test.ts`).
2. **`localStorage` throws (Safari private mode, blocked storage)** — the pre-paint script must still apply the OS theme and the toggle must still flip the theme. Pinned in Task 2 (`theme-script.test.ts`).
3. **An ICU placeholder differs between `en` and `vi`** (e.g. `{year}` missing in Vietnamese) — must fail in CI, not at render. Pinned in Task 4 (`messages.test.ts`).
4. **A case study slug is renamed in MDX** — the home Work chapter must not silently vanish. Pinned in Task 8 (`chapter-order.test.ts`).
5. **Header section links used from a case study page** — must navigate to the home page section (`/en#about`), not a missing anchor on the current page. Pinned in Task 9 (`work.spec.ts`).

---

## File map

| File                                                     | Responsibility                                                       | Task |
| -------------------------------------------------------- | -------------------------------------------------------------------- | ---- |
| `src/shared/theme/tokens.ts`                             | Token values per theme (TS mirror of CSS)                            | 1    |
| `src/shared/theme/tokens.test.ts`                        | Contrast ≥ 4.5:1 and CSS ↔ TS drift check                            | 1    |
| `src/shared/theme/fonts.ts`                              | `next/font` instances                                                | 1    |
| `src/app/globals.css`                                    | Tokens, Tailwind theme mapping, base styles                          | 1    |
| `src/shared/theme/theme-script.ts`                       | `resolveTheme` + inline pre-paint script                             | 2    |
| `src/shared/theme/theme-script.test.ts`                  | Script and resolver behavior                                         | 2    |
| `src/shared/theme/ThemeToggle.tsx`                       | Client toggle button                                                 | 2    |
| `e2e/theme.spec.ts`                                      | First-load theme + toggle persistence                                | 2, 6 |
| `velite.config.ts`                                       | Slug schema change                                                   | 3    |
| `src/shared/content/localize.ts`                         | Pure locale selection / fallback / params                            | 3    |
| `src/shared/content/localize.test.ts`                    | Tests for the above                                                  | 3    |
| `src/shared/content/index.ts`                            | Binds Velite data to the pure functions                              | 3    |
| `src/shared/i18n/messages/{en,vi}.json`                  | All Phase 2 copy                                                     | 4    |
| `src/shared/i18n/messages/messages.test.ts`              | Key-tree and placeholder parity                                      | 4    |
| `src/shared/lib/cx.ts`, `src/shared/lib/site.ts`         | Class join helper, site constants                                    | 5    |
| `src/shared/ui/*`                                        | Container, Section, SectionTitle, TagList, ButtonLink, ArticleLayout | 5    |
| `src/features/layout/*`                                  | SiteHeader, SiteFooter, LocaleSwitcher                               | 6    |
| `e2e/layout.spec.ts`                                     | Skip link, locale switch, mobile menu                                | 6    |
| `src/features/{hero,about,skills,contact}/*`             | Home sections                                                        | 7    |
| `src/features/work/*`                                    | Work section, chapters, visuals                                      | 8    |
| `src/shared/mdx/*`                                       | MDX renderer + helpers                                               | 9    |
| `src/app/[locale]/work/[slug]/page.tsx`                  | Case study page                                                      | 9    |
| `src/app/[locale]/blog/page.tsx`, `blog/[slug]/page.tsx` | Blog routes                                                          | 10   |

---

### Task 1: Design tokens, fonts, and global styles

**Files:**

- Create: `src/shared/theme/tokens.ts`
- Create: `src/shared/theme/tokens.test.ts`
- Create: `src/shared/theme/fonts.ts`
- Modify: `src/app/globals.css` (full rewrite)
- Modify: `src/app/[locale]/layout.tsx`

**Interfaces:**

- Produces: `themes: readonly ["dark", "light"]`, `type Theme = "dark" | "light"`, `colorTokens: Record<Theme, Record<ColorToken, string>>` from `@/shared/theme/tokens`; `fontSans`, `fontMono` from `@/shared/theme/fonts`; Tailwind utilities `bg-bg`, `bg-bg-elevated`, `text-fg`, `text-fg-muted`, `text-accent`, `bg-accent`, `text-accent-fg`, `border-border`, `border-accent`, `rounded-card`, `py-section`, `font-sans`, `font-mono`, and the `dark:` variant keyed on `[data-theme="dark"]`.

- [ ] **Step 1: Write the failing test**

Create `src/shared/theme/tokens.test.ts`:

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { colorTokens, themes, type ColorToken } from "./tokens";

function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(1 + offset, 3 + offset), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number
  ];
  return (light + 0.05) / (dark + 0.05);
}

const textPairs: Array<[ColorToken, ColorToken]> = [
  ["fg", "bg"],
  ["fg", "bg-elevated"],
  ["fg-muted", "bg"],
  ["fg-muted", "bg-elevated"],
  ["accent", "bg"],
  ["accent", "bg-elevated"],
  ["accent-fg", "accent"]
];

describe("color tokens", () => {
  for (const theme of themes) {
    it.each(textPairs)(`${theme}: %s on %s is at least 4.5:1`, (fg, bg) => {
      expect(
        contrast(colorTokens[theme][fg], colorTokens[theme][bg])
      ).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe("globals.css mirrors tokens.ts", () => {
  const css = readFileSync(
    path.resolve(process.cwd(), "src/app/globals.css"),
    "utf8"
  ).toLowerCase();

  function block(selector: string): string {
    const start = css.indexOf(`${selector} {`);
    if (start === -1) throw new Error(`globals.css is missing ${selector}`);
    return css.slice(start, css.indexOf("}", start));
  }

  const blocks = {
    light: [block(":root")],
    dark: [block('[data-theme="dark"]'), block(":root:not([data-theme])")]
  } as const;

  for (const theme of themes) {
    it(`declares every ${theme} token`, () => {
      for (const cssBlock of blocks[theme]) {
        for (const [name, value] of Object.entries(colorTokens[theme])) {
          expect(cssBlock).toContain(`--${name}: ${value.toLowerCase()};`);
        }
      }
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/shared/theme/tokens.test.ts`
Expected: FAIL — `Failed to resolve import "./tokens"`.

- [ ] **Step 3: Create the tokens module**

Create `src/shared/theme/tokens.ts`:

```ts
// Mirrors the custom properties in src/app/globals.css; tokens.test.ts
// fails if the two drift apart or a text pair drops below WCAG AA.
export const themes = ["dark", "light"] as const;

export type Theme = (typeof themes)[number];

export type ColorToken =
  | "bg"
  | "bg-elevated"
  | "fg"
  | "fg-muted"
  | "accent"
  | "accent-fg"
  | "earth"
  | "border";

export const colorTokens: Record<Theme, Record<ColorToken, string>> = {
  dark: {
    bg: "#1A1A1C",
    "bg-elevated": "#242427",
    fg: "#E6E6E3",
    "fg-muted": "#9A9A9A",
    accent: "#C9A227",
    "accent-fg": "#1A1A1C",
    earth: "#8B5E3C",
    border: "#34343A"
  },
  light: {
    bg: "#F5F4F0",
    "bg-elevated": "#FFFFFF",
    fg: "#1F1F21",
    "fg-muted": "#5E5E5E",
    accent: "#8A6A10",
    "accent-fg": "#FFFFFF",
    earth: "#6E4A2F",
    border: "#DDDAD2"
  }
};
```

- [ ] **Step 4: Rewrite `src/app/globals.css`**

```css
@import "tailwindcss";

@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

:root {
  --bg: #f5f4f0;
  --bg-elevated: #ffffff;
  --fg: #1f1f21;
  --fg-muted: #5e5e5e;
  --accent: #8a6a10;
  --accent-fg: #ffffff;
  --earth: #6e4a2f;
  --border: #dddad2;
  --radius: 0.75rem;
  --space-section: clamp(4rem, 10vw, 7.5rem);
  color-scheme: light;
}

[data-theme="dark"] {
  --bg: #1a1a1c;
  --bg-elevated: #242427;
  --fg: #e6e6e3;
  --fg-muted: #9a9a9a;
  --accent: #c9a227;
  --accent-fg: #1a1a1c;
  --earth: #8b5e3c;
  --border: #34343a;
  color-scheme: dark;
}

/* No-JS fallback: the pre-paint script never ran, so follow the OS. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    --bg: #1a1a1c;
    --bg-elevated: #242427;
    --fg: #e6e6e3;
    --fg-muted: #9a9a9a;
    --accent: #c9a227;
    --accent-fg: #1a1a1c;
    --earth: #8b5e3c;
    --border: #34343a;
    color-scheme: dark;
  }
}

/* --earth is intentionally not mapped: it is reserved for 3D, never text. */
@theme inline {
  --color-bg: var(--bg);
  --color-bg-elevated: var(--bg-elevated);
  --color-fg: var(--fg);
  --color-fg-muted: var(--fg-muted);
  --color-accent: var(--accent);
  --color-accent-fg: var(--accent-fg);
  --color-border: var(--border);
  --radius-card: var(--radius);
  --spacing-section: var(--space-section);
  --font-sans: var(--font-open-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-google-sans-code), ui-monospace, monospace;
}

@layer base {
  html {
    background: var(--bg);
    color: var(--fg);
  }

  body {
    font-family: var(--font-sans);
  }

  h1,
  h2,
  h3 {
    font-family: var(--font-mono);
    letter-spacing: -0.02em;
  }

  :focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }

  [tabindex="-1"]:focus {
    outline: none;
  }

  section[id] {
    scroll-margin-top: 5rem;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/shared/theme/tokens.test.ts`
Expected: PASS (14 contrast cases + 2 drift cases). The tightest pair is light `accent` on `bg` at ≈4.60:1 — do not darken `bg` or lighten `accent` without re-running this.

- [ ] **Step 6: Create the fonts module**

Create `src/shared/theme/fonts.ts`:

```ts
import { Google_Sans_Code, Open_Sans } from "next/font/google";

export const fontSans = Open_Sans({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-open-sans"
});

export const fontMono = Google_Sans_Code({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-google-sans-code"
});
```

- [ ] **Step 7: Apply fonts and base classes in the layout**

In `src/app/[locale]/layout.tsx`, add the import and replace the `<html>`/`<body>` lines:

```tsx
import { fontMono, fontSans } from "@/shared/theme/fonts";
```

```tsx
    <html lang={locale} className={`${fontSans.variable} ${fontMono.variable}`}>
      <body
        suppressHydrationWarning
        className="min-h-dvh bg-bg font-sans text-fg antialiased"
      >
```

- [ ] **Step 8: Verify lint, typecheck, build**

Run: `pnpm lint && pnpm typecheck && pnpm build`
Expected: all pass; build output lists `/[locale]` as prerendered (●/SSG).

- [ ] **Step 9: Commit**

```bash
git add src/shared/theme src/app/globals.css "src/app/[locale]/layout.tsx"
git commit -m "feat: add design tokens, fonts, and themed base styles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Theme pre-paint script, toggle, and CLAUDE.md rule

**Files:**

- Create: `src/shared/theme/theme-script.ts`
- Create: `src/shared/theme/theme-script.test.ts`
- Create: `src/shared/theme/ThemeToggle.tsx`
- Create: `e2e/theme.spec.ts`
- Modify: `src/app/[locale]/layout.tsx`
- Modify: `CLAUDE.md`

**Interfaces:**

- Consumes: `type Theme` from `./tokens` (Task 1).
- Produces: `THEME_STORAGE_KEY = "theme"`, `resolveTheme(stored: string | null, prefersDark: boolean | null): Theme`, `themeScript: string` from `@/shared/theme/theme-script`; `ThemeToggle({ label }: { label: string })` from `@/shared/theme/ThemeToggle`. The toggle is rendered by the header in Task 6.

- [ ] **Step 1: Write the failing test**

Create `src/shared/theme/theme-script.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY, resolveTheme, themeScript } from "./theme-script";

describe("resolveTheme", () => {
  it("prefers a valid stored theme over the OS", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("follows the OS when nothing valid is stored", () => {
    expect(resolveTheme(null, false)).toBe("light");
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme("purple", false)).toBe("light");
  });

  it("defaults to dark with no stored value and no OS preference", () => {
    expect(resolveTheme(null, null)).toBe("dark");
  });
});

describe("themeScript", () => {
  function mockMatchMedia(scheme: "dark" | "light" | null) {
    window.matchMedia = vi.fn((query: string) => ({
      matches: scheme !== null && query.includes(scheme)
    })) as unknown as typeof window.matchMedia;
  }

  function run() {
    new Function(themeScript)();
    return document.documentElement.dataset.theme;
  }

  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    vi.restoreAllMocks();
  });

  it("applies the stored theme", () => {
    mockMatchMedia("dark");
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    expect(run()).toBe("light");
  });

  it("applies the OS theme when nothing is stored", () => {
    mockMatchMedia("light");
    expect(run()).toBe("light");
  });

  it("falls back to dark with no OS preference", () => {
    mockMatchMedia(null);
    expect(run()).toBe("dark");
  });

  it("still applies the OS theme when localStorage throws", () => {
    mockMatchMedia("light");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(run()).toBe("light");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/shared/theme/theme-script.test.ts`
Expected: FAIL — `Failed to resolve import "./theme-script"`.

- [ ] **Step 3: Implement the resolver and script**

Create `src/shared/theme/theme-script.ts`:

```ts
import type { Theme } from "./tokens";

export const THEME_STORAGE_KEY = "theme";

export function resolveTheme(
  stored: string | null,
  prefersDark: boolean | null
): Theme {
  if (stored === "dark" || stored === "light") return stored;
  if (prefersDark === false) return "light";
  return "dark";
}

// Inlined in <head> so data-theme is set before first paint. It embeds
// resolveTheme's source, so that function must stay self-contained.
export const themeScript = `(function(){try{var resolve=${resolveTheme.toString()};var stored=null;try{stored=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch(e){}var mq=window.matchMedia;var prefersDark=mq?(mq("(prefers-color-scheme: dark)").matches?true:mq("(prefers-color-scheme: light)").matches?false:null):null;document.documentElement.dataset.theme=resolve(stored,prefersDark)}catch(e){}})()`;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/shared/theme/theme-script.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Create the toggle**

Create `src/shared/theme/ThemeToggle.tsx`:

```tsx
"use client";

import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "./theme-script";
import type { Theme } from "./tokens";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"]
  });
  return () => observer.disconnect();
}

function getSnapshot(): Theme | null {
  const theme = document.documentElement.dataset.theme;
  return theme === "dark" || theme === "light" ? theme : null;
}

function getServerSnapshot(): Theme | null {
  return null;
}

export function ThemeToggle({ label }: { label: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the switch still applies.
    }
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={theme === "dark"}
      onClick={toggle}
      className="rounded-card border-border text-fg hover:border-accent hover:text-accent inline-flex size-10 items-center justify-center border"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="size-5 dark:hidden"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="hidden size-5 dark:block"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    </button>
  );
}
```

- [ ] **Step 6: Inline the script in the layout**

In `src/app/[locale]/layout.tsx`, add the import, add `suppressHydrationWarning` to `<html>`, and add a `<head>` before `<body>`:

```tsx
import { themeScript } from "@/shared/theme/theme-script";
```

```tsx
    <html
      lang={locale}
      className={`${fontSans.variable} ${fontMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
```

- [ ] **Step 7: Write the first-load e2e test**

Create `e2e/theme.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

const cases = [
  { colorScheme: "dark", expected: "dark" },
  { colorScheme: "light", expected: "light" },
  { colorScheme: "no-preference", expected: "dark" }
] as const;

for (const { colorScheme, expected } of cases) {
  test.describe(`OS preference: ${colorScheme}`, () => {
    test.use({ colorScheme });

    test(`first load uses the ${expected} theme`, async ({ page }) => {
      await page.goto("/en");
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        expected
      );
    });
  });
}
```

- [ ] **Step 8: Run the e2e test**

Run: `pnpm test:e2e e2e/theme.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 9: Update CLAUDE.md**

In `CLAUDE.md`, replace the second Architecture bullet:

```markdown
- Server Components are the default. Add `"use client"` only to a file that
  directly touches GSAP or the React Three Fiber canvas.
```

with:

```markdown
- Server Components are the default. Add `"use client"` only to a file that
  directly touches GSAP or the React Three Fiber canvas, or to a minimal
  interactive control that cannot work without client JS (currently
  `shared/theme/ThemeToggle.tsx` and `features/layout/LocaleSwitcher.tsx`).
  Pass translated labels to client components as props instead of shipping
  message catalogs to the client.
```

- [ ] **Step 10: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass.

```bash
git add src/shared/theme e2e/theme.spec.ts "src/app/[locale]/layout.tsx" CLAUDE.md
git commit -m "feat: add flash-free theme script and theme toggle

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Content layer with locale fallback

**Files:**

- Modify: `velite.config.ts`
- Modify: `tsconfig.json`
- Modify: `vitest.config.ts`
- Modify: `package.json` (scripts)
- Create: `src/shared/content/localize.ts`
- Create: `src/shared/content/localize.test.ts`
- Create: `src/shared/content/index.ts`

**Interfaces:**

- Consumes: `routing`, `type Locale` from `@/shared/i18n/routing`.
- Produces (from `@/shared/content`):
  - `type Work`, `type Blog` (Velite output types), `interface Localized<T> { doc: T; isFallback: boolean }`
  - `getWork(locale: Locale): Localized<Work>[]`
  - `getWorkBySlug(slug: string, locale: Locale): Localized<Work> | null`
  - `getWorkParams(): { locale: Locale; slug: string }[]`
  - `getPosts(locale: Locale): Localized<Blog>[]` (newest first by `datePublished`)
  - `getPostBySlug(slug: string, locale: Locale): Localized<Blog> | null`
  - `getPostParams(): { locale: Locale; slug: string }[]`
- `Work` fields: `slug, title, summary, locale, tags: string[], dateCreated: string (ISO), content: string (compiled MDX)`. `Blog` is the same with `datePublished` instead of `dateCreated`.

- [ ] **Step 1: Write the failing test**

Create `src/shared/content/localize.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  assertUnique,
  findDuplicate,
  findForLocale,
  localeParams,
  newestFirst,
  selectForLocale
} from "./localize";

const docs = [
  { slug: "alpha", locale: "en", date: "2024-01-01" },
  { slug: "alpha", locale: "vi", date: "2024-01-01" },
  { slug: "beta", locale: "en", date: "2025-01-01" },
  { slug: "gamma", locale: "vi", date: "2023-01-01" }
] as const;

describe("findForLocale", () => {
  it("returns the exact locale when it exists", () => {
    expect(findForLocale(docs, "alpha", "vi")).toEqual({
      doc: docs[1],
      isFallback: false
    });
  });

  it("falls back to English and flags it", () => {
    expect(findForLocale(docs, "beta", "vi")).toEqual({
      doc: docs[2],
      isFallback: true
    });
  });

  it("returns null for an unknown slug", () => {
    expect(findForLocale(docs, "missing", "en")).toBeNull();
  });

  it("never falls back from English to Vietnamese", () => {
    expect(findForLocale(docs, "gamma", "en")).toBeNull();
  });
});

describe("selectForLocale", () => {
  it("returns one entry per slug, preferring the locale", () => {
    expect(
      selectForLocale(docs, "vi").map(({ doc, isFallback }) => [
        doc.slug,
        doc.locale,
        isFallback
      ])
    ).toEqual([
      ["alpha", "vi", false],
      ["beta", "en", true],
      ["gamma", "vi", false]
    ]);
  });

  it("omits Vietnamese-only documents from English", () => {
    expect(selectForLocale(docs, "en").map(({ doc }) => doc.slug)).toEqual([
      "alpha",
      "beta"
    ]);
  });
});

describe("localeParams", () => {
  it("lists only slug/locale pairs that resolve", () => {
    expect(localeParams(docs)).toEqual([
      { locale: "en", slug: "alpha" },
      { locale: "en", slug: "beta" },
      { locale: "vi", slug: "alpha" },
      { locale: "vi", slug: "beta" },
      { locale: "vi", slug: "gamma" }
    ]);
  });
});

describe("newestFirst", () => {
  it("sorts entries by date descending", () => {
    const sorted = newestFirst(selectForLocale(docs, "vi"), (d) => d.date);
    expect(sorted.map(({ doc }) => doc.slug)).toEqual([
      "beta",
      "alpha",
      "gamma"
    ]);
  });
});

describe("duplicate detection", () => {
  it("returns null when every slug/locale pair is unique", () => {
    expect(findDuplicate(docs)).toBeNull();
  });

  it("reports the first duplicated slug/locale pair", () => {
    expect(
      findDuplicate([...docs, { slug: "beta", locale: "en" as const }])
    ).toBe("en/beta");
  });

  it("throws with the collection name when duplicates exist", () => {
    expect(() =>
      assertUnique("work", [...docs, { slug: "beta", locale: "en" as const }])
    ).toThrow("Duplicate work entry: en/beta");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/shared/content/localize.test.ts`
Expected: FAIL — `Failed to resolve import "./localize"`.

- [ ] **Step 3: Implement the pure selection layer**

Create `src/shared/content/localize.ts`:

```ts
import { routing, type Locale } from "@/shared/i18n/routing";

export interface LocalizedDoc {
  slug: string;
  locale: Locale;
}

export interface Localized<T> {
  doc: T;
  isFallback: boolean;
}

function uniqueSlugs(docs: readonly LocalizedDoc[]): string[] {
  return [...new Set(docs.map((doc) => doc.slug))];
}

export function findDuplicate(docs: readonly LocalizedDoc[]): string | null {
  const seen = new Set<string>();
  for (const { slug, locale } of docs) {
    const key = `${locale}/${slug}`;
    if (seen.has(key)) return key;
    seen.add(key);
  }
  return null;
}

export function assertUnique(
  collection: string,
  docs: readonly LocalizedDoc[]
): void {
  const duplicate = findDuplicate(docs);
  if (duplicate) {
    throw new Error(`Duplicate ${collection} entry: ${duplicate}`);
  }
}

// A missing translation falls back to the default locale (English), never
// the other way round.
export function findForLocale<T extends LocalizedDoc>(
  docs: readonly T[],
  slug: string,
  locale: Locale
): Localized<T> | null {
  const exact = docs.find((doc) => doc.slug === slug && doc.locale === locale);
  if (exact) return { doc: exact, isFallback: false };

  const fallback = docs.find(
    (doc) => doc.slug === slug && doc.locale === routing.defaultLocale
  );
  return fallback ? { doc: fallback, isFallback: true } : null;
}

export function selectForLocale<T extends LocalizedDoc>(
  docs: readonly T[],
  locale: Locale
): Localized<T>[] {
  return uniqueSlugs(docs)
    .map((slug) => findForLocale(docs, slug, locale))
    .filter((entry): entry is Localized<T> => entry !== null);
}

export function localeParams(
  docs: readonly LocalizedDoc[]
): { locale: Locale; slug: string }[] {
  const slugs = uniqueSlugs(docs);
  return routing.locales.flatMap((locale) =>
    slugs
      .filter((slug) => findForLocale(docs, slug, locale) !== null)
      .map((slug) => ({ locale, slug }))
  );
}

export function newestFirst<T>(
  entries: readonly Localized<T>[],
  date: (doc: T) => string
): Localized<T>[] {
  return [...entries].sort((a, b) => date(b.doc).localeCompare(date(a.doc)));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/shared/content/localize.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Allow same-slug translations in Velite**

`s.slug()` enforces uniqueness across the whole collection, which would reject an `en`/`vi` pair sharing a slug. In `velite.config.ts`, replace both slug fields:

```ts
    slug: s.slug("work"),
```

→

```ts
    slug: s.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
```

and

```ts
    slug: s.slug("blog"),
```

→

```ts
    slug: s.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
```

- [ ] **Step 6: Add the `#site/content` alias and make scripts build Velite first**

In `tsconfig.json`, extend `paths`:

```json
    "paths": {
      "@/*": ["./src/*"],
      "#site/content": ["./.velite"]
    }
```

In `vitest.config.ts`, extend `resolve.alias`:

```ts
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "#site/content": path.resolve(__dirname, "./.velite")
    }
```

In `package.json`, `.velite` is gitignored, so CI's `typecheck` and `test` run before anything generates it. Change these two scripts:

```json
    "typecheck": "velite build && tsc --noEmit",
    "test": "velite build && vitest run",
```

- [ ] **Step 7: Bind the real data**

Create `src/shared/content/index.ts`:

```ts
import { blog, work, type Blog, type Work } from "#site/content";
import type { Locale } from "@/shared/i18n/routing";
import {
  assertUnique,
  findForLocale,
  localeParams,
  newestFirst,
  selectForLocale,
  type Localized
} from "./localize";

// Fails the build loudly instead of silently shadowing a translation.
assertUnique("work", work);
assertUnique("blog", blog);

export type { Blog, Localized, Work };

export function getWork(locale: Locale): Localized<Work>[] {
  return selectForLocale(work, locale);
}

export function getWorkBySlug(
  slug: string,
  locale: Locale
): Localized<Work> | null {
  return findForLocale(work, slug, locale);
}

export function getWorkParams() {
  return localeParams(work);
}

export function getPosts(locale: Locale): Localized<Blog>[] {
  return newestFirst(
    selectForLocale(blog, locale),
    (post) => post.datePublished
  );
}

export function getPostBySlug(
  slug: string,
  locale: Locale
): Localized<Blog> | null {
  return findForLocale(blog, slug, locale);
}

export function getPostParams() {
  return localeParams(blog);
}
```

- [ ] **Step 8: Verify the whole chain**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: `typecheck` and `test` both print Velite's build log first, then pass; `pnpm build` succeeds.

- [ ] **Step 9: Commit**

```bash
git add velite.config.ts tsconfig.json vitest.config.ts package.json src/shared/content
git commit -m "feat: add content layer with English fallback for translations

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Phase 2 copy and message parity

**Files:**

- Modify: `src/shared/i18n/messages/en.json` (full rewrite)
- Modify: `src/shared/i18n/messages/vi.json` (full rewrite)
- Create: `src/shared/i18n/messages/messages.test.ts`

**Interfaces:**

- Produces the namespaces and keys used by Tasks 6–10: `nav.*`, `locales.{en,vi}`, `theme.toggle`, `hero.*`, `about.{title,paragraphs[],stats[{value,label}]}`, `work.{title,readCaseStudy}`, `work.swift.*`, `work.oneloyalty.{metric,caption,greetings[{text,lang}]}`, `work.safebulk.{metric,caption,stepLabel,steps[],github,demo}`, `skills.{title,groups[{name,items[]}]}`, `contact.*`, `footer.{copyright,social}`, `caseStudy.{back,fallbackNotice,started}`, `blog.{title,description,empty,back}`. Arrays are read with `t.raw(...)`.

- [ ] **Step 1: Write the failing test**

Create `src/shared/i18n/messages/messages.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import en from "./en.json";
import vi from "./vi.json";

// Reduces a message tree to its shape: object keys, array lengths, and the
// ICU placeholders each string uses. Translations may differ; shapes may not.
function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, shape(child)])
    );
  }
  if (typeof value === "string") {
    return [...value.matchAll(/\{(\w+)/g)].map((m) => m[1]).sort();
  }
  return typeof value;
}

describe("message catalogs", () => {
  it("en and vi have identical key trees and placeholders", () => {
    expect(shape(vi)).toEqual(shape(en));
  });

  it("defines the Phase 2 namespaces", () => {
    expect(Object.keys(en)).toEqual(
      expect.arrayContaining([
        "nav",
        "locales",
        "theme",
        "hero",
        "about",
        "work",
        "skills",
        "contact",
        "footer",
        "caseStudy",
        "blog"
      ])
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/shared/i18n/messages/messages.test.ts`
Expected: FAIL on "defines the Phase 2 namespaces" (only `meta`, `hero`, `notFound` exist).

- [ ] **Step 3: Write `en.json`**

Replace `src/shared/i18n/messages/en.json` with:

```json
{
  "meta": {
    "title": "Nguyen Thanh Dat — Frontend Engineer",
    "description": "Frontend Engineer specializing in React, TypeScript, performance, and architecture."
  },
  "nav": {
    "skipToContent": "Skip to content",
    "brand": "Nguyen Thanh Dat",
    "homeLabel": "Nguyen Thanh Dat — home",
    "primary": "Primary",
    "menu": "Menu",
    "about": "About",
    "work": "Work",
    "skills": "Skills",
    "contact": "Contact",
    "blog": "Blog",
    "language": "Language"
  },
  "locales": {
    "en": "English",
    "vi": "Tiếng Việt"
  },
  "theme": {
    "toggle": "Dark theme"
  },
  "hero": {
    "title": "Nguyen Thanh Dat",
    "role": "Front-End Engineer · React / TypeScript",
    "tagline": "I build fast, well-structured React apps — and measure the difference.",
    "ctaWork": "See my work",
    "ctaCv": "Download CV"
  },
  "about": {
    "title": "About",
    "paragraphs": [
      "I'm a front-end engineer with 4 years of building Shopify embedded apps in React and TypeScript — from joining Swift as a fresher in 2022 to working as a mid-level engineer on Oneloyalty's monorepo.",
      "I care most about two things: how fast a product feels, and whether its codebase can keep changing without breaking. I measure the first with Web Vitals and protect the second with layered architecture and enforced boundaries.",
      "For every feature I write the spec before the code, agree on API contracts early, and use AI tools like Claude and Copilot to move faster on refactors — then verify the result myself."
    ],
    "stats": [
      { "value": "4+", "label": "years building React apps" },
      { "value": "3", "label": "Shopify apps shipped" },
      { "value": "8", "label": "languages in one i18n system" }
    ]
  },
  "work": {
    "title": "Selected work",
    "readCaseStudy": "Read case study",
    "swift": {
      "metric": "Initial load: 12–13s → 1–3s",
      "caption": "Time to first screen",
      "before": "Before",
      "after": "After",
      "beforeValue": "12–13s",
      "afterValue": "1–3s"
    },
    "oneloyalty": {
      "metric": "40+ shared components · 8 languages",
      "caption": "One i18n core, eight languages",
      "greetings": [
        { "text": "Hello", "lang": "en" },
        { "text": "Xin chào", "lang": "vi" },
        { "text": "Bonjour", "lang": "fr" },
        { "text": "Hallo", "lang": "de" },
        { "text": "Hola", "lang": "es" },
        { "text": "Olá", "lang": "pt" },
        { "text": "Ciao", "lang": "it" },
        { "text": "こんにちは", "lang": "ja" }
      ]
    },
    "safebulk": {
      "metric": "3-step wizard · 4 plan tiers · solo front end",
      "caption": "Bulk edit wizard",
      "stepLabel": "Step {number}",
      "steps": ["Filter products", "Configure rules", "Preview changes"],
      "github": "Source on GitHub",
      "demo": "Watch the demo"
    }
  },
  "skills": {
    "title": "Skills",
    "groups": [
      {
        "name": "Core",
        "items": [
          "TypeScript (strict)",
          "JavaScript (ES6+)",
          "React",
          "HTML5",
          "CSS3"
        ]
      },
      {
        "name": "Architecture",
        "items": [
          "Monorepo (Turborepo)",
          "Layered Architecture",
          "Feature-Driven Architecture",
          "Component-Driven Development"
        ]
      },
      {
        "name": "State & data",
        "items": [
          "TanStack Query",
          "Zustand",
          "Redux Toolkit",
          "REST",
          "GraphQL (Shopify APIs)"
        ]
      },
      {
        "name": "Build & performance",
        "items": [
          "Vite",
          "SWC",
          "Code splitting",
          "Bundle analysis",
          "Web Vitals"
        ]
      },
      {
        "name": "UI & styling",
        "items": [
          "Responsive design",
          "Shopify Polaris",
          "Tailwind CSS",
          "SCSS Modules",
          "styled-components",
          "Figma"
        ]
      },
      {
        "name": "Tooling",
        "items": [
          "Git",
          "GitLab CI/CD",
          "GitHub Actions",
          "Docker",
          "NPM package publishing"
        ]
      }
    ]
  },
  "contact": {
    "title": "Let's work together",
    "description": "I'm open to front-end roles with remote and international teams. Email is the fastest way to reach me.",
    "email": "Email",
    "linkedin": "LinkedIn",
    "github": "GitHub",
    "cv": "Download CV"
  },
  "footer": {
    "copyright": "© {year} Nguyen Thanh Dat",
    "social": "Social links"
  },
  "caseStudy": {
    "back": "Back to work",
    "fallbackNotice": "This case study is only available in English for now.",
    "started": "Started {date}"
  },
  "blog": {
    "title": "Blog",
    "description": "Notes on front-end performance, architecture, and i18n from building Shopify apps.",
    "empty": "No posts yet — the first ones are on the way.",
    "back": "Back to blog"
  },
  "notFound": {
    "title": "Page not found",
    "description": "The page you're looking for doesn't exist."
  }
}
```

- [ ] **Step 4: Write `vi.json`**

Replace `src/shared/i18n/messages/vi.json` with:

```json
{
  "meta": {
    "title": "Nguyễn Thành Đạt — Kỹ sư Frontend",
    "description": "Kỹ sư Frontend chuyên về React, TypeScript, hiệu năng và kiến trúc."
  },
  "nav": {
    "skipToContent": "Chuyển đến nội dung",
    "brand": "Nguyễn Thành Đạt",
    "homeLabel": "Nguyễn Thành Đạt — trang chủ",
    "primary": "Điều hướng chính",
    "menu": "Menu",
    "about": "Giới thiệu",
    "work": "Dự án",
    "skills": "Kỹ năng",
    "contact": "Liên hệ",
    "blog": "Blog",
    "language": "Ngôn ngữ"
  },
  "locales": {
    "en": "English",
    "vi": "Tiếng Việt"
  },
  "theme": {
    "toggle": "Giao diện tối"
  },
  "hero": {
    "title": "Nguyễn Thành Đạt",
    "role": "Kỹ sư Front-End · React / TypeScript",
    "tagline": "Mình xây ứng dụng React nhanh, có cấu trúc — và đo được sự khác biệt.",
    "ctaWork": "Xem dự án",
    "ctaCv": "Tải CV"
  },
  "about": {
    "title": "Giới thiệu",
    "paragraphs": [
      "Mình là kỹ sư front-end với 4 năm xây dựng Shopify embedded app bằng React và TypeScript — từ fresher ở Swift năm 2022 đến kỹ sư mid-level trong monorepo của Oneloyalty.",
      "Mình quan tâm nhất hai điều: sản phẩm có cảm giác nhanh không, và codebase có tiếp tục thay đổi được mà không vỡ không. Điều thứ nhất mình đo bằng Web Vitals, điều thứ hai mình giữ bằng kiến trúc phân lớp và ranh giới được công cụ kiểm soát.",
      "Với mỗi tính năng, mình viết spec trước khi code, thống nhất API contract sớm, và dùng các công cụ AI như Claude và Copilot để refactor nhanh hơn — rồi tự kiểm chứng kết quả."
    ],
    "stats": [
      { "value": "4+", "label": "năm làm React" },
      { "value": "3", "label": "Shopify app đã ra mắt" },
      { "value": "8", "label": "ngôn ngữ trong một hệ i18n" }
    ]
  },
  "work": {
    "title": "Dự án tiêu biểu",
    "readCaseStudy": "Đọc case study",
    "swift": {
      "metric": "Thời gian tải: 12–13s → 1–3s",
      "caption": "Thời gian đến màn hình đầu tiên",
      "before": "Trước",
      "after": "Sau",
      "beforeValue": "12–13s",
      "afterValue": "1–3s"
    },
    "oneloyalty": {
      "metric": "40+ component dùng chung · 8 ngôn ngữ",
      "caption": "Một lõi i18n, tám ngôn ngữ",
      "greetings": [
        { "text": "Hello", "lang": "en" },
        { "text": "Xin chào", "lang": "vi" },
        { "text": "Bonjour", "lang": "fr" },
        { "text": "Hallo", "lang": "de" },
        { "text": "Hola", "lang": "es" },
        { "text": "Olá", "lang": "pt" },
        { "text": "Ciao", "lang": "it" },
        { "text": "こんにちは", "lang": "ja" }
      ]
    },
    "safebulk": {
      "metric": "Wizard 3 bước · 4 gói dịch vụ · một mình làm front end",
      "caption": "Wizard chỉnh sửa hàng loạt",
      "stepLabel": "Bước {number}",
      "steps": ["Lọc sản phẩm", "Thiết lập quy tắc", "Xem trước thay đổi"],
      "github": "Mã nguồn trên GitHub",
      "demo": "Xem demo"
    }
  },
  "skills": {
    "title": "Kỹ năng",
    "groups": [
      {
        "name": "Nền tảng",
        "items": [
          "TypeScript (strict)",
          "JavaScript (ES6+)",
          "React",
          "HTML5",
          "CSS3"
        ]
      },
      {
        "name": "Kiến trúc",
        "items": [
          "Monorepo (Turborepo)",
          "Layered Architecture",
          "Feature-Driven Architecture",
          "Component-Driven Development"
        ]
      },
      {
        "name": "State & dữ liệu",
        "items": [
          "TanStack Query",
          "Zustand",
          "Redux Toolkit",
          "REST",
          "GraphQL (Shopify APIs)"
        ]
      },
      {
        "name": "Build & hiệu năng",
        "items": [
          "Vite",
          "SWC",
          "Code splitting",
          "Phân tích bundle",
          "Web Vitals"
        ]
      },
      {
        "name": "UI & styling",
        "items": [
          "Responsive design",
          "Shopify Polaris",
          "Tailwind CSS",
          "SCSS Modules",
          "styled-components",
          "Figma"
        ]
      },
      {
        "name": "Công cụ",
        "items": [
          "Git",
          "GitLab CI/CD",
          "GitHub Actions",
          "Docker",
          "Publish package NPM"
        ]
      }
    ]
  },
  "contact": {
    "title": "Cùng làm việc nhé",
    "description": "Mình đang tìm vị trí front-end ở các team remote và quốc tế. Email là cách nhanh nhất để liên hệ mình.",
    "email": "Email",
    "linkedin": "LinkedIn",
    "github": "GitHub",
    "cv": "Tải CV"
  },
  "footer": {
    "copyright": "© {year} Nguyễn Thành Đạt",
    "social": "Liên kết mạng xã hội"
  },
  "caseStudy": {
    "back": "Quay lại dự án",
    "fallbackNotice": "Bài viết này hiện chỉ có bằng tiếng Anh.",
    "started": "Bắt đầu {date}"
  },
  "blog": {
    "title": "Blog",
    "description": "Ghi chép về hiệu năng front-end, kiến trúc và i18n từ quá trình xây dựng Shopify app.",
    "empty": "Chưa có bài viết nào — những bài đầu tiên sắp ra mắt.",
    "back": "Quay lại blog"
  },
  "notFound": {
    "title": "Không tìm thấy trang",
    "description": "Trang bạn đang tìm không tồn tại."
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/shared/i18n/messages/messages.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass.

```bash
git add src/shared/i18n/messages
git commit -m "feat: add Phase 2 copy in English and Vietnamese with parity test

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Shared UI primitives and site constants

**Files:**

- Create: `src/shared/lib/cx.ts`
- Create: `src/shared/lib/cx.test.ts`
- Create: `src/shared/lib/site.ts`
- Create: `src/shared/ui/Container.tsx`
- Create: `src/shared/ui/Section.tsx`
- Create: `src/shared/ui/SectionTitle.tsx`
- Create: `src/shared/ui/TagList.tsx`
- Create: `src/shared/ui/ButtonLink.tsx`
- Create: `src/shared/ui/ArticleLayout.tsx`

**Interfaces:**

- Consumes: `Link` from `@/shared/i18n/navigation`.
- Produces:
  - `cx(...classes: Array<string | false | null | undefined>): string`
  - `site: { email, linkedin, github, cv, safebulkRepo, safebulkDemo }` (all `string`)
  - `Container({ size?: "default" | "narrow"; className?: string; children })`
  - `Section({ id: string; titleId: string; className?: string; children })` — renders `<section id aria-labelledby>` inside a `Container`
  - `SectionTitle({ id: string; children })` — renders `<h2 id>`
  - `TagList({ tags: readonly string[]; className?: string })`
  - `ButtonLink(props: ComponentProps<"a"> & { variant?: "primary" | "secondary" })` — a plain `<a>` (for hash links, `/cv.pdf`, and external URLs; not locale-prefixed)
  - `ArticleLayout({ backHref: ComponentProps<typeof Link>["href"]; backLabel: string; title: string; summary: string; meta: string; tags: readonly string[]; notice?: string; contentLang?: string; children })`

- [ ] **Step 1: Write the failing test**

Create `src/shared/lib/cx.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { cx } from "./cx";

describe("cx", () => {
  it("joins truthy class names with single spaces", () => {
    expect(cx("a", false, "b", null, undefined, "", "c")).toBe("a b c");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/shared/lib/cx.test.ts`
Expected: FAIL — `Failed to resolve import "./cx"`.

- [ ] **Step 3: Implement `cx`**

Create `src/shared/lib/cx.ts`:

```ts
export function cx(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/shared/lib/cx.test.ts`
Expected: PASS.

- [ ] **Step 5: Create site constants**

Create `src/shared/lib/site.ts`:

```ts
// Data, not copy: these values are identical in every locale.
export const site = {
  email: "nguyenthanhdat22012001@gmail.com",
  linkedin: "https://www.linkedin.com/in/dat-nguyen-b26744277",
  github: "https://github.com/nguyenthanhdat22012001",
  cv: "/cv.pdf",
  safebulkRepo: "https://github.com/nguyenthanhdat22012001/safe-bulk-shopify",
  safebulkDemo: "https://www.loom.com/share/6c30f307347d4555b0214ff8be0ab84f"
} as const;
```

- [ ] **Step 6: Create layout primitives**

Create `src/shared/ui/Container.tsx`:

```tsx
import type { ReactNode } from "react";
import { cx } from "@/shared/lib/cx";

const widths = {
  default: "max-w-5xl",
  narrow: "max-w-3xl"
} as const;

export function Container({
  size = "default",
  className,
  children
}: {
  size?: keyof typeof widths;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx("mx-auto w-full px-4 sm:px-6", widths[size], className)}>
      {children}
    </div>
  );
}
```

Create `src/shared/ui/Section.tsx`:

```tsx
import type { ReactNode } from "react";
import { cx } from "@/shared/lib/cx";
import { Container } from "./Container";

export function Section({
  id,
  titleId,
  className,
  children
}: {
  id: string;
  titleId: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cx("border-border py-section border-b", className)}
    >
      <Container>{children}</Container>
    </section>
  );
}
```

Create `src/shared/ui/SectionTitle.tsx`:

```tsx
import type { ReactNode } from "react";

export function SectionTitle({
  id,
  children
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <h2 id={id} className="text-2xl font-semibold sm:text-3xl">
      {children}
    </h2>
  );
}
```

Create `src/shared/ui/TagList.tsx`:

```tsx
import { cx } from "@/shared/lib/cx";

export function TagList({
  tags,
  className
}: {
  tags: readonly string[];
  className?: string;
}) {
  return (
    <ul className={cx("flex flex-wrap gap-2", className)}>
      {tags.map((tag) => (
        <li
          key={tag}
          className="border-border text-fg-muted rounded-full border px-3 py-1 font-mono text-xs"
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}
```

Create `src/shared/ui/ButtonLink.tsx`:

```tsx
import type { ComponentProps } from "react";
import { cx } from "@/shared/lib/cx";

const variants = {
  primary: "bg-accent text-accent-fg hover:opacity-90",
  secondary:
    "border border-border text-fg hover:border-accent hover:text-accent"
} as const;

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"a"> & { variant?: keyof typeof variants }) {
  return (
    <a
      className={cx(
        "rounded-card inline-flex items-center justify-center px-5 py-3 font-mono text-sm font-semibold transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
```

Create `src/shared/ui/ArticleLayout.tsx`:

```tsx
import type { ComponentProps, ReactNode } from "react";
import { Link } from "@/shared/i18n/navigation";
import { Container } from "./Container";
import { TagList } from "./TagList";

export function ArticleLayout({
  backHref,
  backLabel,
  title,
  summary,
  meta,
  tags,
  notice,
  contentLang,
  children
}: {
  backHref: ComponentProps<typeof Link>["href"];
  backLabel: string;
  title: string;
  summary: string;
  meta: string;
  tags: readonly string[];
  notice?: string;
  contentLang?: string;
  children: ReactNode;
}) {
  return (
    <Container size="narrow" className="py-12 sm:py-16">
      <Link
        href={backHref}
        className="text-accent font-mono text-sm hover:underline"
      >
        ← {backLabel}
      </Link>
      {notice ? (
        <p
          role="note"
          data-testid="fallback-notice"
          className="rounded-card border-border bg-bg-elevated text-fg-muted mt-6 border p-4 text-sm"
        >
          {notice}
        </p>
      ) : null}
      <article lang={contentLang} className="mt-8">
        <header>
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="text-fg-muted mt-4 text-lg">{summary}</p>
          <p className="text-fg-muted mt-4 font-mono text-sm">{meta}</p>
          <TagList tags={tags} className="mt-4" />
        </header>
        <div className="mt-10">{children}</div>
      </article>
    </Container>
  );
}
```

- [ ] **Step 7: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass.

```bash
git add src/shared/lib src/shared/ui
git commit -m "feat: add shared UI primitives and site constants

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Site header, footer, locale switcher, and `<main>` landmark

**Files:**

- Create: `src/features/layout/LocaleSwitcher.tsx`
- Create: `src/features/layout/SiteHeader.tsx`
- Create: `src/features/layout/SiteFooter.tsx`
- Create: `e2e/layout.spec.ts`
- Modify: `e2e/theme.spec.ts` (append toggle tests)
- Modify: `src/app/[locale]/layout.tsx`
- Modify: `src/features/hero/HeroSection.tsx` (drop `<main>`; the full rewrite comes in Task 7)
- Modify: `src/app/[locale]/not-found.tsx`

**Interfaces:**

- Consumes: `ThemeToggle` (Task 2), `getPosts` (Task 3), `nav.*`, `locales.*`, `theme.toggle`, `footer.*`, `contact.{email,linkedin,github}` messages (Task 4), `Container`, `site`, `cx` (Task 5), `Link`, `usePathname` from `@/shared/i18n/navigation`, `routing`, `type Locale` from `@/shared/i18n/routing`.
- Produces: `SiteHeader({ locale }: { locale: Locale })`, `SiteFooter()`; the layout renders `<main id="main" tabIndex={-1}>` around page content, so **pages and sections must not render their own `<main>`**. Section anchors used by the header: `about`, `work`, `skills`, `contact`.

- [ ] **Step 1: Write the failing e2e tests**

Create `e2e/layout.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("the skip link is the first focusable element and focuses main", async ({
  page
}) => {
  await page.goto("/en");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();
});

test("the header lists section links", async ({ page }) => {
  await page.goto("/en");
  const nav = page.getByRole("navigation", { name: "Primary" });
  for (const name of ["About", "Work", "Skills", "Contact"]) {
    await expect(nav.getByRole("link", { name })).toBeVisible();
  }
});

test("the locale switcher keeps the page and changes language", async ({
  page
}) => {
  await page.goto("/en");
  await page
    .getByRole("navigation", { name: "Language" })
    .getByRole("link", { name: /VI/ })
    .click();
  await expect(page).toHaveURL(/\/vi$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Nguyễn Thành Đạt"
  );
});

test("the footer links to email, LinkedIn, and GitHub", async ({ page }) => {
  await page.goto("/en");
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "Email" })).toHaveAttribute(
    "href",
    "mailto:nguyenthanhdat22012001@gmail.com"
  );
  await expect(footer.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
    "href",
    /linkedin\.com/
  );
  await expect(footer.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    /github\.com\/nguyenthanhdat22012001$/
  );
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("the menu opens and its links are reachable", async ({ page }) => {
    await page.goto("/en");
    await page.getByText("Menu", { exact: true }).click();
    const mobileNav = page.getByRole("navigation", { name: "Primary" });
    await expect(mobileNav.getByRole("link", { name: "Skills" })).toBeVisible();
  });
});
```

Append to `e2e/theme.spec.ts`:

```ts
test("the toggle switches theme and the choice survives a reload", async ({
  page
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/en");
  const toggle = page.getByRole("button", { name: "Dark theme" });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
```

- [ ] **Step 2: Run e2e to verify they fail**

Run: `pnpm test:e2e e2e/layout.spec.ts e2e/theme.spec.ts`
Expected: the 5 layout tests and the toggle test FAIL (no header, footer, or skip link yet); the 3 first-load theme tests still pass.

- [ ] **Step 3: Create the locale switcher**

Create `src/features/layout/LocaleSwitcher.tsx`:

```tsx
"use client";

import { Link, usePathname } from "@/shared/i18n/navigation";
import { routing, type Locale } from "@/shared/i18n/routing";
import { cx } from "@/shared/lib/cx";

// Client-only because the current path is needed to link to the same page
// in the other locale; the links still server-render, so it works without JS.
export function LocaleSwitcher({
  current,
  label,
  names
}: {
  current: Locale;
  label: string;
  names: Record<Locale, string>;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={label}>
      <ul className="flex items-center gap-1 font-mono text-sm">
        {routing.locales.map((locale) => (
          <li key={locale}>
            <Link
              href={pathname}
              locale={locale}
              hrefLang={locale}
              aria-current={locale === current ? "true" : undefined}
              className={cx(
                "rounded-card px-2 py-1",
                locale === current
                  ? "text-accent"
                  : "text-fg-muted hover:text-fg"
              )}
            >
              {locale.toUpperCase()}
              <span className="sr-only"> — {names[locale]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 4: Create the header**

Create `src/features/layout/SiteHeader.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { getPosts } from "@/shared/content";
import { Link } from "@/shared/i18n/navigation";
import type { Locale } from "@/shared/i18n/routing";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { Container } from "@/shared/ui/Container";
import { LocaleSwitcher } from "./LocaleSwitcher";

const sections = ["about", "work", "skills", "contact"] as const;

export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = await getTranslations("nav");
  const tLocales = await getTranslations("locales");
  const tTheme = await getTranslations("theme");
  const hasPosts = getPosts(locale).length > 0;

  const links = (
    <ul className="flex flex-col gap-4 md:flex-row md:gap-6">
      {sections.map((id) => (
        <li key={id}>
          <Link
            href={{ pathname: "/", hash: id }}
            className="text-fg-muted hover:text-fg text-sm"
          >
            {t(id)}
          </Link>
        </li>
      ))}
      {hasPosts ? (
        <li>
          <Link href="/blog" className="text-fg-muted hover:text-fg text-sm">
            {t("blog")}
          </Link>
        </li>
      ) : null}
    </ul>
  );

  return (
    <>
      <a
        href="#main"
        className="focus:rounded-card focus:bg-accent focus:text-accent-fg sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2"
      >
        {t("skipToContent")}
      </a>
      <header className="border-border bg-bg/90 sticky top-0 z-40 border-b backdrop-blur">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            aria-label={t("homeLabel")}
            className="font-mono text-sm font-semibold"
          >
            {t("brand")}
          </Link>
          <nav aria-label={t("primary")} className="hidden md:block">
            {links}
          </nav>
          <div className="flex items-center gap-2">
            <LocaleSwitcher
              current={locale}
              label={t("language")}
              names={{ en: tLocales("en"), vi: tLocales("vi") }}
            />
            <ThemeToggle label={tTheme("toggle")} />
            <details className="relative md:hidden">
              <summary className="rounded-card border-border cursor-pointer list-none border px-3 py-2 font-mono text-sm">
                {t("menu")}
              </summary>
              <nav
                aria-label={t("primary")}
                className="rounded-card border-border bg-bg-elevated absolute right-0 mt-2 w-48 border p-4"
              >
                {links}
              </nav>
            </details>
          </div>
        </Container>
      </header>
    </>
  );
}
```

- [ ] **Step 5: Create the footer**

Create `src/features/layout/SiteFooter.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { site } from "@/shared/lib/site";
import { Container } from "@/shared/ui/Container";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const tContact = await getTranslations("contact");

  const links = [
    { href: `mailto:${site.email}`, label: tContact("email"), external: false },
    { href: site.linkedin, label: tContact("linkedin"), external: true },
    { href: site.github, label: tContact("github"), external: true }
  ];

  return (
    <footer className="border-border border-t">
      <Container className="text-fg-muted flex flex-col gap-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>{t("copyright", { year: new Date().getFullYear() })}</p>
        <ul aria-label={t("social")} className="flex gap-6">
          {links.map(({ href, label, external }) => (
            <li key={href}>
              <a
                href={href}
                className="hover:text-accent"
                {...(external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </footer>
  );
}
```

- [ ] **Step 6: Wire the layout**

In `src/app/[locale]/layout.tsx`, add imports and replace the `<body>` contents:

```tsx
import { SiteFooter } from "@/features/layout/SiteFooter";
import { SiteHeader } from "@/features/layout/SiteHeader";
```

```tsx
<NextIntlClientProvider>
  <SiteHeader locale={locale} />
  <main id="main" tabIndex={-1}>
    {children}
  </main>
  <SiteFooter />
</NextIntlClientProvider>
```

- [ ] **Step 7: Remove nested `<main>` elements**

Replace `src/features/hero/HeroSection.tsx` with this interim version (fully rebuilt in Task 7):

```tsx
import { getTranslations } from "next-intl/server";

export async function HeroSection() {
  const t = await getTranslations("hero");

  return (
    <section>
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p>{t("tagline")}</p>
    </section>
  );
}
```

Replace `src/app/[locale]/not-found.tsx` with:

```tsx
import { useTranslations } from "next-intl";
import { Container } from "@/shared/ui/Container";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <Container className="py-section">
      <h1 className="text-3xl font-bold sm:text-4xl">{t("title")}</h1>
      <p className="text-fg-muted mt-4">{t("description")}</p>
    </Container>
  );
}
```

- [ ] **Step 8: Run the e2e suite**

Run: `pnpm test:e2e`
Expected: all tests pass, including the new layout and toggle tests and the pre-existing `home.spec.ts` tests.

- [ ] **Step 9: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass (no boundaries errors: `features/layout` imports only `shared`).

```bash
git add src/features/layout src/features/hero "src/app/[locale]" e2e/layout.spec.ts e2e/theme.spec.ts
git commit -m "feat: add site header, footer, locale switcher, and skip link

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Hero, About, Skills, and Contact sections

**Files:**

- Modify: `src/features/hero/HeroSection.tsx` (full rewrite)
- Create: `src/features/about/AboutSection.tsx`
- Create: `src/features/skills/SkillsSection.tsx`
- Create: `src/features/contact/ContactSection.tsx`
- Modify: `src/app/[locale]/page.tsx`
- Modify: `e2e/home.spec.ts` (append)

**Interfaces:**

- Consumes: `hero.*`, `about.*`, `skills.*`, `contact.*` messages; `Section`, `SectionTitle`, `Container`, `TagList`, `ButtonLink`, `site`.
- Produces: `HeroSection()`, `AboutSection()`, `SkillsSection()`, `ContactSection()` — all async Server Components with no props. Section ids `about`, `skills`, `contact`; the hero keeps the page's only `h1`.

- [ ] **Step 1: Write the failing e2e tests**

Append to `e2e/home.spec.ts`:

```ts
for (const locale of ["en", "vi"]) {
  test(`/${locale} has exactly one h1`, async ({ page }) => {
    await page.goto(`/${locale}`);
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test(`/${locale} renders the About, Skills, and Contact sections`, async ({
    page
  }) => {
    await page.goto(`/${locale}`);
    for (const id of ["about", "skills", "contact"]) {
      await expect(page.locator(`section#${id} h2`)).toBeVisible();
    }
  });
}

test("the hero CV button downloads /cv.pdf", async ({ page }) => {
  await page.goto("/en");
  const cv = page.locator("#top").getByRole("link", { name: "Download CV" });
  await expect(cv).toHaveAttribute("href", "/cv.pdf");
  await expect(cv).toHaveAttribute("download", "");
});

test("the contact section links to email", async ({ page }) => {
  await page.goto("/en");
  await expect(
    page.locator("#contact").getByRole("link", {
      name: "nguyenthanhdat22012001@gmail.com"
    })
  ).toHaveAttribute("href", "mailto:nguyenthanhdat22012001@gmail.com");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the home page content is fully rendered", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Nguyen Thanh Dat"
    );
    for (const id of ["about", "skills", "contact"]) {
      await expect(page.locator(`section#${id} h2`)).toBeVisible();
    }
  });
});
```

- [ ] **Step 2: Run e2e to verify they fail**

Run: `pnpm test:e2e e2e/home.spec.ts`
Expected: the new section, CV, contact, and no-JS tests FAIL; the `h1` count tests may already pass.

- [ ] **Step 3: Rebuild the hero**

Replace `src/features/hero/HeroSection.tsx` with:

```tsx
import { getTranslations } from "next-intl/server";
import { site } from "@/shared/lib/site";
import { ButtonLink } from "@/shared/ui/ButtonLink";
import { Container } from "@/shared/ui/Container";

export async function HeroSection() {
  const t = await getTranslations("hero");

  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="border-border border-b"
    >
      <Container className="grid min-h-[calc(100dvh-4rem)] items-center gap-12 py-16 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="text-accent font-mono text-sm tracking-widest uppercase">
            {t("role")}
          </p>
          <h1 id="hero-title" className="mt-4 text-4xl font-bold sm:text-6xl">
            {t("title")}
          </h1>
          <p className="text-fg-muted mt-6 max-w-xl text-lg">{t("tagline")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="#work">{t("ctaWork")}</ButtonLink>
            <ButtonLink href={site.cv} download variant="secondary">
              {t("ctaCv")}
            </ButtonLink>
          </div>
        </div>
        {/* Reserved for the Phase 5 canvas; fixed aspect ratio keeps CLS at 0. */}
        <div
          aria-hidden="true"
          data-hero-canvas-slot=""
          className="rounded-card border-border bg-bg-elevated hidden aspect-square w-full border md:block"
        />
      </Container>
    </section>
  );
}
```

- [ ] **Step 4: Create About**

Create `src/features/about/AboutSection.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { Section } from "@/shared/ui/Section";
import { SectionTitle } from "@/shared/ui/SectionTitle";

interface Stat {
  value: string;
  label: string;
}

export async function AboutSection() {
  const t = await getTranslations("about");
  const paragraphs = t.raw("paragraphs") as string[];
  const stats = t.raw("stats") as Stat[];

  return (
    <Section id="about" titleId="about-title">
      <SectionTitle id="about-title">{t("title")}</SectionTitle>
      <div className="mt-8 grid gap-10 md:grid-cols-[2fr_1fr]">
        <div className="text-fg-muted space-y-4 leading-relaxed">
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:grid-cols-1">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-card border-border bg-bg-elevated flex flex-col-reverse border p-4"
            >
              <dt className="text-fg-muted mt-1 text-sm">{stat.label}</dt>
              <dd className="text-accent font-mono text-3xl font-bold">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}
```

- [ ] **Step 5: Create Skills**

Create `src/features/skills/SkillsSection.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { Section } from "@/shared/ui/Section";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { TagList } from "@/shared/ui/TagList";

interface SkillGroup {
  name: string;
  items: string[];
}

export async function SkillsSection() {
  const t = await getTranslations("skills");
  const groups = t.raw("groups") as SkillGroup[];

  return (
    <Section id="skills" titleId="skills-title">
      <SectionTitle id="skills-title">{t("title")}</SectionTitle>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <div
            key={group.name}
            className="rounded-card border-border bg-bg-elevated border p-5"
          >
            <h3 className="font-mono text-base font-semibold">{group.name}</h3>
            <TagList tags={group.items} className="mt-4" />
          </div>
        ))}
      </div>
    </Section>
  );
}
```

- [ ] **Step 6: Create Contact**

Create `src/features/contact/ContactSection.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { site } from "@/shared/lib/site";
import { ButtonLink } from "@/shared/ui/ButtonLink";
import { Section } from "@/shared/ui/Section";
import { SectionTitle } from "@/shared/ui/SectionTitle";

export async function ContactSection() {
  const t = await getTranslations("contact");

  return (
    <Section id="contact" titleId="contact-title" className="border-b-0">
      <SectionTitle id="contact-title">{t("title")}</SectionTitle>
      <p className="text-fg-muted mt-4 max-w-xl">{t("description")}</p>
      <a
        href={`mailto:${site.email}`}
        className="text-accent mt-8 inline-block font-mono text-lg break-all underline underline-offset-4 sm:text-2xl"
      >
        {site.email}
      </a>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink
          href={site.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          variant="secondary"
        >
          {t("linkedin")}
        </ButtonLink>
        <ButtonLink
          href={site.github}
          target="_blank"
          rel="noopener noreferrer"
          variant="secondary"
        >
          {t("github")}
        </ButtonLink>
        <ButtonLink href={site.cv} download variant="secondary">
          {t("cv")}
        </ButtonLink>
      </div>
    </Section>
  );
}
```

- [ ] **Step 7: Compose the home page**

In `src/app/[locale]/page.tsx`, add imports and replace the return:

```tsx
import { AboutSection } from "@/features/about/AboutSection";
import { ContactSection } from "@/features/contact/ContactSection";
import { SkillsSection } from "@/features/skills/SkillsSection";
```

```tsx
return (
  <>
    <HeroSection />
    <AboutSection />
    <SkillsSection />
    <ContactSection />
  </>
);
```

- [ ] **Step 8: Run e2e to verify they pass**

Run: `pnpm test:e2e e2e/home.spec.ts`
Expected: PASS (all original and new tests).

- [ ] **Step 9: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass.

```bash
git add src/features "src/app/[locale]/page.tsx" e2e/home.spec.ts
git commit -m "feat: add hero, about, skills, and contact sections

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Work section with per-project chapters

**Files:**

- Create: `src/features/work/chapter-order.ts`
- Create: `src/features/work/chapter-order.test.ts`
- Create: `src/features/work/WorkChapter.tsx`
- Create: `src/features/work/chapters/SwiftVisual.tsx`
- Create: `src/features/work/chapters/OneloyaltyVisual.tsx`
- Create: `src/features/work/chapters/SafeBulkVisual.tsx`
- Create: `src/features/work/WorkSection.tsx`
- Modify: `src/app/[locale]/page.tsx`
- Create: `e2e/work.spec.ts`

**Interfaces:**

- Consumes: `getWork`, `getWorkBySlug` (Task 3); `work.*` messages (Task 4); `Section`, `SectionTitle`, `TagList`, `site` (Task 5); `Link` from `@/shared/i18n/navigation`.
- Produces: `chapterOrder` (readonly array of `{ slug, key }`), `type ChapterKey = "swift" | "oneloyalty" | "safebulk"`, `WorkSection({ locale }: { locale: Locale })`. Chapter `<article>` elements carry `data-chapter={slug}` and link to `/work/<slug>`. Phase 4 animates the three `*Visual` components.

- [ ] **Step 1: Write the failing unit test**

Create `src/features/work/chapter-order.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getWork, getWorkBySlug } from "@/shared/content";
import { chapterOrder } from "./chapter-order";

describe("chapterOrder", () => {
  it("points every chapter at an existing English case study", () => {
    for (const { slug } of chapterOrder) {
      expect(getWorkBySlug(slug, "en"), slug).not.toBeNull();
    }
  });

  it("covers every case study, so none is missing from the home page", () => {
    const chapterSlugs = chapterOrder.map(({ slug }) => slug).sort();
    const contentSlugs = getWork("en")
      .map(({ doc }) => doc.slug)
      .sort();
    expect(chapterSlugs).toEqual(contentSlugs);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/features/work/chapter-order.test.ts`
Expected: FAIL — `Failed to resolve import "./chapter-order"`.

- [ ] **Step 3: Create the chapter order**

Create `src/features/work/chapter-order.ts`:

```ts
// Narrative order on the home page: fast → structured → trustworthy.
// Kept free of React imports so it can be unit-tested against real content.
export const chapterOrder = [
  { slug: "swift-performance", key: "swift" },
  { slug: "oneloyalty-layered-architecture", key: "oneloyalty" },
  { slug: "safebulk-bulk-editor", key: "safebulk" }
] as const;

export type ChapterKey = (typeof chapterOrder)[number]["key"];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/features/work/chapter-order.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing e2e tests**

Create `e2e/work.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

const slugs = [
  "swift-performance",
  "oneloyalty-layered-architecture",
  "safebulk-bulk-editor"
];

for (const locale of ["en", "vi"]) {
  test(`/${locale} renders the three work chapters in order`, async ({
    page
  }) => {
    await page.goto(`/${locale}`);
    const chapters = page.locator("section#work article[data-chapter]");
    await expect(chapters).toHaveCount(3);
    for (const [index, slug] of slugs.entries()) {
      await expect(chapters.nth(index)).toHaveAttribute("data-chapter", slug);
      await expect(
        chapters.nth(index).locator(`a[href="/${locale}/work/${slug}"]`)
      ).toHaveCount(1);
    }
  });
}

test.describe("mobile", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("the home page has no horizontal overflow", async ({ page }) => {
    await page.goto("/en");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
```

- [ ] **Step 6: Run e2e to verify they fail**

Run: `pnpm test:e2e e2e/work.spec.ts`
Expected: the chapter tests FAIL (no `#work` section); the overflow test may pass.

- [ ] **Step 7: Create the shared chapter layout**

Create `src/features/work/WorkChapter.tsx`:

```tsx
import type { ReactNode } from "react";
import { Link } from "@/shared/i18n/navigation";
import { TagList } from "@/shared/ui/TagList";

export function WorkChapter({
  index,
  slug,
  title,
  summary,
  tags,
  metric,
  readLabel,
  visual
}: {
  index: number;
  slug: string;
  title: string;
  summary: string;
  tags: readonly string[];
  metric: string;
  readLabel: string;
  visual: ReactNode;
}) {
  const titleId = `work-${slug}-title`;

  return (
    <article
      aria-labelledby={titleId}
      data-chapter={slug}
      className="border-border grid gap-8 border-t py-12 first:border-t-0 md:grid-cols-2 md:gap-12"
    >
      <div>
        <p className="text-accent font-mono text-sm">
          {String(index).padStart(2, "0")}
        </p>
        <h3 id={titleId} className="mt-2 text-xl font-semibold sm:text-2xl">
          {title}
        </h3>
        <p className="text-accent mt-4 font-mono text-lg">{metric}</p>
        <p className="text-fg-muted mt-4 leading-relaxed">{summary}</p>
        <TagList tags={tags} className="mt-4" />
        <Link
          href={`/work/${slug}`}
          className="text-accent mt-6 inline-flex font-mono text-sm font-semibold underline underline-offset-4"
        >
          {readLabel}
          <span className="sr-only">: {title}</span>
          <span aria-hidden="true">&nbsp;→</span>
        </Link>
      </div>
      <div>{visual}</div>
    </article>
  );
}
```

- [ ] **Step 8: Create the three static visuals**

Create `src/features/work/chapters/SwiftVisual.tsx`:

```tsx
import { getTranslations } from "next-intl/server";

function LoadBar({
  label,
  value,
  width,
  highlight
}: {
  label: string;
  value: string;
  width: string;
  highlight: boolean;
}) {
  return (
    <div>
      <dt className="flex justify-between font-mono text-sm">
        <span className="text-fg-muted">{label}</span>
        <span className={highlight ? "text-accent" : "text-fg"}>{value}</span>
      </dt>
      <dd className="bg-bg mt-2 h-3 rounded-full">
        <div
          className={`h-full rounded-full ${highlight ? "bg-accent" : "bg-fg-muted"}`}
          style={{ width }}
        />
      </dd>
    </div>
  );
}

// Phase 4 turns these bars into a pinned, scrubbed loading animation.
export async function SwiftVisual() {
  const t = await getTranslations("work.swift");

  return (
    <figure className="rounded-card border-border bg-bg-elevated border p-6">
      <figcaption className="text-fg-muted font-mono text-sm">
        {t("caption")}
      </figcaption>
      <dl className="mt-6 space-y-5">
        <LoadBar
          label={t("before")}
          value={t("beforeValue")}
          width="100%"
          highlight={false}
        />
        <LoadBar
          label={t("after")}
          value={t("afterValue")}
          width="18%"
          highlight
        />
      </dl>
    </figure>
  );
}
```

Create `src/features/work/chapters/OneloyaltyVisual.tsx`:

```tsx
import { getTranslations } from "next-intl/server";

interface Greeting {
  text: string;
  lang: string;
}

// Phase 4 morphs these greetings into one another with SplitText.
export async function OneloyaltyVisual() {
  const t = await getTranslations("work.oneloyalty");
  const greetings = t.raw("greetings") as Greeting[];

  return (
    <figure className="rounded-card border-border bg-bg-elevated border p-6">
      <figcaption className="text-fg-muted font-mono text-sm">
        {t("caption")}
      </figcaption>
      <ul className="mt-6 grid grid-cols-2 gap-3">
        {greetings.map((greeting) => (
          <li
            key={greeting.lang}
            lang={greeting.lang}
            className="rounded-card border-border border px-3 py-2 font-mono text-sm"
          >
            {greeting.text}
          </li>
        ))}
      </ul>
    </figure>
  );
}
```

Create `src/features/work/chapters/SafeBulkVisual.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { site } from "@/shared/lib/site";

// Phase 4 pins these cards and flips through them step by step.
export async function SafeBulkVisual() {
  const t = await getTranslations("work.safebulk");
  const steps = t.raw("steps") as string[];

  return (
    <figure className="rounded-card border-border bg-bg-elevated border p-6">
      <figcaption className="text-fg-muted font-mono text-sm">
        {t("caption")}
      </figcaption>
      <ol className="mt-6 space-y-3">
        {steps.map((step, index) => (
          <li
            key={step}
            className="rounded-card border-border bg-bg border p-4"
            style={{ marginLeft: `${index * 1.25}rem` }}
          >
            <span className="text-accent block font-mono text-xs">
              {t("stepLabel", { number: index + 1 })}
            </span>
            <span className="mt-1 block">{step}</span>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap gap-4 font-mono text-sm">
        <a
          href={site.safebulkRepo}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline underline-offset-4"
        >
          {t("github")}
        </a>
        <a
          href={site.safebulkDemo}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline underline-offset-4"
        >
          {t("demo")}
        </a>
      </div>
    </figure>
  );
}
```

- [ ] **Step 9: Create the section**

Create `src/features/work/WorkSection.tsx`:

```tsx
import type { JSX } from "react";
import { getTranslations } from "next-intl/server";
import { getWork } from "@/shared/content";
import type { Locale } from "@/shared/i18n/routing";
import { Section } from "@/shared/ui/Section";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { chapterOrder, type ChapterKey } from "./chapter-order";
import { OneloyaltyVisual } from "./chapters/OneloyaltyVisual";
import { SafeBulkVisual } from "./chapters/SafeBulkVisual";
import { SwiftVisual } from "./chapters/SwiftVisual";
import { WorkChapter } from "./WorkChapter";

const visuals: Record<ChapterKey, () => Promise<JSX.Element>> = {
  swift: SwiftVisual,
  oneloyalty: OneloyaltyVisual,
  safebulk: SafeBulkVisual
};

export async function WorkSection({ locale }: { locale: Locale }) {
  const t = await getTranslations("work");
  const bySlug = new Map(
    getWork(locale).map((entry) => [entry.doc.slug, entry])
  );

  return (
    <Section id="work" titleId="work-title">
      <SectionTitle id="work-title">{t("title")}</SectionTitle>
      <div className="mt-4">
        {chapterOrder.map(({ slug, key }, index) => {
          const entry = bySlug.get(slug);
          if (!entry) return null;
          const Visual = visuals[key];

          return (
            <WorkChapter
              key={slug}
              index={index + 1}
              slug={slug}
              title={entry.doc.title}
              summary={entry.doc.summary}
              tags={entry.doc.tags}
              metric={t(`${key}.metric`)}
              readLabel={t("readCaseStudy")}
              visual={<Visual />}
            />
          );
        })}
      </div>
    </Section>
  );
}
```

- [ ] **Step 10: Add Work to the home page**

In `src/app/[locale]/page.tsx`, add the import and insert `<WorkSection>` between About and Skills. `locale` is a `string` there, so narrow it first:

```tsx
import { notFound } from "next/navigation";
import { WorkSection } from "@/features/work/WorkSection";
import { isValidLocale } from "@/shared/i18n/routing";
```

```tsx
const { locale } = await params;
if (!isValidLocale(locale)) notFound();
setRequestLocale(locale);

return (
  <>
    <HeroSection />
    <AboutSection />
    <WorkSection locale={locale} />
    <SkillsSection />
    <ContactSection />
  </>
);
```

Also extend the section list in `e2e/home.spec.ts` — in both the `renders the About, Skills, and Contact sections` test and the no-JS test, change `["about", "skills", "contact"]` to `["about", "work", "skills", "contact"]`.

- [ ] **Step 11: Run e2e to verify they pass**

Run: `pnpm test:e2e e2e/work.spec.ts e2e/home.spec.ts`
Expected: PASS.

- [ ] **Step 12: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass.

```bash
git add src/features/work "src/app/[locale]/page.tsx" e2e/work.spec.ts e2e/home.spec.ts
git commit -m "feat: add work section with per-project chapters and static visuals

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: MDX renderer and case study pages

**Files:**

- Create: `src/shared/mdx/mdx-utils.ts`
- Create: `src/shared/mdx/mdx-utils.test.ts`
- Create: `src/shared/mdx/MdxContent.tsx`
- Modify: `src/app/[locale]/work/[slug]/page.tsx` (full rewrite)
- Modify: `src/shared/i18n/request.ts`
- Modify: `e2e/work.spec.ts` (append)

**Interfaces:**

- Consumes: `getWorkBySlug`, `getWorkParams` (Task 3); `caseStudy.*` messages (Task 4); `ArticleLayout` (Task 5); `buildMetadata` from `@/shared/seo/build-metadata`; `Link` from `@/shared/i18n/navigation`.
- Produces: `MdxContent({ code }: { code: string })` from `@/shared/mdx/MdxContent`; `textContent(node: ReactNode): string`, `slugify(text: string): string`, `linkKind(href: string): "internal" | "hash" | "external"` from `@/shared/mdx/mdx-utils`. The blog post page in Task 10 reuses `MdxContent` and `ArticleLayout`.

- [ ] **Step 1: Write the failing test**

Create `src/shared/mdx/mdx-utils.test.ts`:

```ts
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { linkKind, slugify, textContent } from "./mdx-utils";

describe("textContent", () => {
  it("flattens strings, numbers, arrays, and elements", () => {
    const node = ["Deep dive: ", createElement("code", null, "npm"), " x", 2];
    expect(textContent(node)).toBe("Deep dive: npm x2");
  });

  it("ignores null, undefined, and booleans", () => {
    expect(textContent([null, undefined, false, "a"])).toBe("a");
  });
});

describe("slugify", () => {
  it("lowercases and joins words with hyphens", () => {
    expect(slugify("Deep dive: an NPM package")).toBe(
      "deep-dive-an-npm-package"
    );
  });

  it("strips Vietnamese diacritics, including đ", () => {
    expect(slugify("Bối cảnh & Vấn đề")).toBe("boi-canh-van-de");
  });
});

describe("linkKind", () => {
  it("classifies hrefs", () => {
    expect(linkKind("/work/swift-performance")).toBe("internal");
    expect(linkKind("#results")).toBe("hash");
    expect(linkKind("https://apps.shopify.com/swift")).toBe("external");
    expect(linkKind("mailto:someone@example.com")).toBe("external");
    expect(linkKind("//cdn.example.com/x")).toBe("external");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/shared/mdx/mdx-utils.test.ts`
Expected: FAIL — `Failed to resolve import "./mdx-utils"`.

- [ ] **Step 3: Implement the helpers**

Create `src/shared/mdx/mdx-utils.ts`:

```ts
import { isValidElement, type ReactNode } from "react";

export function textContent(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textContent(node.props.children);
  }
  return "";
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function linkKind(href: string): "internal" | "hash" | "external" {
  if (href.startsWith("#")) return "hash";
  if (href.startsWith("/") && !href.startsWith("//")) return "internal";
  return "external";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/shared/mdx/mdx-utils.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Create the MDX renderer**

Create `src/shared/mdx/MdxContent.tsx`:

```tsx
import type { ComponentProps, ComponentType } from "react";
import * as runtime from "react/jsx-runtime";
import { Link } from "@/shared/i18n/navigation";
import { linkKind, slugify, textContent } from "./mdx-utils";

const linkClass = "text-accent underline underline-offset-4";

function MdxLink({ href = "", children, ...props }: ComponentProps<"a">) {
  const kind = linkKind(href);
  if (kind === "internal") {
    return (
      <Link href={href} className={linkClass}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      className={linkClass}
      {...(kind === "external"
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
      {...props}
    >
      {children}
    </a>
  );
}

const components = {
  a: MdxLink,
  h2: ({ children }: ComponentProps<"h2">) => (
    <h2
      id={slugify(textContent(children))}
      className="mt-12 scroll-mt-24 text-2xl font-semibold"
    >
      {children}
    </h2>
  ),
  h3: ({ children }: ComponentProps<"h3">) => (
    <h3
      id={slugify(textContent(children))}
      className="mt-8 scroll-mt-24 text-xl font-semibold"
    >
      {children}
    </h3>
  ),
  p: (props: ComponentProps<"p">) => (
    <p className="mt-4 leading-relaxed" {...props} />
  ),
  ul: (props: ComponentProps<"ul">) => (
    <ul className="mt-4 list-disc space-y-2 pl-6" {...props} />
  ),
  ol: (props: ComponentProps<"ol">) => (
    <ol className="mt-4 list-decimal space-y-2 pl-6" {...props} />
  ),
  strong: (props: ComponentProps<"strong">) => (
    <strong className="text-fg font-semibold" {...props} />
  ),
  blockquote: (props: ComponentProps<"blockquote">) => (
    <blockquote
      className="border-accent text-fg-muted mt-6 border-l-2 pl-4"
      {...props}
    />
  ),
  code: (props: ComponentProps<"code">) => (
    <code
      className="bg-bg-elevated rounded px-1.5 py-0.5 font-mono text-[0.9em]"
      {...props}
    />
  ),
  pre: (props: ComponentProps<"pre">) => (
    <pre
      className="rounded-card border-border bg-bg-elevated mt-6 overflow-x-auto border p-4 font-mono text-sm [&_code]:bg-transparent [&_code]:p-0"
      {...props}
    />
  ),
  table: (props: ComponentProps<"table">) => (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props: ComponentProps<"th">) => (
    <th
      className="border-border bg-bg-elevated border px-3 py-2 text-left font-mono"
      {...props}
    />
  ),
  td: (props: ComponentProps<"td">) => (
    <td className="border-border border px-3 py-2 align-top" {...props} />
  ),
  hr: () => <hr className="border-border my-10" />
};

// Velite compiles MDX to a function body that expects the JSX runtime as its
// first argument. Content is authored in this repo, so evaluating it is safe.
function getMdxComponent(code: string) {
  const factory = new Function(code) as (scope: typeof runtime) => {
    default: ComponentType<{ components?: object }>;
  };
  return factory({ ...runtime }).default;
}

export function MdxContent({ code }: { code: string }) {
  const Content = getMdxComponent(code);
  return <Content components={components} />;
}
```

- [ ] **Step 6: Set a time zone for date formatting**

In `src/shared/i18n/request.ts`, add `timeZone` to the returned config (avoids next-intl's `ENVIRONMENT_FALLBACK` warning and keeps build-time dates stable):

```ts
return {
  locale,
  timeZone: "Asia/Ho_Chi_Minh",
  messages: (await import(`./messages/${locale}.json`)).default
};
```

- [ ] **Step 7: Write the failing e2e tests**

Append to `e2e/work.spec.ts`:

```ts
test("a chapter link opens its case study", async ({ page }) => {
  await page.goto("/en");
  await page
    .locator('article[data-chapter="swift-performance"]')
    .getByRole("link", { name: /Read case study/ })
    .click();
  await expect(page).toHaveURL(/\/en\/work\/swift-performance$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Swift");
});

for (const slug of slugs) {
  test(`/en/work/${slug} renders its MDX body`, async ({ page }) => {
    await page.goto(`/en/work/${slug}`);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("article h2#context")).toBeVisible();
  });
}

test("English case studies show no fallback notice", async ({ page }) => {
  await page.goto("/en/work/swift-performance");
  await expect(page.getByTestId("fallback-notice")).toHaveCount(0);
});

test("Vietnamese falls back to English with a notice", async ({ page }) => {
  await page.goto("/vi/work/swift-performance");
  await expect(page.getByTestId("fallback-notice")).toHaveText(
    "Bài viết này hiện chỉ có bằng tiếng Anh."
  );
  await expect(page.locator("article")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("link", { name: /Quay lại dự án/ })
  ).toBeVisible();
});

test("the locale switcher keeps the case study slug", async ({ page }) => {
  await page.goto("/en/work/swift-performance");
  await page
    .getByRole("navigation", { name: "Language" })
    .getByRole("link", { name: /VI/ })
    .click();
  await expect(page).toHaveURL(/\/vi\/work\/swift-performance$/);
});

test("header section links from a case study go to the home section", async ({
  page
}) => {
  await page.goto("/en/work/swift-performance");
  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "About" })
    .click();
  await expect(page).toHaveURL(/\/en\/?#about$/);
  await expect(page.locator("section#about h2")).toBeVisible();
});

test("external MDX links open in a new tab", async ({ page }) => {
  await page.goto("/en/work/safebulk-bulk-editor");
  const link = page
    .locator("article")
    .getByRole("link", { name: "GitHub" })
    .first();
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
});

test("an unknown Vietnamese work slug 404s", async ({ page }) => {
  const response = await page.goto("/vi/work/does-not-exist");
  expect(response?.status()).toBe(404);
});
```

- [ ] **Step 8: Run e2e to verify they fail**

Run: `pnpm test:e2e e2e/work.spec.ts`
Expected: the new case-study tests FAIL (every `/work/*` route 404s because `generateStaticParams` returns `[]`); the "unknown Vietnamese slug" test already passes.

- [ ] **Step 9: Implement the case study page**

Replace `src/app/[locale]/work/[slug]/page.tsx` with:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getFormatter,
  getTranslations,
  setRequestLocale
} from "next-intl/server";
import { getWorkBySlug, getWorkParams } from "@/shared/content";
import { isValidLocale, routing } from "@/shared/i18n/routing";
import { MdxContent } from "@/shared/mdx/MdxContent";
import { buildMetadata } from "@/shared/seo/build-metadata";
import { ArticleLayout } from "@/shared/ui/ArticleLayout";

type Params = Promise<{ locale: string; slug: string }>;

export function generateStaticParams() {
  return getWorkParams();
}

// Unknown slugs 404 at the routing layer instead of rendering on demand.
export const dynamicParams = false;

export async function generateMetadata({
  params
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const entry = isValidLocale(locale) ? getWorkBySlug(slug, locale) : null;
  if (!entry) return {};

  return buildMetadata({
    title: entry.doc.title,
    description: entry.doc.summary,
    path: `/work/${slug}`,
    locale
  });
}

export default async function WorkCaseStudyPage({
  params
}: {
  params: Params;
}) {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) notFound();
  setRequestLocale(locale);

  const entry = getWorkBySlug(slug, locale);
  if (!entry) notFound();

  const t = await getTranslations("caseStudy");
  const format = await getFormatter();
  const { doc, isFallback } = entry;

  return (
    <ArticleLayout
      backHref={{ pathname: "/", hash: "work" }}
      backLabel={t("back")}
      title={doc.title}
      summary={doc.summary}
      meta={t("started", {
        date: format.dateTime(new Date(doc.dateCreated), {
          year: "numeric",
          month: "long"
        })
      })}
      tags={doc.tags}
      notice={isFallback ? t("fallbackNotice") : undefined}
      contentLang={isFallback ? routing.defaultLocale : undefined}
    >
      <MdxContent code={doc.content} />
    </ArticleLayout>
  );
}
```

- [ ] **Step 10: Run e2e to verify they pass**

Run: `pnpm test:e2e e2e/work.spec.ts`
Expected: PASS. If the "header section links" test fails on the URL assertion, check the actual `href` of the About link in the page and adjust only the regex, not the component — the requirement is that the link targets the locale's home page with `#about`.

- [ ] **Step 11: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: all pass; the build output lists 6 prerendered `/[locale]/work/[slug]` pages (3 slugs × 2 locales).

```bash
git add src/shared/mdx src/shared/i18n/request.ts "src/app/[locale]/work" e2e/work.spec.ts
git commit -m "feat: render case study pages from MDX with English fallback

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Blog index and post routes

**Files:**

- Create: `src/app/[locale]/blog/page.tsx`
- Modify: `src/app/[locale]/blog/[slug]/page.tsx` (full rewrite)
- Create: `e2e/blog.spec.ts`

**Interfaces:**

- Consumes: `getPosts`, `getPostBySlug`, `getPostParams` (Task 3); `blog.*`, `caseStudy.fallbackNotice` messages (Task 4); `Container`, `ArticleLayout` (Task 5); `MdxContent` (Task 9); `Link`; `buildMetadata`.
- Produces: `/[locale]/blog` (static list or empty state) and `/[locale]/blog/[slug]` (prerendered per post; currently none). The header's conditional "Blog" link (Task 6) already points at `/blog`.

- [ ] **Step 1: Write the failing e2e tests**

Create `e2e/blog.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("/en/blog shows the empty state", async ({ page }) => {
  await page.goto("/en/blog");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Blog");
  await expect(
    page.getByText("No posts yet — the first ones are on the way.")
  ).toBeVisible();
});

test("/vi/blog shows the Vietnamese empty state", async ({ page }) => {
  await page.goto("/vi/blog");
  await expect(
    page.getByText("Chưa có bài viết nào — những bài đầu tiên sắp ra mắt.")
  ).toBeVisible();
});

test("the header hides the Blog link while there are no posts", async ({
  page
}) => {
  await page.goto("/en");
  await expect(
    page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Blog" })
  ).toHaveCount(0);
});

test("an unknown blog slug 404s", async ({ page }) => {
  const response = await page.goto("/en/blog/does-not-exist");
  expect(response?.status()).toBe(404);
});
```

- [ ] **Step 2: Run e2e to verify they fail**

Run: `pnpm test:e2e e2e/blog.spec.ts`
Expected: the two empty-state tests FAIL (`/en/blog` 404s); the header and unknown-slug tests pass.

- [ ] **Step 3: Create the blog index**

Create `src/app/[locale]/blog/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getFormatter,
  getTranslations,
  setRequestLocale
} from "next-intl/server";
import { getPosts } from "@/shared/content";
import { Link } from "@/shared/i18n/navigation";
import { isValidLocale } from "@/shared/i18n/routing";
import { buildMetadata } from "@/shared/seo/build-metadata";
import { Container } from "@/shared/ui/Container";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });

  return buildMetadata({
    title: t("title"),
    description: t("description"),
    path: "/blog",
    locale
  });
}

export default async function BlogIndexPage({ params }: { params: Params }) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("blog");
  const format = await getFormatter();
  const posts = getPosts(locale);

  return (
    <Container size="narrow" className="py-12 sm:py-16">
      <h1 className="text-3xl font-bold sm:text-4xl">{t("title")}</h1>
      <p className="text-fg-muted mt-4 text-lg">{t("description")}</p>
      {posts.length === 0 ? (
        <p className="rounded-card border-border bg-bg-elevated text-fg-muted mt-10 border p-6">
          {t("empty")}
        </p>
      ) : (
        <ul className="mt-10 space-y-8">
          {posts.map(({ doc }) => (
            <li key={doc.slug}>
              <article>
                <h2 className="text-xl font-semibold">
                  <Link
                    href={`/blog/${doc.slug}`}
                    className="hover:text-accent"
                  >
                    {doc.title}
                  </Link>
                </h2>
                <p className="text-fg-muted mt-1 font-mono text-sm">
                  {format.dateTime(new Date(doc.datePublished), {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </p>
                <p className="text-fg-muted mt-2">{doc.summary}</p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
```

- [ ] **Step 4: Implement the post page**

Replace `src/app/[locale]/blog/[slug]/page.tsx` with:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getFormatter,
  getTranslations,
  setRequestLocale
} from "next-intl/server";
import { getPostBySlug, getPostParams } from "@/shared/content";
import { isValidLocale, routing } from "@/shared/i18n/routing";
import { MdxContent } from "@/shared/mdx/MdxContent";
import { buildMetadata } from "@/shared/seo/build-metadata";
import { ArticleLayout } from "@/shared/ui/ArticleLayout";

type Params = Promise<{ locale: string; slug: string }>;

export function generateStaticParams() {
  return getPostParams();
}

// Unknown slugs 404 at the routing layer instead of rendering on demand.
export const dynamicParams = false;

export async function generateMetadata({
  params
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const entry = isValidLocale(locale) ? getPostBySlug(slug, locale) : null;
  if (!entry) return {};

  return buildMetadata({
    title: entry.doc.title,
    description: entry.doc.summary,
    path: `/blog/${slug}`,
    locale
  });
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) notFound();
  setRequestLocale(locale);

  const entry = getPostBySlug(slug, locale);
  if (!entry) notFound();

  const t = await getTranslations("blog");
  const tCaseStudy = await getTranslations("caseStudy");
  const format = await getFormatter();
  const { doc, isFallback } = entry;

  return (
    <ArticleLayout
      backHref="/blog"
      backLabel={t("back")}
      title={doc.title}
      summary={doc.summary}
      meta={format.dateTime(new Date(doc.datePublished), {
        year: "numeric",
        month: "long",
        day: "numeric"
      })}
      tags={doc.tags}
      notice={isFallback ? tCaseStudy("fallbackNotice") : undefined}
      contentLang={isFallback ? routing.defaultLocale : undefined}
    >
      <MdxContent code={doc.content} />
    </ArticleLayout>
  );
}
```

- [ ] **Step 5: Run e2e to verify they pass**

Run: `pnpm test:e2e e2e/blog.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: all pass; `/[locale]/blog` is listed as prerendered for `en` and `vi`.

```bash
git add "src/app/[locale]/blog" e2e/blog.spec.ts
git commit -m "feat: add blog index with empty state and blog post route

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Full verification and budget report

**Files:**

- No source changes expected. If a check fails, fix it in the file that owns the behavior and commit it separately.

- [ ] **Step 1: Run the full quality gate**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: all pass.

- [ ] **Step 2: Confirm static prerendering**

In the `pnpm build` route table, confirm these routes are marked ● (SSG) and none are ƒ (dynamic): `/[locale]`, `/[locale]/work/[slug]` (6 paths), `/[locale]/blog`, `/[locale]/blog/[slug]` (0 paths).

- [ ] **Step 3: Record the JS budget**

From the same build output, note the "First Load JS" for `/[locale]` and the shared chunk size. Expected: well under 150 KB. Report the figure in the hand-off message (it is informational until Lighthouse CI arrives in Phase 3).

- [ ] **Step 4: Run the full e2e suite**

Make sure nothing is listening on port 3000 (`lsof -i :3000`), then run: `pnpm test:e2e`
Expected: all specs pass — `home`, `theme`, `layout`, `work`, `blog`.

- [ ] **Step 5: Check formatting**

Run: `pnpm format:check`
Expected: pass. If it fails, run `pnpm format`, review the diff, and commit:

```bash
git add -A
git commit -m "style: apply prettier formatting

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Manual visual check**

Run `pnpm dev`, open `http://localhost:3000/en` and `/vi`, and check at 375px and 1280px widths in both themes: no overflow, readable contrast, the theme toggle icon matches the theme, the mobile menu opens, and case study pages render tables and code blocks inside their containers. Stop the dev server afterwards so it doesn't shadow the e2e server.
