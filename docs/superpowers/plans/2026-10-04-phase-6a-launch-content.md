# Phase 6A — Launch content, VI, hidden blog, 404/footer/README Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land Dat's final case-study content (EN + VI drafts), remove the false Oneloyalty "−55%" claim for good, hide the blog behind a flag, and finish the 404 page, footer and README.

**Architecture:** Content stays Velite MDX validated by `workFrontmatter`; a new optional `draft` field is filtered out of production builds in `shared/content/index.ts`, so every downstream consumer (fallback, hreflang, sitemap, static params) needs no change. The blog is gated by one helper, `isBlogEnabled()`. The 404 page is a Server Component reusing the hero's static SVG with a CSS-only drift.

**Tech Stack:** Next.js 16 (`next build --webpack`), React 19, next-intl 4, Velite 0.2, Tailwind 4, Vitest 2, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-04-phase-6a-launch-content-design.md` (source: `docs/SPEC-phase-6-launch.en.md`). Read both before starting.

**Branch:** work directly on the current branch `phase-6-a`. Do **not** create a new branch or worktree. Commit after every task.

## Global Constraints

- Layering `app → features → shared`; `pnpm lint` boundaries errors mean redesign, never suppress.
- Server Components by default; this plan adds **no** `"use client"` file.
- No hardcoded user-facing strings: every copy change goes into **both** `src/shared/i18n/messages/en.json` and `vi.json` (the shape test in `messages.test.ts` enforces identical key trees and placeholders).
- VI voice: first person "mình", friendly-professional, short sentences. Glossary terms stay English (monorepo, Turborepo, CLS, i18n, MVP, AI-first, …).
- Work frontmatter: `title` ≤ 60 chars, `description` 140–160 chars (Velite `--strict`).
- Case study slugs stay `swift-performance`, `oneloyalty-layered-architecture`, `safebulk-bulk-editor`.
- Nothing in HTML/CSS starts at `opacity: 0` except the documented exceptions in `CLAUDE.md`.
- Respect `prefers-reduced-motion`: the 404 drift only runs under `no-preference`.
- Budgets unchanged: initial JS ≤ 150 KB gzip, 3D chunk ≤ 250 KB, About chunk ≤ 26 KB. This plan only adds server-rendered code plus `next/image` on case study pages.
- Done = `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm check:claims` and `pnpm test:e2e` all pass.
- Commit messages end with: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Review Focus

1. **A VI draft in production must behave exactly like a missing translation** — `/vi/work/<slug>` shows the EN fallback notice, canonical `/en/...`, no hreflang, absent from `sitemap.xml`. Pinned by the e2e fallback tests in Task 6 (they run against `pnpm start`, i.e. production).
2. **Removing `draft` later must need no test edits** — e2e expectations derive from the `.vi.mdx` files. Pinned by `e2e/helpers/content.ts` in Task 6 and used by every VI-dependent assertion.
3. **An MDX `<Image>` whose file is missing must not break the build or the page.** Pinned by the unit test "renders nothing when the file is missing" in Task 2.
4. **The stale-claim gate must not false-positive on build output** (CSS percentages, minified JS). Pinned by Task 4 Step 6 running `check:claims` against a fresh build, and by the patterns test asserting current messages pass.
5. **The 404 page must not pull three.js** and its graph must be visible (the hero CSS hides `[data-graph-state="layered"]` globally). Pinned by the Task 8 e2e asserting the layered SVG is visible and no `<canvas>`/three chunk is requested.

---

## File Map

| File | Change | Task |
| --- | --- | --- |
| `src/shared/content/work-schema.ts` | add `draft` | 1 |
| `src/shared/content/localize.ts` (+ test) | add `withoutDrafts` | 1 |
| `src/shared/content/index.ts` | filter drafts; `isBlogEnabled` | 1, 7 |
| `src/shared/mdx/MdxImage.tsx` (+ test) | new — MDX `Image` → `next/image` | 2 |
| `src/shared/mdx/MdxContent.tsx` | register `Image` | 2 |
| `content/work/*.{en,vi}.mdx` | six adapted files; old three deleted | 3 |
| `public/work/swift/progress.webp` | commit existing file | 3 |
| `src/shared/content/work-content.test.ts` | new expectations, parity, no TODO | 3 |
| `scripts/stale-claims.mjs` + `.d.mts` + `.test.ts` | new — shared pattern list | 4 |
| `scripts/check-stale-claims.mjs` | import patterns | 4 |
| `vitest.config.ts` | include `scripts/**/*.test.ts` | 4 |
| `src/features/work/WorkSection.tsx`, `chapters/OneloyaltyVisual.tsx`, `chapters/ClsDemo.tsx` | CLS value from frontmatter | 4 |
| `src/shared/i18n/messages/{en,vi}.json` | CLS labels, GraphQL, 404, footer | 4, 5, 8, 9 |
| `e2e/helpers/content.ts` | new — `viPublished(slug)` | 6 |
| `e2e/{sitemap,seo-metadata,work,json-ld,blog,home,layout,not-found}.spec.ts` | updates | 3–9 |
| `src/shared/lib/site.ts` | `features.blog`, `lighthouse` shape | 7, 9 |
| `src/features/layout/SiteHeader.tsx` | use `isBlogEnabled` | 7 |
| `src/app/[locale]/blog/page.tsx`, `blog/[slug]/page.tsx` | gate | 7 |
| `src/app/sitemap.ts` | pass no posts when disabled | 7 |
| `src/features/hero/graph/HeroGraphStatic.tsx` (+ test) | `driftNodeId` prop | 8 |
| `src/app/[locale]/not-found.tsx`, `src/app/globals.css` | new 404 | 8 |
| `src/features/layout/lighthouse.ts` (+ test), `SiteFooter.tsx` | 90-day rule, repo link | 9 |
| `README.md`, `CLAUDE.md`, `docs/readme/home.webp` | docs | 10 |

---

### Task 1: `draft` frontmatter, filtered out of production

**Files:**
- Modify: `src/shared/content/work-schema.ts`
- Modify: `src/shared/content/localize.ts`
- Modify: `src/shared/content/index.ts`
- Test: `src/shared/content/localize.test.ts`, `src/shared/content/work-schema.test.ts`

**Interfaces:**
- Produces: `withoutDrafts<T extends { draft?: boolean }>(docs: readonly T[], includeDrafts: boolean): T[]` in `localize.ts`. `Work` type gains `draft?: boolean`. All `get*Work*` functions in `index.ts` return only published docs in production.

- [ ] **Step 1: Write the failing tests**

Append to `src/shared/content/localize.test.ts` (add `withoutDrafts` to the import list at the top):

```ts
describe("withoutDrafts", () => {
  const all = [
    { slug: "a", locale: "en" },
    { slug: "a", locale: "vi", draft: true },
    { slug: "b", locale: "vi", draft: false }
  ] as const;

  it("drops drafts when drafts are excluded", () => {
    expect(withoutDrafts(all, false)).toEqual([all[0], all[2]]);
  });

  it("keeps everything when drafts are included", () => {
    expect(withoutDrafts(all, true)).toEqual(all);
  });
});
```

Append to `src/shared/content/work-schema.test.ts` (it already defines a `valid` fixture and a `parse(patch)` helper):

```ts
it("accepts an optional boolean draft flag", () => {
  expect(workFrontmatter.safeParse({ ...valid, draft: true }).success).toBe(true);
  expect(workFrontmatter.safeParse({ ...valid, draft: "yes" }).success).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/shared/content/localize.test.ts src/shared/content/work-schema.test.ts`
Expected: FAIL — `withoutDrafts` is not exported; `draft: "yes"` currently passes (unknown keys are stripped) so the second assertion fails.

- [ ] **Step 3: Implement**

`work-schema.ts` — add after `dateModified`:

```ts
  dateModified: s.isodate().optional(),
  // Production builds treat a draft as missing (EN fallback); `pnpm dev`
  // renders it so the author can review it in place.
  draft: s.boolean().optional()
```

`localize.ts` — add at the end:

```ts
// Drafts are invisible in production: a draft translation behaves exactly
// like a missing one (EN fallback, no hreflang, no sitemap entry).
export function withoutDrafts<T extends { draft?: boolean }>(
  docs: readonly T[],
  includeDrafts: boolean
): T[] {
  return includeDrafts ? [...docs] : docs.filter((doc) => !doc.draft);
}
```

`index.ts` — replace the top of the file down to the assertions:

```ts
import { blog, work as allWork, type Blog, type Work } from "#site/content";
import type { Locale } from "@/shared/i18n/routing";
import {
  assertDefaultLocale,
  assertUnique,
  availableLocales,
  findForLocale,
  localeParams,
  newestFirst,
  selectForLocale,
  withoutDrafts,
  type Localized
} from "./localize";

const work = withoutDrafts(allWork, process.env.NODE_ENV !== "production");

// Fails the build loudly instead of silently shadowing a translation. Runs on
// the filtered list, so an English draft fails the production build.
assertUnique("work", work);
assertUnique("blog", blog);
assertDefaultLocale("work", work);
assertDefaultLocale("blog", blog);
```

Leave the rest of `index.ts` unchanged (every function already reads `work`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS (all suites).

- [ ] **Step 5: Commit**

```bash
git add src/shared/content
git commit -m "feat(content): add draft frontmatter, hidden in production builds

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: MDX `Image` component

Must land before Task 3: the new Swift MDX uses `<Image>`, and an unregistered component throws at render time.

**Files:**
- Create: `src/shared/mdx/MdxImage.tsx`
- Create: `src/shared/mdx/MdxImage.test.tsx`
- Modify: `src/shared/mdx/MdxContent.tsx`

**Interfaces:**
- Produces: `MdxImage({ src, alt, width, height }: { src: string; alt: string; width: number; height: number }): JSX.Element | null`, registered as `Image` in MDX components.

- [ ] **Step 1: Write the failing test**

`src/shared/mdx/MdxImage.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MdxImage } from "./MdxImage";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("MdxImage", () => {
  it("renders a lazy next/image with the MDX size and the article sizes", () => {
    const html = renderToStaticMarkup(
      <MdxImage
        src="/work/swift/progress.webp"
        alt="Swift progress"
        width={1600}
        height={1000}
      />
    );
    expect(html).toContain('alt="Swift progress"');
    expect(html).toContain('width="1600"');
    expect(html).toContain('height="1000"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('sizes="(min-width: 768px) 720px, 100vw"');
  });

  it("renders nothing when the file is missing and warns in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const html = renderToStaticMarkup(
      <MdxImage src="/work/nope.webp" alt="x" width={10} height={10} />
    );
    expect(html).toBe("");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("/work/nope.webp")
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/shared/mdx/MdxImage.test.tsx`
Expected: FAIL — cannot resolve `./MdxImage`.

- [ ] **Step 3: Implement**

`src/shared/mdx/MdxImage.tsx`:

```tsx
import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";

// MDX `<Image>`: keeps the author's width/height (no CLS) and lazy-loads.
// A file not yet exported renders nothing instead of failing the build.
export function MdxImage({
  src,
  alt,
  width,
  height
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
}) {
  if (!existsSync(path.join(process.cwd(), "public", src))) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`MDX Image: public${src} does not exist; rendering nothing.`);
    }
    return null;
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      sizes="(min-width: 768px) 720px, 100vw"
      className="rounded-card border-border mt-6 h-auto w-full border"
    />
  );
}
```

`MdxContent.tsx` — add the import and register it in `components`:

```tsx
import { MdxImage } from "./MdxImage";
```

```tsx
  hr: () => <hr className="border-border my-10" />,
  Image: MdxImage
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/shared/mdx`
Expected: PASS. If `next/image` fails to render under jsdom because of a missing image config, add `vi.mock("next/image", () => ({ default: (props: Record<string, unknown>) => <img {...props} /> }))` at the top of the test — the test checks our props, not Next's loader.

- [ ] **Step 5: Commit**

```bash
git add src/shared/mdx
git commit -m "feat(mdx): map MDX Image to next/image, render nothing if the file is missing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Swap in the final case studies

**Files:**
- Delete: `content/work/swift-performance.mdx`, `content/work/oneloyalty-layered-architecture.mdx`, `content/work/safebulk-bulk-editor.mdx`
- Create: `content/work/{swift-performance,oneloyalty-layered-architecture,safebulk-bulk-editor}.{en,vi}.mdx`
- Add: `public/work/swift/progress.webp` (already on disk, untracked)
- Modify: `src/shared/content/work-content.test.ts`
- Modify: `e2e/work.spec.ts`

**Interfaces:**
- Consumes: `draft` (Task 1), `Image` (Task 2).
- Produces: content files named `<slug>.<locale>.mdx`; later tasks read `content/work/<slug>.vi.mdx` to know whether VI is published.

- [ ] **Step 1: Update the content unit test first (failing)**

Replace `src/shared/content/work-content.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { getWorkBySlug } from "@/shared/content";

const dir = path.join(process.cwd(), "content/work");
const slugs = [
  "swift-performance",
  "oneloyalty-layered-architecture",
  "safebulk-bulk-editor"
] as const;
const read = (slug: string, locale: "en" | "vi") =>
  readFileSync(path.join(dir, `${slug}.${locale}.mdx`), "utf8");

const doc = (slug: string) => {
  const entry = getWorkBySlug(slug, "en");
  if (!entry) throw new Error(`missing ${slug}`);
  return entry.doc;
};

describe("case-study frontmatter matches the final content", () => {
  it.each([
    ["swift-performance", ["−20%", "JS → TS", "4"], "Team of 9 (2 FE)"],
    ["oneloyalty-layered-architecture", ["≤ 0.1", "2 → 1", "1"], "Team of 9 (2 FE)"],
    ["safebulk-bulk-editor", ["~1.5 mo", "Live", "3"], "1 FE, 1 BE"]
  ])("%s has metrics %j and names its team", (slug, values, team) => {
    expect(doc(slug).metrics.map((m) => m.value)).toEqual(values);
    expect(doc(slug).team).toBe(team);
  });

  it("adds GraphQL to Oneloyalty and the Admin GraphQL API and Claude to SafeBulk", () => {
    expect(doc("oneloyalty-layered-architecture").stack).toContain("GraphQL");
    expect(doc("safebulk-bulk-editor").stack).toEqual(
      expect.arrayContaining(["Shopify Admin GraphQL API", "Claude"])
    );
  });

  it("links SafeBulk to the App Store, GitHub, and the YouTube demo", () => {
    expect(doc("safebulk-bulk-editor").links).toEqual({
      appStore: "https://apps.shopify.com/safebulk-editor",
      github: "https://github.com/nguyenthanhdat22012001/safe-bulk-shopify",
      demo: "https://youtu.be/uaKi8VwIrKE"
    });
  });
});

describe("content files", () => {
  it("are named <slug>.<locale>.mdx, one en and one vi per case study", () => {
    expect(readdirSync(dir).sort()).toEqual(
      slugs.flatMap((s) => [`${s}.en.mdx`, `${s}.vi.mdx`]).sort()
    );
  });

  it.each(slugs.flatMap((s) => [[s, "en"], [s, "vi"]] as const))(
    "%s.%s has no TODO(Dat), opens with Context, and carries no stale claim",
    (slug, locale) => {
      const source = read(slug, locale);
      expect(source).not.toContain("TODO(Dat)");
      expect(source).toMatch(/\n## (Context|Bối cảnh)\n/);
      for (const stale of [
        "12–13s", "1–3s", "8–9s", "40+", "5–10 min", "12.6k", "520+",
        "8 languages", "4 tiers", "loom.com", "55%", "14 kB", "replaced Formik"
      ]) {
        expect(source).not.toContain(stale);
      }
    }
  );

  it("never marks an English file as a draft", () => {
    for (const slug of slugs) {
      expect(read(slug, "en")).not.toMatch(/^draft: true$/m);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/shared/content/work-content.test.ts`
Expected: FAIL — files are still named `<slug>.mdx`.

- [ ] **Step 3: Unzip and adapt the six files**

```bash
mkdir -p /tmp/phase6-content && unzip -o -q content-final.zip -d /tmp/phase6-content
git rm -q content/work/swift-performance.mdx content/work/oneloyalty-layered-architecture.mdx content/work/safebulk-bulk-editor.mdx
cp /tmp/phase6-content/content/work/swift-performance.en.mdx content/work/swift-performance.en.mdx
cp /tmp/phase6-content/content/work/swift-performance.vi.mdx content/work/swift-performance.vi.mdx
cp /tmp/phase6-content/content/work/oneloyalty-monorepo.en.mdx content/work/oneloyalty-layered-architecture.en.mdx
cp /tmp/phase6-content/content/work/oneloyalty-monorepo.vi.mdx content/work/oneloyalty-layered-architecture.vi.mdx
cp /tmp/phase6-content/content/work/safebulk.en.mdx content/work/safebulk-bulk-editor.en.mdx
cp /tmp/phase6-content/content/work/safebulk.vi.mdx content/work/safebulk-bulk-editor.vi.mdx
```

Then replace **only the frontmatter** (everything between the two `---` lines) of each file with the block below. Keep the body exactly as delivered.

`swift-performance.en.mdx`:

```yaml
---
slug: swift-performance
title: "Swift: live feedback for store speed optimizations"
summary: "Helped migrate a Shopify SEO & speed app from JavaScript to TypeScript, built its real-time optimization UI, and cut initial load by ~20%."
description: "How I helped migrate a Shopify SEO & speed app from JavaScript to TypeScript, built its real-time optimization UI, and cut initial load by ~20%."
locale: en
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
dateModified: 2026-10-04
---
```

`swift-performance.vi.mdx`:

```yaml
---
slug: swift-performance
title: "Swift: phản hồi trực tiếp khi tối ưu tốc độ cửa hàng"
summary: "Cùng chuyển một Shopify app về SEO và tốc độ từ JavaScript sang TypeScript, xây UI tối ưu theo thời gian thực và giảm ~20% thời gian tải ban đầu."
description: "Cách mình cùng chuyển một Shopify app về SEO và tốc độ từ JavaScript sang TypeScript, xây UI tối ưu theo thời gian thực và giảm ~20% thời gian tải ban đầu."
locale: vi
role: "Front-End Engineer (vào làm khi là fresher)"
team: "Team 9 người (2 FE)"
company: "FireGroup"
period: { start: "2022-10", end: "2024-06" }
stack: ["React", "TypeScript", "Redux Toolkit", "Formik + Yup", "Pusher", "Shopify Polaris"]
metrics:
  - { value: "−20%", label: "thời gian tải ban đầu" }
  - { value: "JS → TS", label: "chuyển đổi codebase" }
  - { value: "4", label: "công cụ SEO" }
links:
  live: "https://apps.shopify.com/swift"
dateModified: 2026-10-04
draft: true
---
```

`oneloyalty-layered-architecture.en.mdx`:

```yaml
---
slug: oneloyalty-layered-architecture
title: "Oneloyalty: one monorepo, steady layouts, shared i18n"
summary: "Helped merge two Shopify app repos into one Turborepo, kept the Built for Shopify badge with CLS ≤ 0.1, and designed a shared i18n package for every app."
description: "How I helped merge two Shopify app repos into one Turborepo, kept the Built for Shopify badge with CLS ≤ 0.1, and designed a shared i18n package for every app."
locale: en
role: "Middle Front-End Engineer"
team: "Team of 9 (2 FE)"
company: "FireGroup"
period: { start: "2024-06", end: "2026-08" }
stack: ["React", "TypeScript", "Turborepo", "React Query", "Zustand", "React Hook Form + Yup", "i18next", "GraphQL", "Pusher", "Vite", "GitLab CI/CD", "Docker"]
metrics:
  - { value: "≤ 0.1", label: "dashboard CLS" }
  - { value: "2 → 1", label: "repositories" }
  - { value: "1", label: "shared i18n core for every app" }
links:
  live: "https://apps.shopify.com/oneloyalty"
dateModified: 2026-10-04
---
```

`oneloyalty-layered-architecture.vi.mdx`:

```yaml
---
slug: oneloyalty-layered-architecture
title: "Oneloyalty: một monorepo, layout ổn định, i18n dùng chung"
summary: "Cùng gộp hai repo Shopify app thành một Turborepo, giữ huy hiệu Built for Shopify với CLS ≤ 0.1 và thiết kế package i18n dùng chung cho mọi app."
description: "Cách mình cùng gộp hai repo Shopify app thành một Turborepo, giữ huy hiệu Built for Shopify với CLS ≤ 0.1 và thiết kế package i18n dùng chung cho mọi app."
locale: vi
role: "Middle Front-End Engineer"
team: "Team 9 người (2 FE)"
company: "FireGroup"
period: { start: "2024-06", end: "2026-08" }
stack: ["React", "TypeScript", "Turborepo", "React Query", "Zustand", "React Hook Form + Yup", "i18next", "GraphQL", "Pusher", "Vite", "GitLab CI/CD", "Docker"]
metrics:
  - { value: "≤ 0.1", label: "CLS của dashboard" }
  - { value: "2 → 1", label: "repository" }
  - { value: "1", label: "lõi i18n dùng chung cho mọi app" }
links:
  live: "https://apps.shopify.com/oneloyalty"
dateModified: 2026-10-04
draft: true
---
```

`safebulk-bulk-editor.en.mdx` — the delivered title is 66 characters (limit 60); it is shortened here and flagged for Dat:

```yaml
---
slug: safebulk-bulk-editor
title: "SafeBulk: bulk edits you can preview before they apply"
summary: "Co-founded a Shopify bulk product editor and built its entire front end, shipping the MVP in ~1.5 months with an AI-first, spec-driven workflow."
description: "How I co-founded a Shopify bulk product editor, built its entire front end solo, and shipped the MVP in about 1.5 months with an AI-first workflow."
locale: en
role: "Co-founder · Sole Front-End Developer"
team: "1 FE, 1 BE"
period: { start: "2026-07" }
stack: ["React 19", "TypeScript (strict)", "TanStack Router", "React Query", "Zustand", "Shopify Admin GraphQL API", "Docker", "Figma AI", "Claude"]
metrics:
  - { value: "~1.5 mo", label: "idea to MVP" }
  - { value: "Live", label: "on the Shopify App Store" }
  - { value: "3", label: "competitor weaknesses targeted" }
links:
  appStore: "https://apps.shopify.com/safebulk-editor"
  github: "https://github.com/nguyenthanhdat22012001/safe-bulk-shopify"
  demo: "https://youtu.be/uaKi8VwIrKE"
dateModified: 2026-10-04
---
```

`safebulk-bulk-editor.vi.mdx` (delivered title 65 characters, shortened and flagged):

```yaml
---
slug: safebulk-bulk-editor
title: "SafeBulk: xem trước kết quả rồi mới chỉnh hàng loạt"
summary: "Đồng sáng lập một Shopify app chỉnh sửa sản phẩm hàng loạt và xây toàn bộ front end, ra MVP trong ~1.5 tháng với quy trình AI-first, dựa trên spec."
description: "Cách mình đồng sáng lập một Shopify app chỉnh sửa sản phẩm hàng loạt, tự xây toàn bộ front end và ra MVP trong khoảng 1.5 tháng với quy trình AI-first."
locale: vi
role: "Đồng sáng lập · Front-End Developer duy nhất"
team: "1 FE, 1 BE"
period: { start: "2026-07" }
stack: ["React 19", "TypeScript (strict)", "TanStack Router", "React Query", "Zustand", "Shopify Admin GraphQL API", "Docker", "Figma AI", "Claude"]
metrics:
  - { value: "~1.5 th", label: "từ ý tưởng đến MVP" }
  - { value: "Live", label: "trên Shopify App Store" }
  - { value: "3", label: "điểm yếu của đối thủ được giải quyết" }
links:
  appStore: "https://apps.shopify.com/safebulk-editor"
  github: "https://github.com/nguyenthanhdat22012001/safe-bulk-shopify"
  demo: "https://youtu.be/uaKi8VwIrKE"
dateModified: 2026-10-04
draft: true
---
```

Validate:

Run: `pnpm exec velite build --strict`
Expected: exits 0. A `title`/`description` length error names the file — fix that file's frontmatter, never the schema.

- [ ] **Step 4: Run the unit tests**

Run: `pnpm test`
Expected: PASS. If `messages.test.ts` or another suite references old metric values (`−55%`), leave it for Task 4 only if it is a claims test; otherwise update it now to the new values.

- [ ] **Step 5: Add e2e coverage for the table and the image**

Append to `e2e/work.spec.ts`:

```ts
test("SafeBulk renders its comparison and results tables", async ({ page }) => {
  await page.goto("/en/work/safebulk-bulk-editor");
  const tables = page.locator("article table");
  await expect(tables).toHaveCount(2);
  await expect(tables.first().locator("th").first()).toHaveText(
    "What merchants complained about"
  );
});

test("Swift renders its progress screenshot without layout shift", async ({
  page
}) => {
  await page.goto("/en/work/swift-performance");
  const image = page.locator('article img[src*="progress.webp"]');
  await expect(image).toHaveAttribute("width", "1600");
  await expect(image).toHaveAttribute("height", "1000");
  await expect(image).toHaveAttribute("loading", "lazy");
});

test("the Oneloyalty chapter shows its frontmatter metrics", async ({ page }) => {
  await page.goto("/en");
  const stats = page.locator(
    'article[data-chapter="oneloyalty-layered-architecture"] dl dd'
  );
  await expect(stats).toHaveText(["≤ 0.1", "2 → 1"]);
});
```

(next/image rewrites `src` to `/_next/image?url=%2Fwork%2Fswift%2Fprogress.webp…`; `src*="progress.webp"` matches the encoded URL.)

Run: `pnpm build && pnpm exec playwright test e2e/work.spec.ts --project=chromium`
Expected: PASS. The VI fallback tests still pass because the VI files are drafts (hidden in production).

- [ ] **Step 6: Commit**

```bash
git add content/work public/work/swift/progress.webp src/shared/content/work-content.test.ts e2e/work.spec.ts
git commit -m "feat(content): final EN case studies and VI drafts from Dat

Adapts content-final.zip to the repo schema: current slugs, locale,
140-160 char descriptions, dateModified; drops cover/order/featured.
SafeBulk titles shortened to the 60-char limit (flagged for review).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Stale-claim gate and the Oneloyalty CLS label

**Files:**
- Create: `scripts/stale-claims.mjs`, `scripts/stale-claims.d.mts`, `scripts/stale-claims.test.ts`
- Modify: `scripts/check-stale-claims.mjs`, `vitest.config.ts`
- Modify: `src/features/work/WorkSection.tsx`, `src/features/work/chapters/OneloyaltyVisual.tsx`, `src/features/work/chapters/ClsDemo.tsx`
- Modify: `src/shared/i18n/messages/en.json`, `vi.json` (`work.oneloyalty.cls.*`)

**Interfaces:**
- Produces: `BANNED: RegExp[]` and `findStale(text: string): string[]` (matched substrings) from `scripts/stale-claims.mjs`. `OneloyaltyVisual({ headline }: { headline: string })`, `ClsDemo({ cls }: { cls: string })`. Message keys `work.oneloyalty.cls.summary` and `.after` take a `{cls}` placeholder.

- [ ] **Step 1: Write the failing test**

`vitest.config.ts` — change `include`:

```ts
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"]
```

`scripts/stale-claims.test.ts`:

```ts
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findStale } from "./stale-claims.mjs";

describe("stale claim patterns", () => {
  it.each([
    "cut bundle by 55%",
    "about ~55 percent",
    "saved 14 kB",
    "saved 14kB",
    "−14 kB gzip",
    "-14 kB gzip",
    "Formik + Redux Toolkit → React Hook Form",
    "I replaced Formik with RHF",
    "12–13s load"
  ])("flags %j", (text) => {
    expect(findStale(text)).not.toEqual([]);
  });

  it.each(["CLS ≤ 0.1", "−20%", "~1.5 mo", "2 → 1", "width: 55.5rem", "0.14s", 'class="h-14 mt-14"', "2024-06-14"])(
    "allows %j",
    (text) => {
      expect(findStale(text)).toEqual([]);
    }
  );

  it("passes on the current content and message catalogs", () => {
    const files = [
      ...readdirSync("content/work").map((f) => path.join("content/work", f)),
      "src/shared/i18n/messages/en.json",
      "src/shared/i18n/messages/vi.json"
    ];
    for (const file of files) {
      expect([file, findStale(readFileSync(file, "utf8"))]).toEqual([file, []]);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run scripts/stale-claims.test.ts`
Expected: FAIL — `./stale-claims.mjs` does not exist.

- [ ] **Step 3: Implement the pattern module**

`scripts/stale-claims.mjs` — move the `BANNED` array out of `check-stale-claims.mjs` and extend it:

```js
// Claims that must never reappear: CV v1 numbers, and the untrue Oneloyalty
// "replaced Formik + Redux Toolkit, −14 kB (~55%)" story (Phase 6 §6.0.2).
export const BANNED = [
  // (?<![\d.]) avoids false positives on CSS such as "0.12s"
  /(?<![\d.])1[23](?:[–-]13)?\s?s\b/, // 12s, 13s, 12–13s
  /(?<![\d.])1\.8\s?s\b/,
  /(?<![\d.])1–3\s?s\b/,
  /(?<![\d.])8–9\s?s\b/,
  /\b40\+/,
  /\b12\.6k\b/,
  /\b520\+/,
  /\b8 (languages|ngôn ngữ)\b/i,
  /\b2 teams?\b/i,
  /\b5–10 (min|phút)/i,
  /\b4 tiers\b/i,
  /loom\.com/i,
  /(?<![\d.])55\s?%/,
  /~\s?55\b/,
  /(?<![\d.])14\s?kB\b/,
  // Unicode minus only: an ASCII "-14" is everywhere in Tailwind (h-14, mt-14).
  /−14\b/,
  /-14\s?kB\b/,
  /Formik \+ Redux Toolkit →/,
  /replaced Formik/i
];

export function findStale(text) {
  return BANNED.flatMap((pattern) => {
    const match = pattern.exec(text);
    return match ? [match[0]] : [];
  });
}
```

`scripts/stale-claims.d.mts`:

```ts
export declare const BANNED: RegExp[];
export declare function findStale(text: string): string[];
```

`scripts/check-stale-claims.mjs` — delete the local `BANNED` array, add `import { BANNED } from "./stale-claims.mjs";` below the existing imports, and leave the walking/reporting code unchanged.

- [ ] **Step 4: Run to verify the patterns pass but the catalog check fails**

Run: `pnpm vitest run scripts/stale-claims.test.ts`
Expected: all cases PASS, including "passes on the current content" (Task 3 already replaced the content). A hit there is a real stale claim — remove it from that file. At plan time a fresh build's `.next/server/app` output contained these patterns only inside the old Oneloyalty copy, so no build-output false positives are expected.

- [ ] **Step 5: Make the CLS demo read the headline metric**

`en.json` → `work.oneloyalty.cls`:

```json
"summary": "Before: an async section loads and pushes the cards down. After: space is reserved, nothing moves, CLS {cls}.",
"before": "Before · layout shift",
"after": "After · space reserved · CLS {cls}",
"shift": "↓ shift"
```

`vi.json` → `work.oneloyalty.cls`: replace the literal `≤ 0.1` in `summary` and `after` with `{cls}` in the same positions (keep the rest of each VI string as it is).

`ClsDemo.tsx` — change the exported component signature and the two calls:

```tsx
export async function ClsDemo({ cls }: { cls: string }) {
  const t = await getTranslations("work.oneloyalty.cls");
```

```tsx
      <p className="sr-only">{t("summary", { cls })}</p>
      <Pane layer="before" label={t("before")} shiftLabel={t("shift")} />
      <Pane layer="after" label={t("after", { cls })} />
```

`OneloyaltyVisual.tsx`:

```tsx
// `headline` is the case study's metrics[0] value (the dashboard CLS), so the
// demo never hard-codes a number.
export async function OneloyaltyVisual({ headline }: { headline: string }) {
```

and `<ClsDemo cls={headline} />`.

`WorkSection.tsx` — widen the visuals type and pass the headline:

```tsx
const visuals: Record<
  ChapterKey,
  (props: { headline: string }) => Promise<JSX.Element>
> = {
```

```tsx
              visual={<Visual headline={doc.metrics[0]?.value ?? ""} />}
```

(`SwiftVisual` and `SafeBulkVisual` take no props; a zero-parameter function is assignable to this type.)

- [ ] **Step 6: Verify end to end**

Run: `pnpm test && pnpm typecheck && pnpm build && pnpm check:claims`
Expected: all pass; `check:claims` prints `No stale CV v1 claims.`

Prove the gate fails on a planted string, then remove it:

```bash
echo '{"x":"saved 55%"}' > src/shared/i18n/messages/zz-probe.json
pnpm check:claims; echo "exit=$?"   # expected: lists zz-probe.json, exit=1
rm src/shared/i18n/messages/zz-probe.json
```

Run: `grep -rniE "formik|55%|14 ?kB|redux" src content e2e`
Expected hits only: Swift's `stack` (both files), the Oneloyalty Context sentence if the delivered body mentions it, the Skills items `Redux Toolkit`/`Formik` in both catalogs, and the test files above.

Run: `pnpm exec playwright test e2e/work.spec.ts --project=chromium -g "CLS demo"`
Expected: PASS (`[data-cls-demo] .sr-only` still contains `CLS ≤ 0.1`).

- [ ] **Step 7: Commit**

```bash
git add scripts vitest.config.ts src/features/work src/shared/i18n/messages
git commit -m "fix(claims): ban the untrue Formik/RTK −55% story; CLS demo reads frontmatter

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Copy — GraphQL in Skills, i18n wording, ~20%

**Files:**
- Modify: `src/shared/i18n/messages/en.json`, `vi.json` (`skills.groups[State & Data].items`)
- Modify: `e2e/home.spec.ts:147-160`

- [ ] **Step 1: Flip the e2e expectation (failing)**

In `e2e/home.spec.ts`, rename the test `"Skills shows the nine CV v2 groups without GraphQL"` to `"Skills shows the nine CV v2 groups, GraphQL under State & Data"` and replace `await expect(skills).not.toContainText("GraphQL");` with:

```ts
  await expect(
    skills.locator("h3", { hasText: "State & Data" }).locator("..")
  ).toContainText("GraphQL");
```

Add after it:

```ts
test("Vietnamese Skills lists GraphQL under State & dữ liệu", async ({ page }) => {
  await page.goto("/vi");
  await expect(
    page
      .locator("section#skills h3", { hasText: "State & dữ liệu" })
      .locator("..")
  ).toContainText("GraphQL");
});
```

Check the Skills markup first (`src/features/skills/*.tsx`): if a group's `h3` and its list are not siblings under one parent, use the actual group container selector instead of `locator("..")`.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm build && pnpm exec playwright test e2e/home.spec.ts --project=chromium -g "Skills|GraphQL"`
Expected: FAIL — no GraphQL.

- [ ] **Step 3: Add GraphQL**

In both catalogs, group "State & Data" / "State & dữ liệu", insert `"GraphQL"` after `"REST"`:

```json
          "Redux Toolkit",
          "REST",
          "GraphQL",
          "WebSockets (Pusher)"
```

- [ ] **Step 4: Check the remaining copy rules**

Run: `grep -rniE "i18next|i18n|loader|20 ?%|−20" src/shared/i18n/messages/*.json src/features`
Expected: Swift reads `~20%`/`−20%`; no message describes Oneloyalty's i18n differently from "one shared i18next instance, translation loader injected by each app". If one does, rewrite it to that wording in both catalogs. (At plan time none existed outside the case study bodies, which already use it.)

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm test && pnpm build && pnpm exec playwright test e2e/home.spec.ts --project=chromium`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/shared/i18n/messages e2e/home.spec.ts
git commit -m "feat(skills): list GraphQL under State & Data in both locales

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: VI case-study checks and content-derived SEO tests

**Files:**
- Create: `e2e/helpers/content.ts`
- Modify: `src/shared/content/work-content.test.ts` (EN/VI parity)
- Modify: `e2e/sitemap.spec.ts`, `e2e/seo-metadata.spec.ts`, `e2e/work.spec.ts`, `e2e/json-ld.spec.ts`
- Possibly modify: `content/work/*.vi.mdx` (formatting only)

**Interfaces:**
- Produces: `viPublished(slug: string): boolean` and `WORK_SLUGS: readonly string[]` from `e2e/helpers/content.ts`.

- [ ] **Step 1: Write the EN/VI parity unit test (failing only if the drafts break a rule)**

Append to `src/shared/content/work-content.test.ts`:

```ts
import { work as allWork } from "#site/content";

describe("VI case studies mirror their EN source", () => {
  const translatable = new Set([
    "title", "summary", "description", "role", "team", "draft", "content",
    "locale"
  ]);

  it.each(slugs)("%s keeps every non-translatable field identical", (slug) => {
    const en = allWork.find((d) => d.slug === slug && d.locale === "en")!;
    const vi = allWork.find((d) => d.slug === slug && d.locale === "vi")!;
    expect(vi).toBeDefined();

    const strip = (d: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(d).filter(([key]) => !translatable.has(key))
      );
    const { metrics: enMetrics, ...enRest } = strip(en) as typeof en;
    const { metrics: viMetrics, ...viRest } = strip(vi) as typeof vi;
    expect(viRest).toEqual(enRest);

    // Metric labels are translated; values stay identical, except a unit word.
    const localizedUnit: Record<string, string> = { "~1.5 mo": "~1.5 th" };
    expect(viMetrics.map((m) => m.value)).toEqual(
      enMetrics.map((m) => localizedUnit[m.value] ?? m.value)
    );
  });
});
```

(`#site/content` imports the unfiltered Velite output, so drafts are visible here.) Move the import to the top of the file with the others.

Run: `pnpm vitest run src/shared/content/work-content.test.ts`
Expected: PASS. A failure points at a real divergence in a VI file — fix the VI frontmatter to match EN.

- [ ] **Step 2: Review the VI bodies against Phase 6 §6.1.2**

For each `content/work/*.vi.mdx`, compare section by section with its `.en.mdx`:
- Glossary terms (monorepo, Turborepo, Layered / Feature-Driven Architecture, code splitting, CLS, LCP, INP, Built for Shopify, App Store, bundle, gzip, i18n, hook, Server Action, CI/CD, pipeline, MVP, spec, AI-first, React Query, Zustand, React Hook Form, Pusher, WebP, TypeScript, JavaScript) stay in English.
- Every number in VI exists in EN; no claim added or strengthened.
- MDX formatting: tables have the same column count as EN, `<Image>` has the same `src`/`width`/`height`, headings are `##`.

Fix only formatting. Write any wording concern as a bullet list into the Task 10 hand-off note (do not change wording).

- [ ] **Step 3: Create the e2e content helper**

`e2e/helpers/content.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const WORK_SLUGS = [
  "swift-performance",
  "oneloyalty-layered-architecture",
  "safebulk-bulk-editor"
] as const;

// e2e runs a production build, where `draft: true` hides a translation.
// Deriving expectations from the files means removing `draft` needs no
// test change.
export function viPublished(slug: string): boolean {
  const file = path.join(process.cwd(), "content/work", `${slug}.vi.mdx`);
  if (!existsSync(file)) return false;
  return !/^draft:\s*true\s*$/m.test(readFileSync(file, "utf8"));
}
```

- [ ] **Step 4: Make the sitemap spec content-driven**

In `e2e/sitemap.spec.ts`, import `{ WORK_SLUGS, viPublished }` from `./helpers/content` and replace the URL loop and the `/vi/work/` assertion with:

```ts
  for (const path of ["/en", "/vi", ...WORK_SLUGS.map((s) => `/en/work/${s}`)]) {
    expect(xml).toContain(`<loc>${origin}${path}</loc>`);
  }
  expect(xml).toContain(`hreflang="vi" href="${origin}/vi"`);
  for (const slug of WORK_SLUGS) {
    const vi = `<loc>${origin}/vi/work/${slug}</loc>`;
    if (viPublished(slug)) {
      expect(xml).toContain(vi);
      expect(xml).toContain(`hreflang="vi" href="${origin}/vi/work/${slug}"`);
    } else {
      expect(xml).not.toContain(vi);
    }
  }
  expect(xml).not.toContain("/blog");
```

- [ ] **Step 5: Make the hreflang/fallback tests content-driven**

In `e2e/seo-metadata.spec.ts`, replace the two case-study tests ("an English case study lists only its real locales", "a Vietnamese fallback case study is canonicalised to English") with a loop:

```ts
for (const slug of WORK_SLUGS) {
  const en = `${origin}/en/work/${slug}`;
  const vi = `${origin}/vi/work/${slug}`;

  test(`/en/work/${slug}: hreflang matches its published locales`, async ({
    page
  }) => {
    await page.goto(`/en/work/${slug}`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", en);
    expect(await hreflangs(page)).toEqual(
      viPublished(slug)
        ? { en, vi, "x-default": en }
        : { en, "x-default": en }
    );
    const description = await page
      .locator('meta[name="description"]')
      .getAttribute("content");
    expect(description?.length).toBeGreaterThanOrEqual(140);
    expect(description?.length).toBeLessThanOrEqual(160);
  });

  test(`/vi/work/${slug}: canonical follows the VI publish state`, async ({
    page
  }) => {
    await page.goto(`/vi/work/${slug}`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      viPublished(slug) ? vi : en
    );
    if (!viPublished(slug)) {
      await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0);
    }
  });
}
```

Add the import `import { WORK_SLUGS, viPublished } from "./helpers/content";`.

In `e2e/work.spec.ts`, guard the three tests that need a fallback page with a skip (they navigate to `/vi/work/swift-performance` or `/vi/work/safebulk-bulk-editor`): "/vi fallback case study marks its header links as vi", "Vietnamese falls back to English with a notice", "the Vietnamese home keeps English chapter content marked as English". Add as the first line of each test body:

```ts
  test.skip(viPublished("swift-performance"), "VI is published; no fallback to test");
```

(use the slug that test visits). Add the matching published-state test:

```ts
for (const slug of WORK_SLUGS) {
  test(`/vi/work/${slug} renders Vietnamese once published`, async ({ page }) => {
    test.skip(!viPublished(slug), "VI is still a draft");
    await page.goto(`/vi/work/${slug}`);
    await expect(page.getByTestId("fallback-notice")).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  });
}
```

Import `{ WORK_SLUGS, viPublished }` in `work.spec.ts` and replace its local `slugs` array with `WORK_SLUGS`.

- [ ] **Step 6: Run**

Run: `pnpm build && pnpm exec playwright test e2e/sitemap.spec.ts e2e/seo-metadata.spec.ts e2e/work.spec.ts e2e/json-ld.spec.ts --project=chromium`
Expected: PASS (the "/blog" cases in `seo-metadata`/`json-ld` still pass here; Task 7 removes them).

Prove the derivation works: temporarily delete the `draft: true` line from `content/work/swift-performance.vi.mdx`, rerun the same command after `pnpm build`, expect PASS with the published-state tests now running; then `git checkout content/work/swift-performance.vi.mdx`.

- [ ] **Step 7: Commit**

```bash
git add e2e src/shared/content/work-content.test.ts content/work
git commit -m "test(seo): derive VI case study expectations from the content files

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Hide the blog behind `site.features.blog`

**Files:**
- Modify: `src/shared/lib/site.ts`
- Modify: `src/shared/content/index.ts` (+ test `src/shared/content/blog-flag.test.ts`)
- Modify: `src/features/layout/SiteHeader.tsx`
- Modify: `src/app/[locale]/blog/page.tsx`, `src/app/[locale]/blog/[slug]/page.tsx`
- Modify: `src/app/sitemap.ts`
- Modify: `e2e/blog.spec.ts`, `e2e/seo-metadata.spec.ts`, `e2e/json-ld.spec.ts`, `e2e/og-image.spec.ts` (check), `e2e/not-found.spec.ts` (keeps `/en/blog/does-not-exist` → 404)

**Interfaces:**
- Produces: `site.features.blog: boolean`; `isBlogEnabled(): boolean` from `@/shared/content` (= `site.features.blog && hasPosts()`).

- [ ] **Step 1: Write the failing unit test**

`src/shared/content/blog-flag.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

describe("isBlogEnabled", () => {
  it("is false while the flag is off", async () => {
    const { isBlogEnabled } = await import("@/shared/content");
    expect(isBlogEnabled()).toBe(false);
  });

  it("stays false with the flag on but no posts", async () => {
    vi.resetModules();
    vi.doMock("@/shared/lib/site", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/shared/lib/site")>();
      return { site: { ...actual.site, features: { blog: true } } };
    });
    const { isBlogEnabled } = await import("@/shared/content");
    expect(isBlogEnabled()).toBe(false);
    vi.doUnmock("@/shared/lib/site");
  });
});
```

Run: `pnpm vitest run src/shared/content/blog-flag.test.ts`
Expected: FAIL — `isBlogEnabled` is not exported.

- [ ] **Step 2: Implement the flag**

`site.ts` — add before `lighthouse`:

```ts
  // Feature flags. Turning `blog` on (with at least one post in
  // content/blog) needs no other code change.
  features: { blog: false },
```

`index.ts` — add `import { site } from "@/shared/lib/site";` and:

```ts
// The blog shows (nav link, routes, sitemap) only when switched on AND a
// post exists, so the site never shows an empty Blog page.
export function isBlogEnabled(): boolean {
  return site.features.blog && hasPosts();
}
```

Run: `pnpm vitest run src/shared/content/blog-flag.test.ts`
Expected: PASS.

- [ ] **Step 3: Gate the consumers**

`SiteHeader.tsx`: replace `import { getPosts } from "@/shared/content";` with `import { isBlogEnabled } from "@/shared/content";`, replace `const hasPosts = getPosts(locale).length > 0;` with `const showBlog = isBlogEnabled();`, and `{hasPosts ? (` with `{showBlog ? (`. `locale` stays — the `LocaleSwitcher` still uses it.

`blog/page.tsx`: import `isBlogEnabled` alongside `getPosts, hasPosts`; first line of `generateMetadata` after resolving params: `if (!isBlogEnabled()) return {};`; first line of the page body after the locale check: `if (!isBlogEnabled()) notFound();`.

`blog/[slug]/page.tsx`:

```ts
export function generateStaticParams() {
  return isBlogEnabled() ? getPostParams() : [];
}
```

and in the page body, after the locale check: `if (!isBlogEnabled()) notFound();`. Import `isBlogEnabled` from `@/shared/content`.

`src/app/sitemap.ts`: import `isBlogEnabled` and change `posts:` to:

```ts
    posts: isBlogEnabled()
      ? getAllPosts().map((doc) => ({
          slug: doc.slug,
          locale: doc.locale,
          lastModified: doc.dateModified ?? doc.datePublished
        }))
      : []
```

(`buildSitemap` already emits no `/blog` entry when `posts` is empty — covered by `sitemap.test.ts` "omits the blog index while there are no posts".)

- [ ] **Step 4: Rewrite the blog e2e**

Replace `e2e/blog.spec.ts` with:

```ts
import { expect, test } from "@playwright/test";

// site.features.blog is false: the blog is switched off until posts exist.
for (const path of ["/en/blog", "/vi/blog", "/en/blog/does-not-exist"]) {
  test(`${path} returns 404 while the blog is off`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
  });
}

test("no navigation offers a Blog link", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("link", { name: "Blog" })).toHaveCount(0);
});

test("sitemap.xml has no blog URL", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  expect(xml).not.toContain("/blog");
});
```

Remove the blog entries elsewhere:
- `e2e/seo-metadata.spec.ts`: drop `["/en/blog", "/en/opengraph-image"]` from the og:image list and delete the test "the empty blog index is noindex".
- `e2e/json-ld.spec.ts`: drop `["/en/blog", ["BreadcrumbList"]]`.
- `e2e/og-image.spec.ts:26`: `"/en/blog/does-not-exist/opengraph-image"` — keep only if it still asserts a non-200; run it and delete the entry if the route now behaves differently.

- [ ] **Step 5: Run**

Run: `pnpm lint && pnpm test && pnpm build && pnpm exec playwright test e2e/blog.spec.ts e2e/seo-metadata.spec.ts e2e/json-ld.spec.ts e2e/og-image.spec.ts e2e/not-found.spec.ts e2e/layout.spec.ts --project=chromium`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src e2e
git commit -m "feat(blog): hide the blog behind site.features.blog until posts exist

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 404 page with a drifting graph node

**Files:**
- Modify: `src/features/hero/graph/HeroGraphStatic.tsx` (+ `HeroGraphStatic.test.tsx`)
- Modify: `src/app/[locale]/not-found.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/shared/i18n/messages/en.json`, `vi.json` (`notFound`)
- Modify: `e2e/not-found.spec.ts`

**Interfaces:**
- Produces: `HeroGraphStatic({ state, driftNodeId }: { state: "chaos" | "layered"; driftNodeId?: string })`. Message keys `notFound.title`, `notFound.backHome` (`notFound.description` removed).

- [ ] **Step 1: Failing unit test**

Append to `HeroGraphStatic.test.tsx`:

```tsx
  it("marks only the requested node as drifting", () => {
    const markup = renderToStaticMarkup(
      <HeroGraphStatic state="layered" driftNodeId="admin" />
    );
    const host = document.createElement("div");
    host.innerHTML = markup;
    expect(host.querySelectorAll("[data-drift]")).toHaveLength(1);
    expect(render("layered").svg.querySelectorAll("[data-drift]")).toHaveLength(0);
  });
```

Run: `pnpm vitest run src/features/hero/graph/HeroGraphStatic.test.tsx`
Expected: FAIL — 0 elements.

- [ ] **Step 2: Implement the prop**

`HeroGraphStatic.tsx`:

```tsx
export function HeroGraphStatic({
  state,
  driftNodeId
}: {
  state: "chaos" | "layered";
  // 404 page only: this node drifts out of its layer (CSS, globals.css).
  driftNodeId?: string;
}) {
```

and on the `<circle>`:

```tsx
              <circle
                key={node.id}
                data-drift={node.id === driftNodeId ? "" : undefined}
                cx={p[0]}
```

Run the unit test again. Expected: PASS (the 4 KB markup test still passes).

- [ ] **Step 3: Failing e2e**

Replace `e2e/not-found.spec.ts` with:

```ts
import { expect, test } from "@playwright/test";

const cases = [
  { path: "/en/nope", heading: "This page wandered off the graph.", home: "Back to home" },
  { path: "/en/work/does-not-exist", heading: "This page wandered off the graph.", home: "Back to home" },
  { path: "/vi/work/does-not-exist", heading: "Trang này đã lạc khỏi sơ đồ.", home: "Về trang chủ" },
  { path: "/en/blog/does-not-exist", heading: "This page wandered off the graph.", home: "Back to home" }
];

for (const { path, heading, home } of cases) {
  test(`${path} renders the translated 404 inside the site layout`, async ({
    page
  }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", path.slice(1, 3));
    await expect(page.getByRole("link", { name: home })).toHaveAttribute(
      "href",
      `/${path.slice(1, 3)}`
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/
    );
  });
}

test("the 404 graph is the static SVG with one drifting node, no three.js", async ({
  page
}) => {
  const scripts: string[] = [];
  page.on("response", async (response) => {
    if (response.url().includes("/_next/static/chunks/")) {
      scripts.push(await response.text().catch(() => ""));
    }
  });
  await page.goto("/en/nope");
  await page.waitForLoadState("networkidle");
  const svg = page.locator('.not-found-graph svg[data-graph-state="layered"]');
  await expect(svg).toBeVisible();
  await expect(svg.locator("[data-drift]")).toHaveCount(1);
  await expect(page.locator("canvas")).toHaveCount(0);
  expect(scripts.some((source) => source.includes("WebGLRenderer"))).toBe(false);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the drifting node stays still", async ({ page }) => {
    await page.goto("/en/nope");
    const name = await page
      .locator("[data-drift]")
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(name).toBe("none");
  });
});
```

Run: `pnpm build && pnpm exec playwright test e2e/not-found.spec.ts --project=chromium`
Expected: FAIL — old heading.

- [ ] **Step 4: Implement copy, page and CSS**

`en.json`:

```json
  "notFound": {
    "title": "This page wandered off the graph.",
    "backHome": "Back to home"
  }
```

`vi.json`:

```json
  "notFound": {
    "title": "Trang này đã lạc khỏi sơ đồ.",
    "backHome": "Về trang chủ"
  }
```

`src/app/[locale]/not-found.tsx`:

```tsx
import { useTranslations } from "next-intl";
import { HeroGraphStatic } from "@/features/hero/graph/HeroGraphStatic";
import { Link } from "@/shared/i18n/navigation";
import { Container } from "@/shared/ui/Container";

// Static SVG only: no canvas, no client JS. One `app` node drifts out of its
// layer (globals.css); it stays still under reduced motion.
export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <Container className="py-section flex flex-col items-start gap-8">
      <div aria-hidden="true" className="not-found-graph relative aspect-[4/3] w-full max-w-md">
        <HeroGraphStatic state="layered" driftNodeId="admin" />
      </div>
      <h1 className="text-3xl font-bold sm:text-4xl">{t("title")}</h1>
      <Link href="/" className="text-accent font-mono hover:underline">
        {t("backHome")}
      </Link>
    </Container>
  );
}
```

`globals.css` — append after the hero graph block:

```css
/* 404 page (app/[locale]/not-found.tsx): the layered graph is always shown
   here (the hero rules above hide it outside [data-hero-graph]), and one app
   node drifts out of its layer. */
.not-found-graph [data-graph-state="layered"] {
  opacity: 1;
  visibility: visible;
}

@media (prefers-reduced-motion: no-preference) {
  .not-found-graph [data-drift] {
    animation: node-drift 6s ease-in-out infinite alternate;
    transform-box: fill-box;
    transform-origin: center;
  }
}

@keyframes node-drift {
  to {
    transform: translate(28px, -22px);
  }
}
```

The `<Container>` is a Server Component and `HeroGraphStatic` imports only `graph-data`/`layouts` (pure math), so nothing is added to the client bundle. `noindex`: Next itself adds `<meta name="robots" content="noindex">` to not-found responses, which the e2e asserts. If that assertion fails, stop and report — read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md` before changing anything.

- [ ] **Step 5: Run**

Run: `pnpm lint && pnpm test && pnpm build && pnpm exec playwright test e2e/not-found.spec.ts --project=chromium`
Expected: PASS. `messages.test.ts` passes because both catalogs changed together.

- [ ] **Step 6: Commit**

```bash
git add src e2e
git commit -m "feat(404): static graph with a node drifting off its layer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Footer — Lighthouse scores with a 90-day rule, repo link

**Files:**
- Create: `src/features/layout/lighthouse.ts`, `src/features/layout/lighthouse.test.ts`
- Modify: `src/shared/lib/site.ts`, `src/features/layout/SiteFooter.tsx`
- Modify: `src/shared/i18n/messages/en.json`, `vi.json` (`footer.source`)
- Modify: `e2e/layout.spec.ts:43-52`

**Interfaces:**
- Produces: `type LighthouseScores = { performance: number; accessibility: number; bestPractices: number; seo: number; measuredAt: string }`; `lighthouseToShow(scores: LighthouseScores | null, now: Date): LighthouseScores | null`; `site.lighthouse: LighthouseScores | null`; `site.repo: string`.

- [ ] **Step 1: Failing unit test**

`src/features/layout/lighthouse.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { lighthouseToShow, type LighthouseScores } from "./lighthouse";

const scores: LighthouseScores = {
  performance: 95,
  accessibility: 100,
  bestPractices: 100,
  seo: 100,
  measuredAt: "2026-10-01"
};
const daysAfter = (days: number) =>
  new Date(Date.UTC(2026, 9, 1) + days * 24 * 60 * 60 * 1000);

describe("lighthouseToShow", () => {
  it("shows nothing before a production run is recorded", () => {
    expect(lighthouseToShow(null, daysAfter(0))).toBeNull();
  });

  it("shows scores measured 89 days ago", () => {
    expect(lighthouseToShow(scores, daysAfter(89))).toEqual(scores);
  });

  it("shows scores measured exactly 90 days ago", () => {
    expect(lighthouseToShow(scores, daysAfter(90))).toEqual(scores);
  });

  it("hides scores older than 90 days", () => {
    expect(lighthouseToShow(scores, daysAfter(91))).toBeNull();
  });
});
```

Run: `pnpm vitest run src/features/layout/lighthouse.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 2: Implement**

`src/features/layout/lighthouse.ts`:

```ts
export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  // ISO date of the production run the scores come from.
  measuredAt: string;
}

const MAX_AGE_DAYS = 90;

// The footer is static, so `now` is build time: stale scores disappear on
// the next deploy.
export function lighthouseToShow(
  scores: LighthouseScores | null,
  now: Date
): LighthouseScores | null {
  if (!scores) return null;
  const ageDays =
    (now.getTime() - new Date(scores.measuredAt).getTime()) / 86_400_000;
  return ageDays <= MAX_AGE_DAYS ? scores : null;
}
```

`site.ts` — add the type at the top of the file (it lives in `shared` so `site.ts` never imports `features`, which the boundaries rule forbids):

```ts
export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  // ISO date of the production run the scores come from.
  measuredAt: string;
}
```

add `repo` after `cv`:

```ts
  cv: "/cv.pdf",
  repo: "https://github.com/nguyenthanhdat22012001/Portfolio",
```

and replace the `lighthouse` block (the object stays `as const`):

```ts
  // Lighthouse (mobile, production URL), updated by hand after each release
  // from a real production run; null until the first one. The footer hides
  // scores older than 90 days.
  lighthouse: null as LighthouseScores | null
```

In `lighthouse.ts`, replace the local interface with:

```ts
import type { LighthouseScores } from "@/shared/lib/site";

export type { LighthouseScores };
```

Messages, `footer` in both catalogs — add:
- `en.json`: `"source": "Source on GitHub"`
- `vi.json`: `"source": "Mã nguồn trên GitHub"`

`SiteFooter.tsx`:

```tsx
import { Fragment } from "react";
import { getTranslations } from "next-intl/server";
import { motion } from "@/shared/animation/motion";
import { site } from "@/shared/lib/site";
import { Container } from "@/shared/ui/Container";
import { lighthouseToShow } from "./lighthouse";

const categories = [
  "performance",
  "accessibility",
  "bestPractices",
  "seo"
] as const;

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const scores = lighthouseToShow(site.lighthouse, new Date());

  return (
    <footer className="border-border border-t" {...motion("footer-reveal")}>
      <Container
        size="wide"
        className="text-fg-muted flex flex-col gap-4 py-8 font-mono text-xs sm:flex-row sm:items-center sm:justify-between md:min-h-25"
      >
        <p>
          {t("copyright", { year: new Date().getFullYear() })} ·{" "}
          {t("builtWith")} ·{" "}
          <a href={site.repo} className="hover:text-fg underline underline-offset-4">
            {t("source")}
          </a>
        </p>
        {scores ? (
          <p>
            {t("lighthouse.title")}{" "}
            {categories.map((category, index) => (
              <Fragment key={category}>
                {index > 0 ? <span aria-hidden="true"> · </span> : null}
                <span>
                  <span className="sr-only">{t(`lighthouse.${category}`)} </span>
                  {scores[category]}
                </span>
              </Fragment>
            ))}
          </p>
        ) : null}
      </Container>
    </footer>
  );
}
```

The footer keeps `md:min-h-25`, so hiding the scores row does not shift layout.

- [ ] **Step 3: Update the layout e2e**

In `e2e/layout.spec.ts`, replace the test "the footer credits the stack and shows four Lighthouse scores" with:

```ts
test("the footer credits the stack and links to the source", async ({ page }) => {
  await page.goto("/en");
  const footer = page.getByRole("contentinfo");
  await expect(footer).toContainText("Built with Next.js, GSAP, Three.js");
  await expect(
    footer.getByRole("link", { name: "Source on GitHub" })
  ).toHaveAttribute("href", "https://github.com/nguyenthanhdat22012001/Portfolio");
  // No production Lighthouse run is recorded yet (site.lighthouse = null).
  await expect(footer).not.toContainText("Lighthouse");
});
```

- [ ] **Step 4: Run**

Run: `pnpm lint && pnpm test && pnpm build && pnpm exec playwright test e2e/layout.spec.ts --project=chromium`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src e2e
git commit -m "feat(footer): show Lighthouse scores only from a recent production run; source link

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: README, CLAUDE.md, full verification

**Files:**
- Modify: `README.md`, `CLAUDE.md`
- Create: `docs/readme/home.webp`

- [ ] **Step 1: Capture the README screenshot**

```bash
pnpm build && (pnpm start &) && sleep 5
pnpm exec playwright screenshot --viewport-size=1440,900 --wait-for-timeout=1500 http://localhost:3000/en /tmp/home.png
pnpm dlx sharp-cli -i /tmp/home.png -o docs/readme/home.webp -f webp -q 80
kill %1 2>/dev/null || pkill -f "next start"
```

Expected: `docs/readme/home.webp` exists and is < 200 KB (`ls -la docs/readme`).

- [ ] **Step 2: Rewrite README.md**

Sections in this order (keep the existing "Hero 3D" text as the body of "3D approach", including its measured budgets):

1. Title + `![Home page](docs/readme/home.webp)`
2. **Live URL** — "Added at launch."
3. **What it is** — two sentences: bilingual (EN/VI) portfolio of Nguyen Thanh Dat, front-end engineer; three Shopify case studies, an interactive 3D hero graph and an About avatar.
4. **Stack** — Next.js 16 (webpack production build), React 19, TypeScript, Tailwind CSS 4, next-intl 4, Velite (MDX), GSAP + Lenis, three.js + React Three Fiber, Zustand, Vitest, Playwright, Lighthouse CI.
5. **Architecture** — `app → features → shared` layering enforced by `eslint-plugin-boundaries`; one line per top-level folder of `src/` (`app`, `features/{about,contact,hero,layout,skills,work}`, `shared/{animation,content,i18n,lib,mdx,seo,theme,three,ui}`) and `content/`.
6. **3D approach** — existing Hero 3D section, plus one paragraph on the About avatar (lazy `about-avatar` chunk ≤ 26 KB, mounts after the first scroll, static fallback).
7. **i18n** — next-intl, `/en` and `/vi`, catalogs in `src/shared/i18n/messages`, missing case-study translation falls back to EN (canonical → `/en`, out of hreflang/sitemap).
8. **Content model** — `content/work/<slug>.<locale>.mdx`, fields of `workFrontmatter` (one line each), `draft: true` hides a translation in production builds and shows it in `pnpm dev`; publish by deleting the line.
9. **Feature flags** — `site.features.blog` in `src/shared/lib/site.ts`: off hides nav link, routes (404) and sitemap entries; to launch the blog set it to `true` and add `content/blog/<slug>.<locale>.mdx` — no other change.
10. **Scripts** — table of `package.json` scripts (`dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`, `check:claims`, `lhci`, `format`, `knip`).
11. **Quality gates** — what CI runs today (`.github/workflows/ci.yml`): lint, typecheck, unit, build, `check:claims`, the 3D/motion budget e2e specs, local LHCI with `lighthouserc.json` thresholds. Note: "Preview-deployment LHCI, bundle script and the full Playwright matrix come in Phase 6B."
12. **Environment variables** — `NEXT_PUBLIC_SITE_URL` (required in production; site origin for canonical, sitemap, OG).
13. **Credits** — fonts used (list from `src/app/[locale]/layout.tsx` font imports and `src/shared/seo/og/fonts/`); "The avatar was generated with Meshy under a private license; no attribution required."
14. **License** — "All rights reserved. Code may be read for reference; content, avatar and CV are not licensed for reuse." (If the repo has a LICENSE file, name it instead — `ls LICENSE*`.)

- [ ] **Step 3: Update CLAUDE.md**

Under **Content**, append:

```markdown
- Case study files are `content/work/<slug>.<locale>.mdx`. `draft: true`
  hides a translation in production builds (it behaves like a missing one:
  EN fallback, no hreflang, no sitemap entry) and shows it in `pnpm dev`. An
  English file is never a draft.
- MDX `<Image src width height alt />` maps to `next/image`
  (`shared/mdx/MdxImage.tsx`): lazy, keeps the given size, renders nothing
  if the file under `public/` is missing.
- The blog is behind `site.features.blog` (`shared/lib/site.ts`); use
  `isBlogEnabled()` from `@/shared/content` for anything blog-related.
- `scripts/stale-claims.mjs` is the single list of banned claims; add a
  pattern there (with a case in `stale-claims.test.ts`) when a claim is
  retracted.
```

- [ ] **Step 4: Full verification**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm check:claims`
Expected: all exit 0.

Run: `pnpm test:e2e`
Expected: all projects PASS (including the unchanged `hero-3d`, `about-avatar`, `motion` budget specs — initial JS still ≤ 150 KB gzip).

Dev (Turbopack) check:

```bash
pnpm dev
```

Open `http://localhost:3000/vi/work/swift-performance` — Vietnamese body renders (draft visible in dev), no fallback notice. Open `http://localhost:3000/en/nope` — 404 with the drifting node. Open `/en/work/swift-performance` — screenshot visible. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add README.md CLAUDE.md docs/readme
git commit -m "docs: launch README and Phase 6A conventions in CLAUDE.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Hand-off note for Dat**

Report in chat (not a file):
- SafeBulk titles shortened to fit 60 chars (EN: "SafeBulk: bulk edits you can preview before they apply"; VI: "SafeBulk: xem trước kết quả rồi mới chỉnh hàng loạt") — approve or replace.
- The six new `description`s — approve or replace.
- VI wording concerns collected in Task 6 Step 2.
- To publish a VI case study: delete its `draft: true` line; tests adapt automatically.
- After the first production Lighthouse run: set `site.lighthouse` with `measuredAt`.
