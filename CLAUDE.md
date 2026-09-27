# CLAUDE.md — Rules for AI-assisted implementation

This file governs how AI-assisted changes are made in this repo. See also the
two planning docs in `docs/`: the project plan and the Phase 5B avatar spec.

## Architecture

- Layering is `app → features → shared`. A lower layer never imports a higher
  one. This is enforced by ESLint (`eslint-plugin-boundaries` in
  `eslint.config.mjs`) — if `pnpm lint` fails on a boundaries error, that is
  the correct signal to redesign the change, not to suppress the rule.
- Server Components are the default. Add `"use client"` only to a file that
  directly touches GSAP or the React Three Fiber canvas, or to a minimal
  interactive control that cannot work without client JS (currently
  `shared/theme/ThemeToggle.tsx` and `features/layout/LocaleSwitcher.tsx`).
  Pass translated labels to client components as props instead of shipping
  message catalogs to the client.

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
