# Phase 4 — GSAP — Design

Sep 28, 2026 · Design spec for Phase 4 of the project plan

## Context

Phases 2–3 delivered a fully static, SEO-complete site. Every home section is a Server
Component with static placeholders; `SwiftVisual`, `SafeBulkVisual`, and `OneloyaltyVisual`
carry comments marking what Phase 4 animates. `shared/lib/stores/scroll-store.ts` exists but
nothing writes to it. GSAP and Lenis are not installed.

The last Lighthouse CI run measured ~119 KB of initial JS on the home page against the
150 KB budget, leaving ~31 KB of headroom. GSAP core + ScrollTrigger + SplitText + Flip +
Lenis is roughly 60 KB gzip — about twice the headroom if loaded eagerly.

Phase 4 of `docs/Portfolio Nguyen Thanh Dat — Project Plan.md` is "GSAP": Lenis, text reveal,
Swift loading bar, SafeBulk pin, magnetic effects, custom cursor, reduced-motion support.
Completion criterion: 60 FPS on desktop, CLS < 0.1.

## Decisions from clarifying questions

- **Scope:** every effect in the plan's "Section Content & Storytelling" table, not just the
  Phase 4 deliverables row — including the Oneloyalty Flip + greeting morph, About count-up,
  Skills stagger, footer reveal, and page transitions.
- **Loading:** no animation code in the initial bundle. A tiny client `MotionRoot` lazy-loads
  one motion chunk on the first `scroll` / `pointermove` / `keydown` / `touchstart`, or on
  idle after `load`, whichever comes first. The static HTML is always complete and visible.
- **Preloader:** dropped. Instant load is the statement; nothing ever covers the hero.
- **Page transitions:** View Transitions API via React 19.3's stable `<ViewTransition>` and
  Next 15.5's `experimental.viewTransition` flag, including a shared-element title morph
  from the work chapter to the case-study `h1`.
- **Cursor:** a follower ring on top of the native cursor; the system cursor is never hidden.
- **Mobile:** pin/scrub only on desktop (≥ md). On mobile, chapters play a one-shot animation
  on enter; Lenis is off on touch devices (native scroll).
- **Architecture:** declarative `data-motion` hooks in server markup + one lazy engine
  (approach 1 of 3; per-effect client wrappers and a hybrid were rejected for adding many
  client boundaries and making the lazy-load guarantee fragile).

## Goals

- All effects listed below, running at 60 FPS on desktop.
- Initial JS stays under 150 KB; the motion chunk stays under 70 KB gzip.
- CLS < 0.1, LCP remains the hero text, Lighthouse scores unchanged.
- The site is fully readable without JS, before the motion chunk loads, and if it fails to load.
- `prefers-reduced-motion` disables Lenis, pinning, scrubbing, splitting, cursor, magnetic,
  and view-transition animation.
- Hero scroll progress is written to the Zustand scroll store, ready for Phase 5.

## Non-goals

- Preloader (dropped).
- Three.js, the hero canvas, and anything reading the store per frame (Phase 5).
- Blog-card → post title morph (added in Phase 6 when posts exist; one line then).
- Adding Playwright to CI (it still runs locally, as today).

## Structure

```
next.config.ts                        # + experimental.viewTransition
lighthouserc.json                     # + cumulative-layout-shift assertion
scripts/check-motion-budget.mjs       # new: fails if the GSAP chunk > 70 KB gzip
.github/workflows/ci.yml              # + motion budget step after build
src/
  app/
    globals.css                       # + view-transition timing + reduced-motion rules
    [locale]/
      layout.tsx                      # + <MotionRoot />
      template.tsx                    # new: <ViewTransition>{children}</ViewTransition>
      _motion/
        MotionRoot.tsx                # new, "use client": load trigger, route-change rescan
        motion-entry.ts               # new: lazy chunk; imports engine + registers effects
      work/[slug]/page.tsx            # h1 wrapped in named <ViewTransition>
  shared/animation/
    load-trigger.ts                   # onFirstInteractionOrIdle(cb)
    engine.ts                         # startMotion(registry) → { rescan, dispose }
    motion.ts                         # motion("reveal") → { "data-motion": "reveal" }
    types.ts                          # MotionEffect, MotionContext, MotionRegistry
    viewport.ts                       # isAtOrAboveViewport(el) (anti-flash rule)
    effects/
      reveal.ts  count.ts  stagger.ts  magnetic.ts  cursor.ts  footer-reveal.ts  hero.ts
      parse-stat.ts                   # "4+" → { value: 4, suffix: "+" }
  features/
    work/motion/
      swift.ts  safebulk.ts  oneloyalty.ts
      swift-timer.ts                  # pure: progress → timer label
      safebulk-step.ts                # pure: progress → active step index
      greeting-cycle.ts               # pure: index → { text, lang, counter }
    work/WorkChapter.tsx              # h3 wrapped in named <ViewTransition>; motion hooks
    work/chapters/*Visual.tsx         # motion hooks; SafeBulk uses data-active
    about/AboutSection.tsx            # reveal + count hooks
    skills/SkillsSection.tsx          # stagger + magnetic hooks
    hero/HeroSection.tsx              # hero + magnetic hooks
    contact/ContactSection.tsx        # magnetic hooks
    layout/SiteHeader.tsx, SiteFooter.tsx   # view-transition-name; footer-reveal hook
e2e/motion.spec.ts                    # new
```

Layering: `shared/animation` holds the engine and generic effects; features hold their own
effect modules; only `app/[locale]/_motion/motion-entry.ts` imports both. No boundaries
rule changes.

`MotionRoot.tsx` becomes the fourth allowed `"use client"` file; CLAUDE.md is updated in the
same change (client-file list, motion-chunk budget, `data-motion` convention).

## Architecture and loading

### Types

```ts
// shared/animation/types.ts
export interface MotionContext {
  gsap: typeof import("gsap").gsap;
  ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger;
  SplitText: typeof import("gsap/SplitText").SplitText;
  Flip: typeof import("gsap/Flip").Flip;
  isDesktop: boolean;       // (min-width: 768px) and (hover: hover) and (pointer: fine)
  reduceMotion: boolean;
  lenis: import("lenis").default | null;
}
export type MotionEffect = (el: HTMLElement, ctx: MotionContext) => void | (() => void);
export type MotionRegistry = Record<string, MotionEffect>;
```

`motion.ts` exports `motion(name: MotionName, options?)` returning
`{ "data-motion": name }` (plus `data-magnetic` strength when relevant). `MotionName` is a
string-literal union of every registered effect name, so a typo in markup is a type error.

### Flow

1. The server renders complete, visible HTML. `MotionRoot` renders `null` and calls
   `onFirstInteractionOrIdle`.
2. `onFirstInteractionOrIdle(cb)` listens (passive, once) for `scroll`, `pointermove`,
   `keydown`, `touchstart`, and schedules `requestIdleCallback` (fallback
   `setTimeout(…, 2000)`) after `window.load`. The first to fire calls `cb` and removes all
   the others.
3. `cb` runs `import("./motion-entry")`, which statically imports `gsap`, `ScrollTrigger`,
   `SplitText`, `Flip`, `lenis`, the engine, and every effect, and calls
   `startMotion(registry)`. This is the only place those libraries are imported.
4. `startMotion`:
   - registers the plugins;
   - under `gsap.matchMedia()` with `isDesktop` / `reduceMotion` conditions, creates **the
     one** Lenis instance when desktop and not reduced-motion, synchronised via
     `lenis.on("scroll", ScrollTrigger.update)`,
     `gsap.ticker.add((t) => lenis.raf(t * 1000))`, `gsap.ticker.lagSmoothing(0)`;
   - scans the document inside a page-level `gsap.context`, calling the registered effect
     for each `[data-motion]` element (unknown names skipped; a throwing effect is caught,
     warned in development, and skipped);
   - sets `document.documentElement.dataset.motion = "ready"`;
   - returns `{ rescan, dispose }`.
5. On `usePathname()` change, `MotionRoot` calls `rescan()`: reverts the page context
   (killing its ScrollTriggers, reverting SplitText, clearing inline styles), resets Lenis
   (`scrollTo(0, { immediate: true })` for forward navigation; Back keeps the browser's
   restored position), rescans, then `ScrollTrigger.refresh()`. Lenis, the ticker, and the
   cursor persist across routes.
6. If the import rejects, `MotionRoot` swallows the error; the site stays static. The load
   is attempted once per page load.

### Anti-flash rule

An effect never applies a hidden initial state to an element for which
`isAtOrAboveViewport(el)` is true at scan time — those elements are left static. Only
below-the-fold content gets a `from` state. Nothing in HTML or CSS starts at `opacity: 0`.

### Scroll store

The `hero` effect creates a ScrollTrigger on `#top` (`start: "top top"`,
`end: "bottom top"`) whose `onUpdate` calls `useScrollStore.getState().setProgress(self.progress)`.
It runs in every mode, including reduced motion. No React state is updated per frame.

## Effects catalogue

"Desktop" = `isDesktop`; every row assumes reduced motion is off (see next section).

| Effect | Where | Desktop | Mobile |
|---|---|---|---|
| `reveal` | About lead and body, section headings | SplitText into lines (`aria: "auto"`), stagger `y` + `opacity`, once | same |
| `count` | About stats | numeric prefix counts 0 → value on enter, suffix kept; DOM holds the final text; `aria-label` = final value | same |
| `swift` | Swift chapter `article` | pinned (~1.5 viewports, scrub): grey "before" bar fills (`scaleX`) while an `aria-hidden` mono timer runs 0 → 12s, then the accent bar snaps to 15% and "1–3s" lands; steps ①②③ light up in sequence | one-shot (~1.2 s) on enter, no pin |
| `oneloyalty` | Oneloyalty visual | 12 blocks start scattered/rotated, `Flip` into the grid on enter; greeting cycles all 8 languages with a SplitText char out/in, updating `lang` and the `n / 8` counter, looping only while on screen (`ScrollTrigger` `onToggle`) | same, no pin |
| `safebulk` | SafeBulk chapter `article` | pinned and scrubbed through 3 steps: each step brings the next card forward and moves `data-active` to it | cards stagger in on enter |
| `stagger` | Skills chips, per group | chips fade and rise in, staggered | same |
| `magnetic` | Hero CTAs, Contact buttons, Skills chips (lower strength via `data-magnetic="0.2"`) | `gsap.quickTo` x/y toward the pointer within bounds; springs back on leave | off |
| `cursor` | global; the engine appends one element to `body` | ring follows with lag (`quickTo`); grows over `a`, `button`, `[data-magnetic]` via delegated `pointerover`; hides when the pointer leaves the window; `aria-hidden`, `pointer-events: none` | off |
| `footer-reveal` | `SiteFooter` | slides up and fades in on enter | same |
| `hero` | `#top` | scroll hint bobs; writes hero progress to the store; the `h1` and tagline are never animated | store write only |

Markup changes:

- **SafeBulk:** "active" styling moves from a render-time boolean to `data-active` with
  Tailwind `data-[active]:` variants. Static default unchanged: the last card is active.
- **Swift:** bars animate with `scaleX` + `origin-left` instead of width. A new `aria-hidden`
  timer element; the accessible values remain the existing before/after text.
- No new user-facing copy, so no new i18n keys.

Animated properties are `transform` and `opacity` only. Pin spacers are inserted after the
first interaction and below the fold, so they don't count toward CLS.

## Reduced motion, fallbacks, and failure

- **Reduced motion:** Lenis is never created. No pin, scrub, split, cursor, or magnetic. The
  engine still loads and runs only the `hero` store write and the Oneloyalty greeting as an
  instant text swap every ~2.5 s. The view-transition pseudo-elements get
  `animation: none` under `@media (prefers-reduced-motion: reduce)`. Changing the OS setting
  mid-session reverts live via `gsap.matchMedia`.
- **No JS / before load:** the page is the Phase 2/3 static site, fully readable.
- **Load failure:** caught in `MotionRoot`; the site stays static.
- **Effect failure:** isolated per element; other effects keep running.
- **Resize / breakpoint crossing:** `gsap.matchMedia` reverts and re-runs the right branch;
  otherwise ScrollTrigger's own refresh.
- **Hidden tab:** the GSAP ticker pauses with `requestAnimationFrame`; the greeting loop only
  runs while on screen.

## View transitions

- `next.config.ts` sets `experimental: { viewTransition: true }`.
- `app/[locale]/template.tsx` wraps `children` in `<ViewTransition>`; the root cross-fades
  (~250 ms, set in `globals.css` on `::view-transition-old(root)` /
  `::view-transition-new(root)`).
- `SiteHeader` and `SiteFooter` get stable `view-transition-name`s so they don't fade.
- Shared element: the `WorkChapter` `h3` and the case-study `h1` are both wrapped in
  `<ViewTransition name={`work-title-${slug}`}>`; the slug keeps names unique per page.
- Locale switches get the root cross-fade. Hash links (`#work`, `#contact`) are not
  navigations; on desktop Lenis smooth-scrolls them (`lenis.scrollTo(target)` with an offset
  for the sticky header).
- Unsupported browsers navigate instantly.
- **Risk:** the Next flag is experimental. If it misbehaves (e.g. with the i18n middleware),
  remove the flag; `<ViewTransition>` then stays inert and nothing else in Phase 4 depends
  on it.

## Testing

Vitest (jsdom), written alongside each unit:

- `load-trigger`: fires once on the first of scroll / pointermove / keydown / touchstart /
  idle; removes all listeners; falls back to `setTimeout` without `requestIdleCallback`.
- `motion()`: returns the right attribute props.
- `engine` (gsap and Lenis stubbed): dispatches each `[data-motion]` to its effect; skips
  unknown names; isolates a throwing effect; never hides an element at or above the
  viewport; under reduced motion runs only `hero` and the greeting swap; `dispose()` and
  `rescan()` revert everything.
- Pure helpers: `parseStat`, `greeting-cycle`, `safebulk-step`, `swift-timer`.
- Existing tests updated where markup changes.

Playwright (`e2e/motion.spec.ts`, run locally):

1. No request for the motion chunk before interaction; after `mouse.move`, it loads and
   `<html data-motion="ready">` appears.
2. `javaScriptEnabled: false`: every section's text is visible.
3. `reducedMotion: "reduce"`: after interaction, no `.lenis` class, no pin spacers, all
   content visible.
4. Home → Swift case study → Back: correct `h1`; home animates again after returning.
5. Touch, 390 px viewport: no cursor element, no pin spacers.

## Budget enforcement

- **Initial JS:** the existing `resource-summary:script:size` ≤ 150 KB Lighthouse assertion.
  Lighthouse never interacts, so it proves the motion chunk stays out of the initial load.
- **Motion chunk:** `scripts/check-motion-budget.mjs` finds the chunk in `.next/static/chunks`
  containing GSAP, gzips it, and fails above 70 KB. Runs in CI after `pnpm build`.
- **CLS:** new `cumulative-layout-shift` assertion (max 0.1) in `lighthouserc.json`.
- **60 FPS desktop:** manual Chrome DevTools Performance recording over the pinned sections;
  results go in the PR description.

## Definition of done

- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass.
- `pnpm test:e2e` passes locally, including `motion.spec.ts`.
- Lighthouse CI green, including the new CLS assertion; motion budget script green.
- FPS check recorded in the PR.
- CLAUDE.md updated (client-file list, motion-chunk budget, `data-motion` convention).
