# Home Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recode the root page (`/[locale]`) — header, hero, about, work, skills, contact, footer — to match the "Home — Desktop 1440" and "Home — Mobile 390" boards in `docs/Portfolio Wireframes.html`, as static Server Components.

**Architecture:** Restyle each existing feature section in place (`src/features/*`) and extract the wireframe's repeated patterns into small presentational primitives in `src/shared/ui`. Copy moves into next-intl messages (both locales); locale-invariant work data lives in `features/work/chapter-order.ts`. The only new client code is a tiny `CopyEmailButton`.

**Tech Stack:** Next.js 15 App Router, React 19, next-intl 3, Tailwind CSS v4, Velite, Vitest (jsdom) + `react-dom/server`, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-27-home-redesign-design.md`

## Global Constraints

- Work directly on the current branch `phase-2`. No new branch, no worktree.
- Layering `app → features → shared`; a lower layer never imports a higher one (ESLint boundaries). Never suppress a boundaries error.
- Server Components by default. `"use client"` only for `shared/theme/ThemeToggle.tsx`, `features/layout/LocaleSwitcher.tsx`, and (new, Task 8) `features/contact/CopyEmailButton.tsx`.
- No hardcoded user-facing strings: every piece of copy is a key in **both** `src/shared/i18n/messages/en.json` and `vi.json`, edited in the same commit. `messages.test.ts` fails on any key/array-length/placeholder mismatch.
- No new runtime or dev dependencies. (Lighthouse in Task 9 runs once via `npx`, not installed.)
- Colors only through tokens (`bg`, `bg-elevated`, `bg-muted`, `fg`, `fg-muted`, `accent`, `accent-fg`, `earth`, `border`). `bg-muted` and `earth` are **fills only, never text**.
- Radii: cards `rounded-card` (12px), buttons `rounded-md` (6px), chips `rounded-xs` (2px).
- Wide container: `max-w-[80rem]` with `lg:px-10` → 1200px content at 1440px (matches the wireframe).
- Swift numbers are "12–13s → 1–3s" everywhere.
- Every placeholder slot is `aria-hidden="true"` and has no text.
- Done = `pnpm lint && pnpm typecheck && pnpm test && pnpm build` and `pnpm test:e2e` all pass.
- Before any `pnpm test:e2e` run, make sure nothing is listening on port 3000 (`lsof -ti:3000 | xargs kill` if needed); Playwright's `webServer` reuses an existing server locally and would test stale code.
- Commit messages end with a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Run `pnpm format` before each commit (Prettier with the Tailwind plugin sorts classes).

## Review Focus

1. **Phone-width Vietnamese copy** (375px, `/vi`): longer strings and the long email address must not cause horizontal scroll. → Task 8 extends the overflow test to both locales.
2. **Light theme fills**: `bg-muted` bars/blocks must stay visible on `bg-elevated` in both themes, and nobody uses `bg-muted`/`earth` as a text color. → Task 1 adds a fill-contrast test and a source guard test.
3. **No JavaScript**: the copy button is inert, so the `mailto:` link must still be present and correct. → Task 8 adds a no-JS assertion.
4. **Clipboard failure** (insecure context, permission denied): clicking Copy must not throw or claim success. → Task 8 unit-tests the rejected-promise path.
5. **Screen-reader/keyboard order in the reversed chapter**: the visual is shown first on desktop but the DOM must keep the heading first; the hamburger must have an accessible name. → Task 6 asserts DOM order; Task 3 opens the menu by its accessible name.

---

### Task 1: Tokens — add `bg-muted`, map `earth`

**Files:**

- Modify: `src/shared/theme/tokens.ts`
- Modify: `src/app/globals.css`
- Test: `src/shared/theme/tokens.test.ts`

**Interfaces:**

- Produces: Tailwind utilities `bg-bg-muted` and `bg-earth` (used by Tasks 6); `ColorToken` gains `"bg-muted"`.

- [ ] **Step 0: Record the JS baseline**

Run: `pnpm build 2>&1 | grep -E "○|●|ƒ|First Load" | head -20`
Note the "First Load JS" value for the `/[locale]` route in your task report — Task 10 compares against it.

- [ ] **Step 1: Write the failing tests**

In `src/shared/theme/tokens.test.ts`, add to the imports:

```ts
import { readdirSync } from "node:fs";
```

Append at the end of the file:

```ts
describe("decorative fills", () => {
  for (const theme of themes) {
    it(`${theme}: bg-muted is visible on bg-elevated (at least 1.25:1)`, () => {
      expect(
        contrast(
          colorTokens[theme]["bg-muted"],
          colorTokens[theme]["bg-elevated"]
        )
      ).toBeGreaterThanOrEqual(1.25);
    });
  }

  it("never uses bg-muted or earth as a text color", () => {
    const root = path.resolve(process.cwd(), "src");
    const files = readdirSync(root, { recursive: true, encoding: "utf8" })
      .filter((file) => file.endsWith(".tsx"))
      .map((file) => path.join(root, file));

    for (const file of files) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(
        /\btext-(bg-muted|earth)\b/
      );
    }
  });
});
```

In `src/shared/theme/tokens.ts`, add `"bg-muted"` to the `ColorToken` union (after `"bg-elevated"`), and add the values:

```ts
  dark: {
    bg: "#1A1A1C",
    "bg-elevated": "#242427",
    "bg-muted": "#3A3A40",
    ...
  light: {
    bg: "#F5F4F0",
    "bg-elevated": "#FFFFFF",
    "bg-muted": "#E6E3DA",
    ...
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/shared/theme/tokens.test.ts`
Expected: FAIL — "declares every light token" / "declares every dark token" (globals.css lacks `--bg-muted`). The fill-contrast and guard tests pass.

- [ ] **Step 3: Implement in `globals.css`**

Add `--bg-muted` after `--bg-elevated` in all three blocks:

```css
:root {
  --bg: #f5f4f0;
  --bg-elevated: #ffffff;
  --bg-muted: #e6e3da;
  ...
}

[data-theme="dark"] {
  --bg: #1a1a1c;
  --bg-elevated: #242427;
  --bg-muted: #3a3a40;
  ...
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    --bg: #1a1a1c;
    --bg-elevated: #242427;
    --bg-muted: #3a3a40;
    ...
  }
}
```

Replace the comment and extend the `@theme inline` block:

```css
/* --bg-muted and --earth are decorative fills only, never text colors. */
@theme inline {
  --color-bg: var(--bg);
  --color-bg-elevated: var(--bg-elevated);
  --color-bg-muted: var(--bg-muted);
  --color-fg: var(--fg);
  --color-fg-muted: var(--fg-muted);
  --color-accent: var(--accent);
  --color-accent-fg: var(--accent-fg);
  --color-earth: var(--earth);
  --color-border: var(--border);
  ...unchanged...
}
```

Also in `@layer base`, change `section[id] { scroll-margin-top: 5rem; }` to `6rem` (the header grows to 80px in Task 3).

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/shared/theme/tokens.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
pnpm format
git add src/shared/theme/tokens.ts src/shared/theme/tokens.test.ts src/app/globals.css
git commit -m "feat: add bg-muted token and map earth as a decorative fill"
```

---

### Task 2: Shared UI primitives

**Files:**

- Create: `src/shared/ui/Eyebrow.tsx`, `src/shared/ui/SectionHeading.tsx`, `src/shared/ui/Stat.tsx`, `src/shared/ui/PlaceholderSlot.tsx`, `src/shared/ui/StackedLines.tsx`
- Modify: `src/shared/ui/Container.tsx`, `src/shared/ui/TagList.tsx`, `src/shared/ui/ButtonLink.tsx`, `src/shared/ui/Section.tsx`
- Test: `src/shared/ui/primitives.test.tsx`

**Interfaces:**

- Produces (all named exports):
  - `Eyebrow({ tone?: "muted" | "accent"; className?: string; children: ReactNode })` → `<p>`
  - `SectionHeading({ id: string; index: number; label: string; size?: "lg" | "xl"; children: ReactNode })`
  - `interface StatEntry { value: string; label: string }` and `Stat({ value, label, size?: "lg" | "md" })` → `<div><dt/><dd/></div>` (parent supplies `<dl>`)
  - `PlaceholderSlot(props: Omit<ComponentProps<"div">, "children">)` — always `aria-hidden="true"`
  - `StackedLines({ lines: readonly string[] })`
  - `Container` gains `size="wide"`; `TagList` gains `variant?: "outline" | "filled"`; `ButtonLink` gains `size?: "md" | "lg"`; `Section` uses a top border and `Container size="wide"`.
- `SectionTitle` stays for now (Task 8 deletes it after its last consumer is gone).

- [ ] **Step 1: Write the failing tests**

Create `src/shared/ui/primitives.test.tsx`:

```tsx
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlaceholderSlot } from "./PlaceholderSlot";
import { SectionHeading } from "./SectionHeading";
import { StackedLines } from "./StackedLines";
import { Stat } from "./Stat";
import { TagList } from "./TagList";

function render(node: ReactElement): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(node);
  return host;
}

describe("SectionHeading", () => {
  it("numbers the eyebrow and ids the h2", () => {
    const host = render(
      <SectionHeading id="work-title" index={2} label="Work">
        Selected work
      </SectionHeading>
    );
    expect(host.querySelector("p")?.textContent).toBe("02 / Work");
    const heading = host.querySelector("h2");
    expect(heading?.id).toBe("work-title");
    expect(heading?.textContent).toBe("Selected work");
  });
});

describe("Stat", () => {
  it("puts the label in dt before the value in dd", () => {
    const host = render(
      <dl>
        <Stat value="1–3s" label="load, from 12–13s" />
      </dl>
    );
    const pair = host.querySelector("dl > div");
    expect(pair?.firstElementChild?.tagName).toBe("DT");
    expect(host.querySelector("dt")?.textContent).toBe("load, from 12–13s");
    expect(host.querySelector("dd")?.textContent).toBe("1–3s");
  });
});

describe("StackedLines", () => {
  it("renders one block per line and reads as a single phrase", () => {
    const host = render(
      <h1>
        <StackedLines lines={["Nguyen", "Thanh Dat"]} />
      </h1>
    );
    expect(host.querySelectorAll("h1 > span")).toHaveLength(2);
    expect(host.textContent).toBe("Nguyen Thanh Dat");
  });
});

describe("PlaceholderSlot", () => {
  it("is hidden from assistive tech, empty, and forwards data attributes", () => {
    const host = render(<PlaceholderSlot data-hero-canvas-slot="" />);
    const slot = host.firstElementChild;
    expect(slot?.getAttribute("aria-hidden")).toBe("true");
    expect(slot?.hasAttribute("data-hero-canvas-slot")).toBe(true);
    expect(slot?.textContent).toBe("");
  });
});

describe("TagList", () => {
  it.each(["outline", "filled"] as const)(
    "renders one list item per tag (%s)",
    (variant) => {
      const host = render(
        <TagList tags={["React", "Vite"]} variant={variant} />
      );
      expect(host.querySelectorAll("li")).toHaveLength(2);
    }
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/shared/ui/primitives.test.tsx`
Expected: FAIL — cannot resolve `./PlaceholderSlot`, `./SectionHeading`, `./StackedLines`, `./Stat`.

- [ ] **Step 3: Implement the new primitives**

`src/shared/ui/Eyebrow.tsx`:

```tsx
import type { ReactNode } from "react";
import { cx } from "@/shared/lib/cx";

// Uppercased by CSS so the message catalogs stay in sentence case.
export function Eyebrow({
  tone = "muted",
  className,
  children
}: {
  tone?: "muted" | "accent";
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={cx(
        "font-mono text-xs font-medium tracking-[0.08em] uppercase",
        tone === "accent" ? "text-accent" : "text-fg-muted",
        className
      )}
    >
      {children}
    </p>
  );
}
```

`src/shared/ui/SectionHeading.tsx`:

```tsx
import type { ReactNode } from "react";
import { cx } from "@/shared/lib/cx";
import { Eyebrow } from "./Eyebrow";

const sizes = {
  lg: "text-3xl font-semibold md:text-[2.5rem]",
  xl: "text-[2.5rem] font-bold tracking-[-0.03em] md:text-[4rem]"
} as const;

export function SectionHeading({
  id,
  index,
  label,
  size = "lg",
  children
}: {
  id: string;
  index: number;
  label: string;
  size?: keyof typeof sizes;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Eyebrow tone="accent">
        {String(index).padStart(2, "0")} / {label}
      </Eyebrow>
      <h2 id={id} className={cx("leading-[1.1]", sizes[size])}>
        {children}
      </h2>
    </div>
  );
}
```

`src/shared/ui/Stat.tsx`:

```tsx
import { cx } from "@/shared/lib/cx";

export interface StatEntry {
  value: string;
  label: string;
}

const sizes = {
  lg: { value: "text-5xl", label: "text-sm" },
  md: { value: "text-[1.75rem]", label: "text-[0.8125rem]" }
} as const;

// dt comes first in the DOM (label, then value) but the value shows on top.
export function Stat({
  value,
  label,
  size = "md"
}: StatEntry & { size?: keyof typeof sizes }) {
  return (
    <div className="flex flex-col-reverse gap-1">
      <dt className={cx("text-fg-muted", sizes[size].label)}>{label}</dt>
      <dd
        className={cx(
          "text-accent font-mono font-medium tracking-[-0.02em]",
          sizes[size].value
        )}
      >
        {value}
      </dd>
    </div>
  );
}
```

`src/shared/ui/PlaceholderSlot.tsx`:

```tsx
import type { ComponentProps } from "react";
import { cx } from "@/shared/lib/cx";

// Reserves space for media that arrives later (photo, 3D canvas); callers set
// the aspect ratio so swapping in the real thing causes no layout shift.
export function PlaceholderSlot({
  className,
  ...props
}: Omit<ComponentProps<"div">, "children">) {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={cx(
        "rounded-card border-border border border-dashed",
        className
      )}
    />
  );
}
```

`src/shared/ui/StackedLines.tsx`:

```tsx
import { Fragment } from "react";

// Each line is its own block so headings break where the copy says, while the
// text content stays one space-separated phrase for assistive tech and tests.
export function StackedLines({ lines }: { lines: readonly string[] }) {
  return lines.map((line, index) => (
    <Fragment key={line}>
      {index > 0 ? " " : null}
      <span className="block">{line}</span>
    </Fragment>
  ));
}
```

- [ ] **Step 4: Update the existing primitives**

`src/shared/ui/Container.tsx` — replace the `widths` map and the `className` expression:

```tsx
const widths = {
  default: "max-w-5xl",
  narrow: "max-w-3xl",
  wide: "max-w-[80rem] lg:px-10"
} as const;
```

(The `cx("mx-auto w-full px-4 sm:px-6", widths[size], className)` call stays as is; `lg:px-10` wins at `lg`.)

`src/shared/ui/TagList.tsx`:

```tsx
import { cx } from "@/shared/lib/cx";

const variants = {
  outline: "border border-border px-2.5 py-1 text-xs text-fg-muted",
  filled: "bg-bg-elevated px-3 py-1.5 text-[0.8125rem] text-fg"
} as const;

export function TagList({
  tags,
  variant = "outline",
  className
}: {
  tags: readonly string[];
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <ul className={cx("flex flex-wrap gap-2", className)}>
      {tags.map((tag) => (
        <li key={tag} className={cx("rounded-xs font-mono", variants[variant])}>
          {tag}
        </li>
      ))}
    </ul>
  );
}
```

`src/shared/ui/ButtonLink.tsx`:

```tsx
import type { ComponentProps } from "react";
import { cx } from "@/shared/lib/cx";

const variants = {
  primary: "bg-accent text-accent-fg hover:opacity-90",
  secondary:
    "border border-border text-fg hover:border-accent hover:text-accent"
} as const;

const sizes = {
  md: "h-12 px-6 text-[0.9375rem]",
  lg: "h-14 px-7 text-base"
} as const;

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"a"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <a
      className={cx(
        "inline-flex items-center justify-center rounded-md font-mono font-semibold transition-colors",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
```

`src/shared/ui/Section.tsx` — change the section class and the container:

```tsx
<section
  id={id}
  aria-labelledby={titleId}
  className={cx("border-border py-section border-t", className)}
>
  <Container size="wide">{children}</Container>
</section>
```

- [ ] **Step 5: Run tests, typecheck, lint**

Run: `pnpm test src/shared/ui/primitives.test.tsx && pnpm typecheck && pnpm lint`
Expected: PASS, no type or lint errors.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add src/shared/ui
git commit -m "feat: add eyebrow, section heading, stat, and placeholder primitives"
```

---

### Task 3: Header

**Files:**

- Modify: `src/features/layout/SiteHeader.tsx`, `src/features/layout/LocaleSwitcher.tsx`, `src/shared/theme/ThemeToggle.tsx`
- Modify: `src/shared/i18n/messages/en.json`, `vi.json` (`nav.brand`)
- Test: `e2e/layout.spec.ts`

**Interfaces:**

- Consumes: `Container size="wide"` (Task 2).
- Produces: nothing new for later tasks.

- [ ] **Step 1: Write the failing e2e tests**

In `e2e/layout.spec.ts`, add after the "the header lists section links" test:

```ts
test("the brand reads dat.nguyen and links home by name", async ({ page }) => {
  await page.goto("/en/work/swift-performance");
  const brand = page.getByRole("link", { name: "Nguyen Thanh Dat — home" });
  await expect(brand).toHaveText("dat.nguyen");
  await expect(brand).toHaveAttribute("href", /^\/en\/?$/);
});
```

Replace the body of the mobile "the menu opens and its links are reachable" test:

```ts
test("the menu opens and its links are reachable", async ({ page }) => {
  await page.goto("/en");
  await page.locator("summary", { hasText: "Menu" }).click();
  const mobileNav = page.getByRole("navigation", { name: "Primary" });
  await expect(mobileNav.getByRole("link", { name: "Skills" })).toBeVisible();
});
```

- [ ] **Step 2: Run to verify the brand test fails**

Run: `pnpm test:e2e e2e/layout.spec.ts`
Expected: FAIL — "the brand reads dat.nguyen…" (text is "Nguyen Thanh Dat"). Other tests pass.

- [ ] **Step 3: Update messages**

`en.json` → `"nav": { ..., "brand": "dat.nguyen", ... }`
`vi.json` → `"nav": { ..., "brand": "dat.nguyen", ... }`

- [ ] **Step 4: Restyle `SiteHeader.tsx`**

Replace the `links` constant and the returned `<header>`:

```tsx
const linkClass = "text-fg-muted hover:text-fg font-mono text-sm";

const links = (
  <ul className="flex flex-col gap-4 md:flex-row md:gap-10">
    {sections.map((id) => (
      <li key={id}>
        <Link href={{ pathname: "/", hash: id }} className={linkClass}>
          {t(id)}
        </Link>
      </li>
    ))}
    {hasPosts ? (
      <li>
        <Link href="/blog" className={linkClass}>
          {t("blog")}
        </Link>
      </li>
    ) : null}
  </ul>
);
```

```tsx
<header className="border-border bg-bg/90 sticky top-0 z-40 border-b backdrop-blur">
  <Container
    size="wide"
    className="flex h-16 items-center justify-between gap-4 md:h-20"
  >
    <Link
      href="/"
      aria-label={t("homeLabel")}
      className="font-mono text-lg font-bold tracking-[-0.02em]"
    >
      {t("brand")}
    </Link>
    <nav aria-label={t("primary")} className="hidden md:block">
      {links}
    </nav>
    <div className="flex items-center gap-3">
      <LocaleSwitcher
        current={locale}
        label={t("language")}
        names={{ en: tLocales("en"), vi: tLocales("vi") }}
      />
      <ThemeToggle label={tTheme("toggle")} />
      <details className="relative md:hidden">
        <summary className="border-border text-fg inline-flex size-9 cursor-pointer list-none items-center justify-center rounded-md border [&::-webkit-details-marker]:hidden">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="size-4"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          <span className="sr-only">{t("menu")}</span>
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
```

(The skip link above `<header>` is unchanged.)

- [ ] **Step 5: Restyle `LocaleSwitcher.tsx` as an `EN / VI` pill**

Replace the returned JSX:

```tsx
return (
  <nav aria-label={label}>
    <ul className="border-border flex h-9 items-center rounded-md border px-3 font-mono text-[0.8125rem]">
      {routing.locales.map((locale, index) => (
        <li key={locale} className="flex items-center">
          {index > 0 ? (
            <span aria-hidden="true" className="text-fg-muted px-1.5">
              /
            </span>
          ) : null}
          <Link
            href={pathname}
            locale={locale}
            hrefLang={locale}
            aria-current={locale === current ? "true" : undefined}
            className={cx(
              "py-1",
              locale === current ? "text-accent" : "text-fg-muted hover:text-fg"
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
```

- [ ] **Step 6: Resize `ThemeToggle.tsx`**

In the `<button>` className replace `rounded-card` → `rounded-md` and `size-10` → `size-9`; in both `<svg>` classNames replace `size-5` → `size-4`.

- [ ] **Step 7: Run tests**

Run: `pnpm test && pnpm test:e2e e2e/layout.spec.ts e2e/theme.spec.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
pnpm format
git add src/features/layout src/shared/theme/ThemeToggle.tsx src/shared/i18n/messages e2e/layout.spec.ts
git commit -m "feat: restyle the header to match the wireframe"
```

---

### Task 4: Hero

**Files:**

- Modify: `src/features/hero/HeroSection.tsx`
- Modify: `en.json`, `vi.json` (`hero`)
- Test: `e2e/home.spec.ts`

**Interfaces:**

- Consumes: `Eyebrow`, `StackedLines`, `PlaceholderSlot`, `ButtonLink`, `Container size="wide"` (Task 2).
- Produces: nothing new. Keeps `section#top`, `h1#hero-title`, `[data-hero-canvas-slot]` (Phase 5 hooks).

- [ ] **Step 1: Write the failing e2e tests**

Append to `e2e/home.spec.ts`:

```ts
test("the hero View work button jumps to the work section", async ({
  page
}) => {
  await page.goto("/en");
  await expect(
    page.locator("#top").getByRole("link", { name: "View work" })
  ).toHaveAttribute("href", "#work");
});

test.describe("mobile hero", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("shows the avatar slot above the headline", async ({ page }) => {
    await page.goto("/en");
    const slot = page.locator("[data-hero-canvas-slot]");
    await expect(slot).toBeVisible();
    await expect(slot).toHaveAttribute("aria-hidden", "true");
    const slotBox = await slot.boundingBox();
    const titleBox = await page.locator("h1").boundingBox();
    expect(slotBox?.y ?? Infinity).toBeLessThan(titleBox?.y ?? -Infinity);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm test:e2e e2e/home.spec.ts`
Expected: FAIL — "View work" link not found (label is "See my work"); mobile slot not visible (`hidden md:block`).

- [ ] **Step 3: Update messages**

Replace the `hero` object in `en.json`:

```json
  "hero": {
    "role": "Front-End Engineer · Ho Chi Minh City",
    "titleLines": ["Nguyen", "Thanh Dat"],
    "tagline": "I build fast, well-structured React & TypeScript apps — 4 years shipping Shopify embedded apps for global merchants.",
    "ctaWork": "View work",
    "ctaCv": "Download CV",
    "scrollHint": "Scroll"
  },
```

Replace the `hero` object in `vi.json`:

```json
  "hero": {
    "role": "Kỹ sư Front-End · TP. Hồ Chí Minh",
    "titleLines": ["Nguyễn", "Thành Đạt"],
    "tagline": "Mình xây ứng dụng React & TypeScript nhanh, có cấu trúc — 4 năm làm Shopify embedded app cho merchant trên toàn thế giới.",
    "ctaWork": "Xem dự án",
    "ctaCv": "Tải CV",
    "scrollHint": "Cuộn"
  },
```

- [ ] **Step 4: Rewrite `HeroSection.tsx`**

```tsx
import { getTranslations } from "next-intl/server";
import { site } from "@/shared/lib/site";
import { ButtonLink } from "@/shared/ui/ButtonLink";
import { Container } from "@/shared/ui/Container";
import { Eyebrow } from "@/shared/ui/Eyebrow";
import { PlaceholderSlot } from "@/shared/ui/PlaceholderSlot";
import { StackedLines } from "@/shared/ui/StackedLines";

export async function HeroSection() {
  const t = await getTranslations("hero");
  const titleLines = t.raw("titleLines") as string[];

  return (
    <section id="top" aria-labelledby="hero-title">
      <Container
        size="wide"
        className="relative grid items-center gap-10 py-10 md:min-h-[calc(100dvh-5rem)] md:grid-cols-2 md:gap-12 md:py-16"
      >
        <div className="flex flex-col gap-6">
          <Eyebrow>{t("role")}</Eyebrow>
          <h1
            id="hero-title"
            className="text-5xl leading-none font-bold tracking-[-0.03em] md:text-7xl"
          >
            <StackedLines lines={titleLines} />
          </h1>
          <p className="text-fg-muted max-w-[32.5rem] text-lg leading-relaxed md:text-xl">
            {t("tagline")}
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <ButtonLink href="#work">{t("ctaWork")}</ButtonLink>
            <ButtonLink href={site.cv} download variant="secondary">
              {t("ctaCv")}
            </ButtonLink>
          </div>
        </div>
        {/* Phase 5 mounts the canvas here (and a static avatar on mobile);
            the fixed aspect ratio keeps CLS at 0. */}
        <PlaceholderSlot
          data-hero-canvas-slot=""
          className="order-first aspect-[4/3] w-full md:order-none md:aspect-[7/8]"
        />
        <p
          aria-hidden="true"
          className="text-fg-muted absolute bottom-8 left-10 hidden font-mono text-xs tracking-[0.08em] uppercase md:block"
        >
          {t("scrollHint")} ↓
        </p>
      </Container>
    </section>
  );
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm test && pnpm test:e2e e2e/home.spec.ts e2e/layout.spec.ts`
Expected: PASS (the existing h1 tests still see "Nguyen Thanh Dat" / "Nguyễn Thành Đạt").

- [ ] **Step 6: Commit**

```bash
pnpm format
git add src/features/hero src/shared/i18n/messages e2e/home.spec.ts
git commit -m "feat: rebuild the hero with a two-line name and a mobile avatar slot"
```

---

### Task 5: About

**Files:**

- Modify: `src/features/about/AboutSection.tsx`
- Modify: `en.json`, `vi.json` (`about`)
- Test: `e2e/home.spec.ts`

**Interfaces:**

- Consumes: `Section`, `SectionHeading`, `PlaceholderSlot`, `Stat`, `StatEntry` (Task 2).

- [ ] **Step 1: Write the failing e2e test**

Append to `e2e/home.spec.ts`:

```ts
const aboutTitles = {
  en: "From fresher to mid-level engineer",
  vi: "Từ fresher đến kỹ sư mid-level"
} as const;

for (const locale of ["en", "vi"] as const) {
  test(`/${locale} About shows the title, three stats, and a timeline`, async ({
    page
  }) => {
    await page.goto(`/${locale}`);
    const about = page.locator("section#about");
    await expect(about.locator("h2")).toHaveText(aboutTitles[locale]);
    await expect(about.locator("dl dd")).toHaveCount(3);
    await expect(about.locator("ol li")).toHaveCount(3);
    await expect(about.locator("ol li").first()).toContainText("2022");
  });
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test:e2e e2e/home.spec.ts -g "About shows"`
Expected: FAIL — h2 is "About" / "Giới thiệu"; no `ol`.

- [ ] **Step 3: Update messages**

Replace the `about` object in `en.json`:

```json
  "about": {
    "label": "About",
    "title": "From fresher to mid-level engineer",
    "lead": "Front-End Engineer with ~4 years building Shopify embedded apps. I rebuilt a production client from legacy JavaScript to strict TypeScript, helped restructure a multi-app monorepo into a layered architecture, and designed an 8-language i18n loader.",
    "body": "For every feature I write the spec before the code, agree on API contracts early, and use AI tools like Claude and Copilot to move faster on refactors — then verify the result myself.",
    "stats": [
      { "value": "4", "label": "years of front-end" },
      { "value": "3", "label": "Shopify apps shipped" },
      { "value": "8", "label": "languages in one i18n system" }
    ],
    "timeline": [
      { "year": "2022", "text": "Joined FireGroup — Swift" },
      { "year": "2024", "text": "Oneloyalty monorepo" },
      { "year": "2026", "text": "SafeBulk (side project)" }
    ]
  },
```

Replace the `about` object in `vi.json`:

```json
  "about": {
    "label": "Giới thiệu",
    "title": "Từ fresher đến kỹ sư mid-level",
    "lead": "Kỹ sư Front-End với ~4 năm xây dựng Shopify embedded app. Mình đã viết lại một client production từ JavaScript cũ sang TypeScript strict, cùng tái cấu trúc một monorepo nhiều app theo kiến trúc phân lớp, và thiết kế bộ nạp i18n cho 8 ngôn ngữ.",
    "body": "Với mỗi tính năng, mình viết spec trước khi code, thống nhất API contract sớm, và dùng các công cụ AI như Claude và Copilot để refactor nhanh hơn — rồi tự kiểm chứng kết quả.",
    "stats": [
      { "value": "4", "label": "năm làm front-end" },
      { "value": "3", "label": "Shopify app đã ra mắt" },
      { "value": "8", "label": "ngôn ngữ trong một hệ i18n" }
    ],
    "timeline": [
      { "year": "2022", "text": "Gia nhập FireGroup — Swift" },
      { "year": "2024", "text": "Monorepo Oneloyalty" },
      { "year": "2026", "text": "SafeBulk (dự án cá nhân)" }
    ]
  },
```

- [ ] **Step 4: Rewrite `AboutSection.tsx`**

```tsx
import { getTranslations } from "next-intl/server";
import { PlaceholderSlot } from "@/shared/ui/PlaceholderSlot";
import { Section } from "@/shared/ui/Section";
import { SectionHeading } from "@/shared/ui/SectionHeading";
import { Stat, type StatEntry } from "@/shared/ui/Stat";

interface Milestone {
  year: string;
  text: string;
}

export async function AboutSection() {
  const t = await getTranslations("about");
  const stats = t.raw("stats") as StatEntry[];
  const timeline = t.raw("timeline") as Milestone[];

  return (
    <Section id="about" titleId="about-title">
      <SectionHeading id="about-title" index={1} label={t("label")}>
        {t("title")}
      </SectionHeading>
      <div className="mt-12 grid gap-8 md:grid-cols-12 md:gap-12">
        {/* Portrait photo goes here later (next/image, same aspect ratio). */}
        <PlaceholderSlot className="aspect-[4/3] w-full md:col-span-4 md:aspect-[3/4]" />
        <div className="flex flex-col gap-8 md:col-span-8">
          <p className="max-w-[42.5rem] text-lg leading-[1.7]">{t("lead")}</p>
          <p className="text-fg-muted max-w-[42.5rem] leading-[1.7]">
            {t("body")}
          </p>
          <dl className="border-border grid grid-cols-3 gap-6 border-y py-8">
            {stats.map((stat) => (
              <Stat key={stat.label} {...stat} size="lg" />
            ))}
          </dl>
          <ol className="grid gap-6 text-sm sm:grid-cols-3">
            {timeline.map((milestone) => (
              <li key={milestone.year} className="flex flex-col gap-1">
                <span className="font-mono">{milestone.year}</span>
                <span className="text-fg-muted">{milestone.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm test && pnpm test:e2e e2e/home.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
pnpm format
git add src/features/about src/shared/i18n/messages e2e/home.spec.ts
git commit -m "feat: rebuild About with portrait slot, stats row, and timeline"
```

---

### Task 6: Work

**Files:**

- Modify: `src/features/work/chapter-order.ts`, `chapter-order.test.ts`, `WorkSection.tsx`, `WorkChapter.tsx`, `chapters/SwiftVisual.tsx`, `chapters/OneloyaltyVisual.tsx`, `chapters/SafeBulkVisual.tsx`
- Modify: `src/app/[locale]/page.tsx` (`<WorkSection />` no longer takes `locale`)
- Modify: `en.json`, `vi.json` (`work`)
- Test: `src/features/work/chapter-order.test.ts`, `e2e/work.spec.ts`

**Interfaces:**

- Consumes: `Section`, `SectionHeading`, `Eyebrow`, `Stat`, `StatEntry`, `TagList`, utilities `bg-bg-muted`/`bg-earth` (Tasks 1–2).
- Produces:

```ts
export type ChapterLink = "github" | "demo";
export const chapterOrder: readonly {
  slug: string;
  key: "swift" | "oneloyalty" | "safebulk";
  affiliation: string | null;
  period: string;
  tags: readonly string[];
  links: readonly ChapterLink[];
}[];
export type ChapterKey = (typeof chapterOrder)[number]["key"];
```

- [ ] **Step 1: Write the failing unit tests**

Replace `src/features/work/chapter-order.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getWork, getWorkBySlug } from "@/shared/content";
import en from "@/shared/i18n/messages/en.json";
import vi from "@/shared/i18n/messages/vi.json";
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

  it.each([
    ["en", en],
    ["vi", vi]
  ] as const)(
    "gives every chapter a title, a summary, and exactly two stats in %s",
    (_locale, messages) => {
      const work = messages.work as Record<string, unknown>;
      for (const { key } of chapterOrder) {
        const entry = work[key] as {
          title?: string;
          summary?: string;
          stats?: Array<{ value: string; label: string }>;
        };
        expect(entry.title, key).toBeTruthy();
        expect(entry.summary, key).toBeTruthy();
        expect(entry.stats, key).toHaveLength(2);
      }
    }
  );
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/features/work/chapter-order.test.ts`
Expected: FAIL — `title` undefined for `swift` in en.

- [ ] **Step 3: Update `chapter-order.ts`**

```ts
// Narrative order on the home page: fast → structured → trustworthy.
// Kept free of React imports so it can be unit-tested against real content.
// Holds only locale-invariant data; chapter copy lives in the messages.
export type ChapterLink = "github" | "demo";

interface Chapter {
  slug: string;
  key: string;
  affiliation: string | null;
  period: string;
  tags: readonly string[];
  links: readonly ChapterLink[];
}

export const chapterOrder = [
  {
    slug: "swift-performance",
    key: "swift",
    affiliation: "FireGroup",
    period: "2022–2024",
    tags: ["React 18", "TypeScript", "App Bridge", "Code splitting"],
    links: []
  },
  {
    slug: "oneloyalty-layered-architecture",
    key: "oneloyalty",
    affiliation: "FireGroup",
    period: "2024–2026",
    tags: ["Turborepo", "React Query v5", "GraphQL", "i18next"],
    links: []
  },
  {
    slug: "safebulk-bulk-editor",
    key: "safebulk",
    affiliation: null,
    period: "2026",
    tags: ["React", "TypeScript", "Polaris", "CSV"],
    links: ["github", "demo"]
  }
] as const satisfies readonly Chapter[];

export type ChapterKey = (typeof chapterOrder)[number]["key"];
```

- [ ] **Step 4: Update messages**

Replace the `work` object in `en.json`:

```json
  "work": {
    "label": "Selected work",
    "title": "Selected work",
    "readCaseStudy": "Read case study",
    "sideProject": "Side project",
    "links": { "github": "GitHub", "demo": "Demo" },
    "swift": {
      "title": "Swift — SEO & Speed Suite",
      "summary": "Rebuilt the client from legacy JS to strict TypeScript and React 18, then cut load time with code splitting, session tokens and vendor chunking.",
      "stats": [
        { "value": "1–3s", "label": "load, from 12–13s" },
        { "value": "2 teams", "label": "adopted the NPM package" }
      ],
      "caption": "Initial load",
      "beforeLabel": "{value} before",
      "beforeValue": "12–13s",
      "afterValue": "1–3s",
      "steps": ["Code splitting", "Session tokens", "Vendor chunking"]
    },
    "oneloyalty": {
      "title": "Oneloyalty — Loyalty & Rewards",
      "summary": "Helped unify Admin apps, Storefront extensions and shared packages in one Turborepo, moved my features to a layered architecture, and designed a dependency-injection i18n loader.",
      "stats": [
        { "value": "40+", "label": "components de-duplicated" },
        { "value": "5–10 min", "label": "stable CI builds" }
      ],
      "componentsCaption": "40+ shared components",
      "i18nCaption": "i18n · 8 languages",
      "counter": "{current} / {total}",
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
      "title": "SafeBulk — Bulk Product Editor",
      "summary": "Sole front-end developer. A 3-step bulk-edit wizard with per-row preview, resumable CSV import/export, and long-running jobs tracked by polling — in strict TypeScript with zero any types.",
      "stats": [
        { "value": "12.6k", "label": "lines of TypeScript" },
        { "value": "520+", "label": "i18n keys" }
      ],
      "caption": "Bulk edit wizard",
      "stepLabel": "Step {number}",
      "steps": [
        "Filter products",
        "Configure rules",
        "Preview with per-row severity"
      ]
    }
  },
```

Replace the `work` object in `vi.json`:

```json
  "work": {
    "label": "Dự án tiêu biểu",
    "title": "Dự án tiêu biểu",
    "readCaseStudy": "Đọc case study",
    "sideProject": "Dự án cá nhân",
    "links": { "github": "GitHub", "demo": "Demo" },
    "swift": {
      "title": "Swift — Bộ công cụ SEO & tốc độ",
      "summary": "Viết lại client từ JS cũ sang TypeScript strict và React 18, rồi giảm thời gian tải bằng code splitting, session token và tách vendor chunk.",
      "stats": [
        { "value": "1–3s", "label": "tải trang, từ 12–13s" },
        { "value": "2 team", "label": "dùng package NPM nội bộ" }
      ],
      "caption": "Tải lần đầu",
      "beforeLabel": "{value} trước đây",
      "beforeValue": "12–13s",
      "afterValue": "1–3s",
      "steps": ["Code splitting", "Session token", "Tách vendor chunk"]
    },
    "oneloyalty": {
      "title": "Oneloyalty — Loyalty & Rewards",
      "summary": "Cùng hợp nhất các Admin app, Storefront extension và package dùng chung vào một Turborepo, chuyển các tính năng của mình sang kiến trúc phân lớp, và thiết kế bộ nạp i18n theo dependency injection.",
      "stats": [
        { "value": "40+", "label": "component được gộp lại" },
        { "value": "5–10 phút", "label": "build CI ổn định" }
      ],
      "componentsCaption": "40+ component dùng chung",
      "i18nCaption": "i18n · 8 ngôn ngữ",
      "counter": "{current} / {total}",
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
      "title": "SafeBulk — Trình sửa sản phẩm hàng loạt",
      "summary": "Front-end developer duy nhất. Wizard chỉnh sửa hàng loạt 3 bước với xem trước từng dòng, import/export CSV có thể tiếp tục, và theo dõi job chạy lâu bằng polling — TypeScript strict, không dùng kiểu any.",
      "stats": [
        { "value": "12.6k", "label": "dòng TypeScript" },
        { "value": "520+", "label": "key i18n" }
      ],
      "caption": "Wizard chỉnh sửa hàng loạt",
      "stepLabel": "Bước {number}",
      "steps": [
        "Lọc sản phẩm",
        "Thiết lập quy tắc",
        "Xem trước mức độ từng dòng"
      ]
    }
  },
```

- [ ] **Step 5: Run the unit tests**

Run: `pnpm test src/features/work/chapter-order.test.ts src/shared/i18n/messages/messages.test.ts`
Expected: PASS

- [ ] **Step 6: Write the failing e2e tests**

Append to `e2e/work.spec.ts`:

```ts
test("SafeBulk links to its source and demo next to the case study link", async ({
  page
}) => {
  await page.goto("/en");
  const chapter = page.locator('article[data-chapter="safebulk-bulk-editor"]');
  await expect(
    chapter.getByRole("link", { name: "GitHub", exact: true })
  ).toHaveAttribute(
    "href",
    "https://github.com/nguyenthanhdat22012001/safe-bulk-shopify"
  );
  await expect(
    chapter.getByRole("link", { name: "Demo", exact: true })
  ).toHaveAttribute("href", /loom\.com/);
});

test("every chapter shows exactly two stats", async ({ page }) => {
  await page.goto("/en");
  for (const slug of slugs) {
    await expect(
      page.locator(`article[data-chapter="${slug}"] dl dd`)
    ).toHaveCount(2);
  }
});

test("the second chapter shows its visual first on desktop but keeps the heading first in the DOM", async ({
  page
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/en");
  const chapter = page.locator(
    'article[data-chapter="oneloyalty-layered-architecture"]'
  );
  const figureBox = await chapter.locator("figure").boundingBox();
  const titleBox = await chapter.locator("h3").boundingBox();
  expect(figureBox?.x ?? Infinity).toBeLessThan(titleBox?.x ?? -Infinity);
  const firstTag = await chapter
    .locator("h3, figure")
    .first()
    .evaluate((element) => element.tagName);
  expect(firstTag).toBe("H3");
});

test("the Oneloyalty visual keeps all eight greetings for screen readers", async ({
  page
}) => {
  await page.goto("/en");
  await expect(
    page.locator(
      'article[data-chapter="oneloyalty-layered-architecture"] figure li[lang]'
    )
  ).toHaveCount(8);
});
```

- [ ] **Step 7: Rewrite `WorkChapter.tsx`**

```tsx
import type { ReactNode } from "react";
import { Link } from "@/shared/i18n/navigation";
import { cx } from "@/shared/lib/cx";
import { Eyebrow } from "@/shared/ui/Eyebrow";
import { Stat, type StatEntry } from "@/shared/ui/Stat";
import { TagList } from "@/shared/ui/TagList";

export function WorkChapter({
  slug,
  eyebrow,
  title,
  summary,
  stats,
  tags,
  readLabel,
  links,
  visual,
  reversed
}: {
  slug: string;
  eyebrow: string;
  title: string;
  summary: string;
  stats: readonly StatEntry[];
  tags: readonly string[];
  readLabel: string;
  links: readonly { href: string; label: string }[];
  visual: ReactNode;
  reversed: boolean;
}) {
  const titleId = `work-${slug}-title`;

  // The DOM keeps text before the visual so reading order never changes;
  // only the visual order flips (visual first on mobile and when reversed).
  return (
    <article
      aria-labelledby={titleId}
      data-chapter={slug}
      className="border-border grid gap-8 border-t py-12 first:border-t-0 md:grid-cols-12 md:items-center md:gap-12 md:py-20"
    >
      <div className="flex flex-col gap-5 md:col-span-5">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3
          id={titleId}
          className="text-2xl leading-tight font-semibold md:text-[1.75rem]"
        >
          {title}
        </h3>
        <p className="text-fg-muted leading-[1.7]">{summary}</p>
        <dl className="flex flex-wrap gap-8">
          {stats.map((stat) => (
            <Stat key={stat.label} {...stat} />
          ))}
        </dl>
        <TagList tags={tags} />
        <div className="flex flex-wrap gap-6 font-mono text-[0.9375rem] font-medium">
          <Link href={`/work/${slug}`} className="text-accent hover:underline">
            {readLabel}
            <span className="sr-only">: {title}</span>
            <span aria-hidden="true">&nbsp;→</span>
          </Link>
          {links.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-fg-muted hover:text-fg"
            >
              {label}
              <span aria-hidden="true">&nbsp;↗</span>
            </a>
          ))}
        </div>
      </div>
      <div
        className={cx(
          "order-first md:col-span-7",
          reversed ? "md:order-first" : "md:order-last"
        )}
      >
        {visual}
      </div>
    </article>
  );
}
```

- [ ] **Step 8: Rewrite `WorkSection.tsx`**

```tsx
import type { JSX } from "react";
import { getTranslations } from "next-intl/server";
import { site } from "@/shared/lib/site";
import { Section } from "@/shared/ui/Section";
import { SectionHeading } from "@/shared/ui/SectionHeading";
import type { StatEntry } from "@/shared/ui/Stat";
import {
  chapterOrder,
  type ChapterKey,
  type ChapterLink
} from "./chapter-order";
import { OneloyaltyVisual } from "./chapters/OneloyaltyVisual";
import { SafeBulkVisual } from "./chapters/SafeBulkVisual";
import { SwiftVisual } from "./chapters/SwiftVisual";
import { WorkChapter } from "./WorkChapter";

const visuals: Record<ChapterKey, () => Promise<JSX.Element>> = {
  swift: SwiftVisual,
  oneloyalty: OneloyaltyVisual,
  safebulk: SafeBulkVisual
};

const linkHrefs: Record<ChapterLink, string> = {
  github: site.safebulkRepo,
  demo: site.safebulkDemo
};

export async function WorkSection() {
  const t = await getTranslations("work");

  return (
    <Section id="work" titleId="work-title">
      <SectionHeading id="work-title" index={2} label={t("label")}>
        {t("title")}
      </SectionHeading>
      <div className="mt-8 md:mt-4">
        {chapterOrder.map((chapter, index) => {
          const Visual = visuals[chapter.key];
          const eyebrow = [
            String(index + 1).padStart(2, "0"),
            chapter.affiliation ?? t("sideProject"),
            chapter.period
          ].join(" · ");

          return (
            <WorkChapter
              key={chapter.slug}
              slug={chapter.slug}
              eyebrow={eyebrow}
              title={t(`${chapter.key}.title`)}
              summary={t(`${chapter.key}.summary`)}
              stats={t.raw(`${chapter.key}.stats`) as StatEntry[]}
              tags={chapter.tags}
              readLabel={t("readCaseStudy")}
              links={chapter.links.map((link) => ({
                href: linkHrefs[link],
                label: t(`links.${link}`)
              }))}
              visual={<Visual />}
              reversed={index % 2 === 1}
            />
          );
        })}
      </div>
    </Section>
  );
}
```

In `src/app/[locale]/page.tsx` change `<WorkSection locale={locale} />` to `<WorkSection />`.

- [ ] **Step 9: Rewrite the three visuals**

`chapters/SwiftVisual.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/shared/ui/Eyebrow";

const markers = ["①", "②", "③"];

// Phase 4 turns the bars into a pinned, scrubbed loading animation.
export async function SwiftVisual() {
  const t = await getTranslations("work.swift");
  const steps = t.raw("steps") as string[];

  return (
    <figure className="rounded-card bg-bg-elevated flex flex-col justify-center gap-8 p-6 md:min-h-[27.5rem] md:p-10">
      <figcaption>
        <Eyebrow>{t("caption")}</Eyebrow>
      </figcaption>
      <div className="flex flex-col gap-2.5">
        <div aria-hidden="true" className="bg-bg-muted h-3 w-full rounded-xs" />
        <p className="text-fg-muted font-mono text-sm line-through">
          {t("beforeLabel", { value: t("beforeValue") })}
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        <div aria-hidden="true" className="bg-accent h-3 w-[15%] rounded-xs" />
        <p className="text-accent font-mono text-5xl font-medium tracking-[-0.02em]">
          {t("afterValue")}
        </p>
      </div>
      <ol className="text-fg-muted flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs">
        {steps.map((step, index) => (
          <li key={step}>
            <span aria-hidden="true">{markers[index]} </span>
            {step}
          </li>
        ))}
      </ol>
    </figure>
  );
}
```

`chapters/OneloyaltyVisual.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { cx } from "@/shared/lib/cx";
import { Eyebrow } from "@/shared/ui/Eyebrow";

interface Greeting {
  text: string;
  lang: string;
}

const blockColors = {
  muted: "bg-bg-muted",
  fg: "bg-fg-muted",
  earth: "bg-earth"
} as const;

const blocks: ReadonlyArray<keyof typeof blockColors> = [
  "muted",
  "fg",
  "muted",
  "muted",
  "muted",
  "muted",
  "earth",
  "muted",
  "fg",
  "muted",
  "muted",
  "muted"
];

// Phase 4 morphs the greeting through all eight languages with SplitText.
export async function OneloyaltyVisual() {
  const t = await getTranslations("work.oneloyalty");
  const greetings = t.raw("greetings") as [Greeting, ...Greeting[]];
  const [first] = greetings;

  return (
    <figure className="rounded-card bg-bg-elevated grid gap-8 p-6 sm:grid-cols-2 md:min-h-[27.5rem] md:p-10">
      <div className="flex flex-col gap-4">
        <Eyebrow>{t("componentsCaption")}</Eyebrow>
        <div aria-hidden="true" className="grid grid-cols-4 gap-2">
          {blocks.map((color, index) => (
            <div
              key={index}
              className={cx("h-11 rounded-xs", blockColors[color])}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <Eyebrow>{t("i18nCaption")}</Eyebrow>
        <div className="rounded-card border-border flex min-h-40 grow flex-col items-center justify-center gap-2 border border-dashed">
          <p
            aria-hidden="true"
            lang={first.lang}
            className="font-mono text-[2.75rem] font-semibold tracking-[-0.02em]"
          >
            {first.text}
          </p>
          <p aria-hidden="true" className="text-fg-muted font-mono text-xs">
            {t("counter", { current: 1, total: greetings.length })}
          </p>
          <ul className="sr-only">
            {greetings.map((greeting) => (
              <li key={greeting.lang} lang={greeting.lang}>
                {greeting.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </figure>
  );
}
```

`chapters/SafeBulkVisual.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { cx } from "@/shared/lib/cx";

// Desktop overlaps the cards like a deck; mobile shows a plain list.
const placement = [
  "md:top-0 md:right-20 md:left-0 md:h-[16.25rem]",
  "md:top-20 md:right-10 md:left-10 md:h-[16.25rem]",
  "md:top-[10.625rem] md:right-0 md:left-20 md:h-[16.875rem]"
];

// Phase 4 pins these cards and flips through them step by step.
export async function SafeBulkVisual() {
  const t = await getTranslations("work.safebulk");
  const steps = t.raw("steps") as string[];

  return (
    <figure>
      <figcaption className="sr-only">{t("caption")}</figcaption>
      <ol className="flex flex-col gap-3 md:relative md:block md:h-[27.5rem]">
        {steps.map((step, index) => {
          const active = index === steps.length - 1;
          return (
            <li
              key={step}
              className={cx(
                "rounded-card flex flex-col gap-3 border p-5 md:absolute md:p-7",
                placement[index],
                active ? "border-accent bg-bg-elevated" : "border-border bg-bg"
              )}
            >
              <span
                className={cx(
                  "font-mono text-xs tracking-[0.08em] uppercase",
                  active ? "text-accent" : "text-fg-muted"
                )}
              >
                {t("stepLabel", { number: index + 1 })}
              </span>
              <span
                className={cx(
                  "font-mono text-lg md:text-xl",
                  active ? "text-fg" : "text-fg-muted"
                )}
              >
                {step}
              </span>
              {active ? (
                <div aria-hidden="true" className="flex flex-col gap-2">
                  <div className="bg-bg-muted h-2.5 w-[90%] rounded-xs" />
                  <div className="bg-bg-muted h-2.5 w-[70%] rounded-xs" />
                  <div className="bg-earth h-2.5 w-[80%] rounded-xs" />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
```

- [ ] **Step 10: Run all checks**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e e2e/work.spec.ts e2e/home.spec.ts`
Expected: PASS. If `pnpm lint` flags `react/no-array-index-key` on the Oneloyalty blocks, key them as `` `${color}-${index}` `` instead.

- [ ] **Step 11: Commit**

```bash
pnpm format
git add src/features/work "src/app/[locale]/page.tsx" src/shared/i18n/messages e2e/work.spec.ts
git commit -m "feat: rebuild work chapters with stats, alternating layout, and static visuals"
```

---

### Task 7: Skills

**Files:**

- Modify: `src/features/skills/SkillsSection.tsx`
- Modify: `en.json`, `vi.json` (`skills`)
- Test: `e2e/home.spec.ts`

**Interfaces:**

- Consumes: `Section`, `SectionHeading`, `TagList variant="filled"` (Task 2).

- [ ] **Step 1: Write the failing e2e tests**

Append to `e2e/home.spec.ts`:

```ts
test("Skills is a toolbox of six labelled groups", async ({ page }) => {
  await page.goto("/en");
  const skills = page.locator("section#skills");
  await expect(skills.locator("h2")).toHaveText("Toolbox");
  await expect(skills.locator("h3")).toHaveCount(6);
  await expect(skills.locator("h3").first()).toHaveText("Core");
  await expect(skills.locator("h3").last()).toHaveText("DevOps");
});

test.describe("mobile skills", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("keeps the group labels", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("section#skills h3").first()).toBeVisible();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test:e2e e2e/home.spec.ts -g "toolbox"`
Expected: FAIL — h2 is "Skills".

- [ ] **Step 3: Update messages**

Replace the `skills` object in `en.json`:

```json
  "skills": {
    "label": "Skills",
    "title": "Toolbox",
    "groups": [
      { "name": "Core", "items": ["TypeScript", "React", "HTML / CSS"] },
      {
        "name": "Architecture",
        "items": ["Turborepo", "Layered", "Feature-Driven"]
      },
      {
        "name": "State & data",
        "items": ["React Query", "Zustand", "Redux Toolkit", "GraphQL"]
      },
      {
        "name": "Build & performance",
        "items": ["Vite", "Code splitting", "Web Vitals"]
      },
      { "name": "UI", "items": ["Tailwind", "Polaris", "Figma"] },
      {
        "name": "DevOps",
        "items": ["GitLab CI", "Docker", "NPM publishing"]
      }
    ]
  },
```

Replace the `skills` object in `vi.json`:

```json
  "skills": {
    "label": "Kỹ năng",
    "title": "Bộ công cụ",
    "groups": [
      { "name": "Nền tảng", "items": ["TypeScript", "React", "HTML / CSS"] },
      {
        "name": "Kiến trúc",
        "items": ["Turborepo", "Phân lớp", "Feature-Driven"]
      },
      {
        "name": "State & dữ liệu",
        "items": ["React Query", "Zustand", "Redux Toolkit", "GraphQL"]
      },
      {
        "name": "Build & hiệu năng",
        "items": ["Vite", "Code splitting", "Web Vitals"]
      },
      { "name": "UI", "items": ["Tailwind", "Polaris", "Figma"] },
      {
        "name": "DevOps",
        "items": ["GitLab CI", "Docker", "Publish NPM"]
      }
    ]
  },
```

- [ ] **Step 4: Rewrite `SkillsSection.tsx`**

```tsx
import { getTranslations } from "next-intl/server";
import { Section } from "@/shared/ui/Section";
import { SectionHeading } from "@/shared/ui/SectionHeading";
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
      <SectionHeading id="skills-title" index={3} label={t("label")}>
        {t("title")}
      </SectionHeading>
      <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <div key={group.name} className="flex flex-col gap-3">
            <h3 className="text-fg-muted font-mono text-[0.8125rem] font-normal tracking-normal">
              {group.name}
            </h3>
            <TagList tags={group.items} variant="filled" />
          </div>
        ))}
      </div>
    </Section>
  );
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm test && pnpm test:e2e e2e/home.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
pnpm format
git add src/features/skills src/shared/i18n/messages e2e/home.spec.ts
git commit -m "feat: restyle Skills as a labelled toolbox of chips"
```

---

### Task 8: Contact and `CopyEmailButton`

**Files:**

- Create: `src/features/contact/CopyEmailButton.tsx`, `src/features/contact/CopyEmailButton.test.tsx`
- Modify: `src/features/contact/ContactSection.tsx`, `CLAUDE.md`
- Delete: `src/shared/ui/SectionTitle.tsx` (no consumers left after this task)
- Modify: `en.json`, `vi.json` (`contact`)
- Test: `e2e/home.spec.ts`, `e2e/work.spec.ts`

**Interfaces:**

- Consumes: `Section`, `SectionHeading size="xl"`, `StackedLines`, `ButtonLink size="lg"` (Task 2).
- Produces: `CopyEmailButton({ email: string; label: string; copiedLabel: string; className?: string })`.

- [ ] **Step 1: Write the failing unit tests**

Create `src/features/contact/CopyEmailButton.test.tsx`:

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CopyEmailButton } from "./CopyEmailButton";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

function mockClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true
  });
}

async function renderAndClick() {
  await act(async () => {
    root.render(
      <CopyEmailButton
        email="me@example.com"
        label="Copy email"
        copiedLabel="Copied"
      />
    );
  });
  await act(async () => {
    host.querySelector("button")?.click();
  });
}

const status = () => host.querySelector("[aria-live]")?.textContent;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe("CopyEmailButton", () => {
  it("copies the email and announces it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);
    await renderAndClick();
    expect(writeText).toHaveBeenCalledWith("me@example.com");
    expect(status()).toBe("Copied");
  });

  it("stays silent when the clipboard rejects", async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    await renderAndClick();
    expect(status()).toBe("");
    expect(host.querySelector("button")?.textContent).toBe("Copy email");
  });

  it("resets the announcement after two seconds", async () => {
    vi.useFakeTimers();
    mockClipboard(vi.fn().mockResolvedValue(undefined));
    await renderAndClick();
    expect(status()).toBe("Copied");
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(status()).toBe("");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/features/contact/CopyEmailButton.test.tsx`
Expected: FAIL — cannot resolve `./CopyEmailButton`.

- [ ] **Step 3: Implement `CopyEmailButton.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

// Client-only because the Clipboard API needs a click handler. The mailto
// link rendered beside it is the fallback without JS or clipboard access.
export function CopyEmailButton({
  email,
  label,
  copiedLabel,
  className
}: {
  email: string;
  label: string;
  copiedLabel: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
    } catch {
      // Clipboard unavailable or denied; the mailto link still works.
    }
  }

  return (
    <>
      <button type="button" onClick={copy} className={className}>
        {copied ? copiedLabel : label}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? copiedLabel : ""}
      </span>
    </>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/features/contact/CopyEmailButton.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing e2e tests**

Append to `e2e/home.spec.ts` (top level):

```ts
test("Contact uses the big two-line heading", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("section#contact h2")).toHaveText(
    "Let's build something fast."
  );
});

test("the contact section links to LinkedIn, GitHub, and the CV", async ({
  page
}) => {
  await page.goto("/en");
  const contact = page.locator("#contact");
  await expect(contact.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
    "href",
    /linkedin\.com/
  );
  await expect(contact.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    /github\.com\/nguyenthanhdat22012001$/
  );
  const cv = contact.getByRole("link", { name: "Download CV" });
  await expect(cv).toHaveAttribute("href", "/cv.pdf");
  await expect(cv).toHaveAttribute("download", "");
});

test("the copy button puts the email on the clipboard", async ({
  page,
  context
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/en");
  await page
    .locator("#contact")
    .getByRole("button", { name: "Copy email" })
    .click();
  await expect(page.locator("#contact [aria-live]")).toHaveText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "nguyenthanhdat22012001@gmail.com"
  );
});
```

Inside the existing `test.describe("without JavaScript", ...)` block in `e2e/home.spec.ts`, add:

```ts
test("the email is still reachable as a mailto link", async ({ page }) => {
  await page.goto("/en");
  await expect(
    page.locator("#contact").getByRole("link", {
      name: "nguyenthanhdat22012001@gmail.com"
    })
  ).toHaveAttribute("href", "mailto:nguyenthanhdat22012001@gmail.com");
});
```

In `e2e/work.spec.ts`, replace the mobile "the home page has no horizontal overflow" test with a loop over both locales:

```ts
for (const locale of ["en", "vi"]) {
  test(`/${locale} has no horizontal overflow`, async ({ page }) => {
    await page.goto(`/${locale}`);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
```

- [ ] **Step 6: Run to verify they fail**

Run: `pnpm test:e2e e2e/home.spec.ts -g "Contact|copy button"`
Expected: FAIL — heading is "Let's work together"; no "Copy email" button.

- [ ] **Step 7: Update messages**

Replace the `contact` object in `en.json`:

```json
  "contact": {
    "label": "Contact",
    "titleLines": ["Let's build", "something fast."],
    "description": "Open to front-end roles with remote and international teams.",
    "copyEmail": "Copy email",
    "copied": "Copied",
    "email": "Email",
    "linkedin": "LinkedIn",
    "github": "GitHub",
    "cv": "Download CV"
  },
```

Replace the `contact` object in `vi.json`:

```json
  "contact": {
    "label": "Liên hệ",
    "titleLines": ["Cùng xây", "thứ gì đó thật nhanh."],
    "description": "Mình đang tìm vị trí front-end ở các team remote và quốc tế.",
    "copyEmail": "Sao chép email",
    "copied": "Đã sao chép",
    "email": "Email",
    "linkedin": "LinkedIn",
    "github": "GitHub",
    "cv": "Tải CV"
  },
```

Note: `"email"` stays in both `contact` objects only because `SiteFooter.tsx` still reads `contact.email` until Task 9, which removes it.

- [ ] **Step 8: Rewrite `ContactSection.tsx`**

```tsx
import { getTranslations } from "next-intl/server";
import { site } from "@/shared/lib/site";
import { ButtonLink } from "@/shared/ui/ButtonLink";
import { Section } from "@/shared/ui/Section";
import { SectionHeading } from "@/shared/ui/SectionHeading";
import { StackedLines } from "@/shared/ui/StackedLines";
import { CopyEmailButton } from "./CopyEmailButton";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

export async function ContactSection() {
  const t = await getTranslations("contact");
  const titleLines = t.raw("titleLines") as string[];

  return (
    <Section id="contact" titleId="contact-title">
      <SectionHeading id="contact-title" index={4} label={t("label")} size="xl">
        <StackedLines lines={titleLines} />
      </SectionHeading>
      <p className="text-fg-muted mt-6 max-w-xl">{t("description")}</p>
      <div className="mt-10 flex flex-wrap items-center gap-4">
        <div className="bg-accent text-accent-fg flex w-full flex-col rounded-md font-mono font-semibold sm:w-auto sm:flex-row">
          <a
            href={`mailto:${site.email}`}
            className="flex min-h-14 items-center px-5 text-sm break-all hover:opacity-90 sm:px-7 sm:text-base"
          >
            {site.email}
          </a>
          <CopyEmailButton
            email={site.email}
            label={t("copyEmail")}
            copiedLabel={t("copied")}
            className="border-accent-fg/20 flex min-h-14 items-center border-t px-5 text-sm hover:opacity-90 sm:border-t-0 sm:border-l sm:text-base"
          />
        </div>
        <ButtonLink
          href={site.linkedin}
          variant="secondary"
          size="lg"
          {...external}
        >
          {t("linkedin")}
          <span aria-hidden="true">&nbsp;↗</span>
        </ButtonLink>
        <ButtonLink
          href={site.github}
          variant="secondary"
          size="lg"
          {...external}
        >
          {t("github")}
          <span aria-hidden="true">&nbsp;↗</span>
        </ButtonLink>
        <ButtonLink href={site.cv} download variant="secondary" size="lg">
          {t("cv")}
        </ButtonLink>
      </div>
    </Section>
  );
}
```

- [ ] **Step 9: Delete `SectionTitle` and update CLAUDE.md**

Run: `grep -rn "SectionTitle" src` — expected: only `src/shared/ui/SectionTitle.tsx` itself. Then `git rm src/shared/ui/SectionTitle.tsx`.

In `CLAUDE.md`, replace:

```
  interactive control that cannot work without client JS (currently
  `shared/theme/ThemeToggle.tsx` and `features/layout/LocaleSwitcher.tsx`).
```

with:

```
  interactive control that cannot work without client JS (currently
  `shared/theme/ThemeToggle.tsx`, `features/layout/LocaleSwitcher.tsx`, and
  `features/contact/CopyEmailButton.tsx`, which must sit next to a `mailto:`
  link as its no-JS fallback).
```

- [ ] **Step 10: Run all checks**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e e2e/home.spec.ts e2e/work.spec.ts`
Expected: PASS, including `/vi has no horizontal overflow` at 375px.

- [ ] **Step 11: Commit**

```bash
pnpm format
git add src/features/contact src/shared/ui src/shared/i18n/messages CLAUDE.md e2e/home.spec.ts e2e/work.spec.ts
git commit -m "feat: rebuild Contact with a copy-email button and big heading"
```

---

### Task 9: Footer with stack credit and Lighthouse scores

**Files:**

- Modify: `src/features/layout/SiteFooter.tsx`, `src/shared/lib/site.ts`
- Modify: `en.json`, `vi.json` (`footer`, remove `contact.email`)
- Test: `e2e/layout.spec.ts`

**Interfaces:**

- Produces: `site.lighthouse: { performance: number; accessibility: number; bestPractices: number; seo: number }`.

- [ ] **Step 1: Write the failing e2e test**

In `e2e/layout.spec.ts`, replace the test "the footer links to email, LinkedIn, and GitHub" with:

```ts
test("the footer credits the stack and shows four Lighthouse scores", async ({
  page
}) => {
  await page.goto("/en");
  const footer = page.getByRole("contentinfo");
  await expect(footer).toContainText("Built with Next.js, GSAP, Three.js");
  await expect(footer).toContainText(
    /Lighthouse Performance \d{1,3} · Accessibility \d{1,3} · Best practices \d{1,3} · SEO \d{1,3}/
  );
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test:e2e e2e/layout.spec.ts -g "footer"`
Expected: FAIL — footer has no "Built with" text.

- [ ] **Step 3: Measure the Lighthouse scores**

The page is final except for the footer, so measure now:

```bash
lsof -ti:3000 | xargs kill 2>/dev/null; pnpm build && (pnpm start &) && sleep 5
npx -y lighthouse@12 http://localhost:3000/en \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output-path=/tmp/lh-home.json \
  --chrome-flags="--headless=new" --quiet
node -e 'const r=require("/tmp/lh-home.json");for(const [k,v] of Object.entries(r.categories))console.log(k,Math.round(v.score*100))'
lsof -ti:3000 | xargs kill
```

If Lighthouse cannot find Chrome, prefix the `npx` command with
`CHROME_PATH="$(node -e 'console.log(require("@playwright/test").chromium.executablePath())')"`.
Lighthouse's default preset is mobile, which is what we want. Record the four numbers.

- [ ] **Step 4: Add the scores to `site.ts`**

Add to the `site` object (replace the four numbers with the measured ones from Step 3):

```ts
  // Lighthouse (mobile) for /en, measured by hand on 2026-09-27; replace with
  // Lighthouse CI output once Phase 3 lands.
  lighthouse: {
    performance: 98,
    accessibility: 100,
    bestPractices: 100,
    seo: 100
  }
```

- [ ] **Step 5: Update messages**

Replace the `footer` object in `en.json`:

```json
  "footer": {
    "copyright": "© {year} Nguyen Thanh Dat",
    "builtWith": "Built with Next.js, GSAP, Three.js",
    "lighthouse": {
      "title": "Lighthouse",
      "performance": "Performance",
      "accessibility": "Accessibility",
      "bestPractices": "Best practices",
      "seo": "SEO"
    }
  },
```

Replace the `footer` object in `vi.json`:

```json
  "footer": {
    "copyright": "© {year} Nguyễn Thành Đạt",
    "builtWith": "Xây dựng với Next.js, GSAP, Three.js",
    "lighthouse": {
      "title": "Lighthouse",
      "performance": "Hiệu năng",
      "accessibility": "Trợ năng",
      "bestPractices": "Thực hành tốt",
      "seo": "SEO"
    }
  },
```

Remove `"email": "Email"` from `contact` in both files (the footer no longer uses it).

- [ ] **Step 6: Rewrite `SiteFooter.tsx`**

```tsx
import { Fragment } from "react";
import { getTranslations } from "next-intl/server";
import { site } from "@/shared/lib/site";
import { Container } from "@/shared/ui/Container";

const categories = [
  "performance",
  "accessibility",
  "bestPractices",
  "seo"
] as const;

export async function SiteFooter() {
  const t = await getTranslations("footer");

  return (
    <footer className="border-border border-t">
      <Container
        size="wide"
        className="text-fg-muted flex flex-col gap-4 py-8 font-mono text-xs sm:flex-row sm:items-center sm:justify-between md:min-h-25"
      >
        <p>
          {t("copyright", { year: new Date().getFullYear() })} ·{" "}
          {t("builtWith")}
        </p>
        <p>
          {t("lighthouse.title")}{" "}
          {categories.map((category, index) => (
            <Fragment key={category}>
              {index > 0 ? <span aria-hidden="true"> · </span> : null}
              <span>
                <span className="sr-only">{t(`lighthouse.${category}`)} </span>
                {site.lighthouse[category]}
              </span>
            </Fragment>
          ))}
        </p>
      </Container>
    </footer>
  );
}
```

- [ ] **Step 7: Run all checks**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e e2e/layout.spec.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
pnpm format
git add src/features/layout/SiteFooter.tsx src/shared/lib/site.ts src/shared/i18n/messages e2e/layout.spec.ts
git commit -m "feat: add stack credit and Lighthouse scores to the footer"
```

---

### Task 10: Full verification and visual check

**Files:**

- No source changes expected. Fix-ups found here get their own commit.

- [ ] **Step 1: Run the whole suite**

```bash
lsof -ti:3000 | xargs kill 2>/dev/null
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e
```

Expected: everything PASSES. Report the output honestly if anything fails and fix it before continuing.

- [ ] **Step 2: Compare the JS budget**

From the `pnpm build` output, read "First Load JS" for `/[locale]` and compare with the Task 1 baseline. Expected: an increase under 2 KB (only `CopyEmailButton` is new client code) and well under the 150 KB budget. Put both numbers in the report.

- [ ] **Step 3: Screenshot both themes at both widths**

```bash
(pnpm start &) && sleep 5
for scheme in dark light; do
  npx playwright screenshot --full-page --color-scheme=$scheme --viewport-size=1440,900 http://localhost:3000/en /tmp/home-$scheme-1440.png
  npx playwright screenshot --full-page --color-scheme=$scheme --viewport-size=390,844 http://localhost:3000/en /tmp/home-$scheme-390.png
done
npx playwright screenshot --full-page --color-scheme=dark --viewport-size=390,844 http://localhost:3000/vi /tmp/home-vi-dark-390.png
lsof -ti:3000 | xargs kill
```

Open each PNG next to `docs/Portfolio Wireframes.html` (open that file in a browser). Check:

- Section order, eyebrow numbering `01`–`04`, alternating work layout, placeholder slots present.
- Light theme: `bg-muted` bars/blocks and dashed slots are visible; no low-contrast text.
- 390px: no clipped text, email/copy group stacks, hero slot above the name.

- [ ] **Step 4: Commit any fix-ups**

If Step 3 found issues, fix them, re-run Step 1, and commit:

```bash
pnpm format
git add -A src e2e
git commit -m "fix: polish home redesign after visual review"
```

If nothing needed fixing, skip this step.
