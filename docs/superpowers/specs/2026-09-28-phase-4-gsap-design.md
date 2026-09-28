# Phase 4 — GSAP — Design

Sep 28, 2026 · Design spec for Phase 4 of the project plan (revised the same day: Next 16
upgrade, interaction-only loading, no Flip)

## Context

Phases 2–3 delivered a fully static, SEO-complete site. Every home section is a Server
Component with static placeholders; `SwiftVisual`, `SafeBulkVisual`, and `OneloyaltyVisual`
carry comments marking what Phase 4 animates. `shared/lib/stores/scroll-store.ts` exists but
nothing writes to it. GSAP and Lenis are not installed.

The last Lighthouse CI run measured ~119 KB of initial JS on the home page against the
150 KB budget, leaving ~31 KB of headroom. GSAP core + ScrollTrigger + SplitText + Lenis is
roughly 55 KB gzip — well over the headroom if loaded eagerly.

The repo runs Next 15.5.26. Its App Router bundles React 19.2 canary (2025-08), where
`ViewTransition` exists only in the experimental build, and enabling
`experimental.viewTransition` switches the whole app to experimental React. Next 16.3
(latest 16.3.6) bundles a React canary where `import { ViewTransition } from "react"` works
with no configuration, and `<Link>` accepts `transitionTypes`
(https://nextjs.org/docs/app/guides/view-transitions).

Phase 4 of `docs/Portfolio Nguyen Thanh Dat — Project Plan.md` is "GSAP": Lenis, text reveal,
Swift loading bar, SafeBulk pin, magnetic effects, custom cursor, reduced-motion support.
Completion criterion: 60 FPS on desktop, CLS < 0.1.

## Decisions from clarifying questions

- **Scope:** every effect in the plan's "Section Content & Storytelling" table, not just the
  Phase 4 deliverables row — including the Oneloyalty merge + greeting morph, About
  count-up, Skills stagger, footer reveal, and page transitions.
- **Loading:** no animation code in the initial bundle. A tiny client `MotionRoot` lazy-loads
  one motion chunk on the first `scroll`, `pointermove`, `keydown`, or `touchstart`. There
  is deliberately no idle trigger: Lighthouse keeps tracing after `load`, so an idle load
  would be counted as initial JS. Every effect is scroll- or pointer-driven and the hero is
  never animated in, so waiting for interaction loses nothing visible.
- **Preloader:** dropped. Instant load is the statement; nothing ever covers the hero.
- **Next 16 first:** upgrade to Next 16.3.6 (and next-intl 4) as the first step of Phase 4,
  so view transitions use the stable, unflagged path.
- **Page transitions:** React `<ViewTransition>` following the Next.js view-transitions
  guide: a shared-element title morph from the work chapter to the case-study `h1`, and
  directional slides (`nav-forward` / `nav-back`) between home and case studies, with the
  header anchored.
- **Cursor:** a follower ring on top of the native cursor; the system cursor is never hidden.
- **Mobile:** pin/scrub only on desktop (≥ md, fine pointer). On mobile, chapters play a
  one-shot animation on enter; Lenis is off on touch devices (native scroll).
- **Architecture:** declarative `data-motion` hooks in server markup + one lazy engine
  (approach 1 of 3; per-effect client wrappers and a hybrid were rejected for adding many
  client boundaries and making the lazy-load guarantee fragile).
- **No Flip:** the Oneloyalty "merge" is a pure transform animation, which `gsap.to` does;
  Flip only earns its ~8 KB when layout changes.

## Goals

- Next 16.3.6 with every existing check still green.
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
- Blog view transitions (added in Phase 6 when posts exist).
- React Compiler, Cache Components, or other Next 16 features beyond what the upgrade needs.
- Running the whole Playwright suite in CI (only `motion.spec.ts` joins CI).

## Prerequisite: Next 16 upgrade

- `next`, `eslint-config-next` → 16.3.6; `react`, `react-dom`, `@types/react`,
  `@types/react-dom` → 19.3; `next-intl` → 4.x.
- `src/middleware.ts` → `src/proxy.ts` (same `createMiddleware(routing)` default export).
- The three `opengraph-image.tsx` files take `params` as a Promise.
- `eslint.config.mjs` uses `eslint-config-next`'s flat configs instead of `FlatCompat`;
  `@eslint/eslintrc` is removed.
- next-intl 4's `NextIntlClientProvider` inherits all messages by default; the layout passes
  `messages={null}` to keep catalogs off the client (CLAUDE.md rule).
- Turbopack becomes the default bundler for `next build`; no custom webpack config exists.
- Completion: lint, typecheck, unit, build, full e2e, and Lighthouse CI all green; JS size
  re-measured.

## Structure

```
next.config.ts                        # unchanged apart from what the upgrade needs
lighthouserc.json                     # + cumulative-layout-shift assertion
playwright.config.ts                  # CI reuses the built app (pnpm start only)
.github/workflows/ci.yml              # + motion e2e (lazy-load + chunk budget)
src/
  proxy.ts                            # renamed from middleware.ts
  app/
    globals.css                       # + lenis.css, cursor, view-transition rules
    [locale]/
      layout.tsx                      # + <MotionRoot />, messages={null}
      page.tsx                        # content wrapped in <PageTransition>
      work/[slug]/page.tsx            # content wrapped in <PageTransition>; titled morph
      _motion/
        MotionRoot.tsx                # "use client": interaction trigger, route-change rescan
        motion-entry.ts               # lazy chunk: gsap + plugins + Lenis + engine + registry
        registry.ts                   # Record<MotionName, MotionEffectDef>
  shared/
    animation/
      load-trigger.ts                 # onFirstInteraction(cb)
      engine.ts                       # startMotion(libs, registry) → { rescan, dispose }
      motion.ts                       # motionNames, motion(name), magnetic(strength)
      types.ts                        # MotionLibs, MotionContext, MotionEffectDef
      viewport.ts                     # isAtOrAboveViewport(el) (anti-flash rule)
      testing/fake-libs.ts            # test doubles for gsap / ScrollTrigger / SplitText / Lenis
      effects/
        reveal.ts  count.ts  parse-stat.ts  stagger.ts  footer-reveal.ts  hero.ts
        cursor.ts  magnetic.ts  hash-links.ts
    ui/
      PageTransition.tsx              # directional <ViewTransition> wrapper
      ArticleLayout.tsx               # optional titleTransitionName; back link nav-back
      SectionHeading.tsx, Stat.tsx, TagList.tsx   # motion hooks
  features/
    work/motion/
      swift.ts  swift-timer.ts  safebulk.ts  safebulk-step.ts  oneloyalty.ts  greeting-cycle.ts
    work/WorkChapter.tsx              # motion hook, title <ViewTransition>, nav-forward link
    work/chapters/*Visual.tsx         # data hooks; SafeBulk uses data-active
    about/, skills/, hero/, contact/, layout/SiteFooter.tsx   # motion hooks
    layout/SiteHeader.tsx             # viewTransitionName: site-header
e2e/motion.spec.ts                    # new
```

Layering: `shared/animation` holds the engine and generic effects; features hold their own
effect modules; only `app/[locale]/_motion/` imports both. No boundaries rule changes.

`MotionRoot.tsx` becomes the fourth allowed `"use client"` file; CLAUDE.md is updated in the
same change (client-file list, motion-chunk budget, `data-motion` convention, proxy.ts).

## Architecture and loading

### Types

```ts
// shared/animation/types.ts
export interface MotionLibs {
  gsap: typeof import("gsap").gsap;
  ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger;
  SplitText: typeof import("gsap/SplitText").SplitText;
  Lenis: typeof import("lenis").default;
}
export interface MotionContext extends Omit<MotionLibs, "Lenis"> {
  isDesktop: boolean;       // (min-width: 768px) and (hover: hover) and (pointer: fine)
  reduceMotion: boolean;
  lenis: import("lenis").default | null;
}
export type MotionCleanup = () => void;
export type MotionEffect = (el: HTMLElement, ctx: MotionContext) => void | MotionCleanup;
export interface MotionEffectDef {
  run: MotionEffect;
  reducedMotion?: boolean;  // true = also runs under prefers-reduced-motion
}
```

`motion.ts` exports `motionNames` (a const tuple), `MotionName`, `motion(name)` returning
`{ "data-motion": name }`, and `magnetic(strength)` returning `{ "data-magnetic": "0.35" }`.
The registry is typed `Record<MotionName, MotionEffectDef>`, so markup and registry cannot
drift apart.

### Flow

1. The server renders complete, visible HTML. `MotionRoot` renders `null` and calls
   `onFirstInteraction`.
2. `onFirstInteraction(cb)` listens (passive) for `scroll`, `pointermove`, `keydown`,
   `touchstart` on `window`. The first calls `cb` and removes all listeners.
3. `cb` runs `import("./motion-entry")`, which statically imports `gsap`, `ScrollTrigger`,
   `SplitText`, `lenis`, the engine, and the registry, and calls `startMotion`. This is the
   only place those libraries are imported at runtime.
4. `startMotion(libs, registry)`:
   - registers the plugins;
   - a **global** `gsap.matchMedia()` branch (desktop and not reduced-motion) creates **the
     one** Lenis instance (`autoRaf: false`), synchronised via
     `lenis.on("scroll", ScrollTrigger.update)`, `gsap.ticker.add((t) => lenis.raf(t * 1000))`,
     `gsap.ticker.lagSmoothing(0)`, and starts the cursor, magnetic, and hash-link handlers;
   - a **page** `gsap.matchMedia()` scans `[data-motion]`, calling each registered effect
     (unknown names skipped; under reduced motion only `reducedMotion: true` effects run; a
     throwing effect is caught, warned in development, and skipped);
   - sets `<html data-motion-ready>`;
   - returns `{ rescan, dispose }`.
5. On `usePathname()` change, `MotionRoot` calls `rescan()`: reverts the page matchMedia
   (killing its ScrollTriggers and tweens, reverting SplitText, running effect cleanups),
   syncs Lenis to wherever Next left the scroll position, rescans, then
   `ScrollTrigger.refresh()`. Lenis, the ticker, the cursor, and the magnetic/hash handlers
   persist across routes.
6. If the import rejects, `MotionRoot` swallows the error; the site stays static.

### Anti-flash rule

An effect never applies a hidden or displaced initial state to an element for which
`isAtOrAboveViewport(el)` is true at scan time — those elements are left static. Only
below-the-fold content gets a `from` state. Nothing in HTML or CSS starts at `opacity: 0`.

### Scroll store

The `hero` effect (`reducedMotion: true`) creates a ScrollTrigger on `#top`
(`start: "top top"`, `end: "bottom top"`) whose `onUpdate` calls
`useScrollStore.getState().setProgress(self.progress)`, and resets progress to 0 on cleanup.
No React state is updated per frame.

## Effects catalogue

"Desktop" = `isDesktop`; every row assumes reduced motion is off (see next section).

| Effect | Where | Desktop | Mobile |
|---|---|---|---|
| `reveal` | About lead and body, every `SectionHeading` `h2` | SplitText into masked lines (`aria: "auto"`), stagger `yPercent` + `opacity`, once | same |
| `count` | About stats (`Stat` `dd`) | integer/decimal prefix counts 0 → value on enter, suffix kept; `aria-label` = final text; values like `1–3s` are left alone | same |
| `swift` | Swift chapter `article` | pinned (+150%, scrub): grey "before" bar fills (`scaleX`) while an `aria-hidden` mono timer runs 0.0s → 12.0s, then the accent bar snaps in, "1–3s" lands, and steps ①②③ light up | one-shot (~1.2 s) on enter, no pin |
| `oneloyalty` | Oneloyalty chapter `article` | the 12 blocks start scattered/rotated and merge into the grid on enter (`gsap.to` x/y/rotation → 0); the greeting cycles all 8 languages with a SplitText char out/in every 2.5 s, updating `lang` and the `n / 8` counter, only while on screen | same |
| `safebulk` | SafeBulk chapter `article` | pinned (+200%): scroll progress picks the active step; the active card moves to the front (`zIndex`, `scale`) and gets `data-active` | cards stagger in on enter |
| `stagger` | Skills chip lists | chips fade and rise in, staggered | same |
| `footer-reveal` | `SiteFooter` | slides up and fades in on enter | same |
| `hero` | `#top` | scroll hint bobs; writes hero progress to the store; the `h1` and tagline are never animated | store write only |
| magnetic (global) | `[data-magnetic]`: hero CTAs, Contact buttons, Skills chips (strength 0.2) | `gsap.quickTo` x/y toward the pointer; springs back on leave | off |
| cursor (global) | one element appended to `body` | ring follows with lag (`quickTo`); grows over `a`, `button`, `summary`, `[data-magnetic]`; hides when the pointer leaves the window; `aria-hidden`, `pointer-events: none` | off |
| hash links (global) | same-page `#hash` links clicked with a mouse | `lenis.scrollTo(target, { offset: -headerHeight })`; keyboard activation (`event.detail === 0`) keeps native behaviour so focus moves | off |

Markup changes:

- **SafeBulk:** "active" styling moves from a render-time boolean to `data-active` with
  Tailwind `data-active:` / `group-data-active:` variants. Static default unchanged: the last
  card is active.
- **Swift:** bars animate with `scaleX` + `origin-left`. A new `aria-hidden` timer element
  reserves its space with `invisible` until the effect shows it; the accessible values remain
  the existing before/after text.
- **Oneloyalty:** the counter carries the raw ICU template in `data-counter-template`
  (`t.raw("counter")` = `"{current} / {total}"`); the effect reads greetings from the
  existing sr-only list.
- No new user-facing copy, so no new i18n keys.

Animated properties are `transform` and `opacity` only. Pin spacers are inserted after the
first interaction and below the fold, so they do not count toward CLS.

## Reduced motion, fallbacks, and failure

- **Reduced motion:** Lenis is never created. No pin, scrub, split, cursor, magnetic, or
  hash smoothing. The engine still loads and runs only `hero` (store write) and `oneloyalty`
  (instant greeting swap every 2.5 s, no merge animation). View-transition pseudo-elements
  get `animation-duration: 0s`. Changing the OS setting mid-session reverts live via
  `gsap.matchMedia`.
- **No JS / before load:** the page is the Phase 2/3 static site, fully readable.
- **Load failure:** caught in `MotionRoot`; the site stays static.
- **Effect failure:** isolated per element; other effects keep running.
- **Resize / breakpoint crossing:** `gsap.matchMedia` reverts and re-runs the right branch.
- **Hidden tab:** the GSAP ticker pauses with `requestAnimationFrame`; the greeting loop only
  runs while its ScrollTrigger is active.

## View transitions

Follows https://nextjs.org/docs/app/guides/view-transitions (Next 16.3).

- `shared/ui/PageTransition.tsx` wraps page content in
  `<ViewTransition enter={map} exit={map} default="none">` with
  `map = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }`. The home
  page and the case-study page use it (in `page.tsx`, not the layout, because layouts persist).
- `WorkChapter`'s "Read case study" link has `transitionTypes={["nav-forward"]}`;
  `ArticleLayout`'s back link has `transitionTypes={["nav-back"]}`.
- Shared element: the `WorkChapter` `h3` and the case-study `h1` are both wrapped in
  `<ViewTransition name={`work-title-${slug}`} share="morph" default="none">`.
- `SiteHeader`'s `<header>` has `viewTransitionName: "site-header"` and CSS that keeps it still.
- `globals.css` holds the guide's `nav-forward` / `nav-back` slide keyframes (60 px, 150 ms
  exit / 210 ms enter / 400 ms move), a 400 ms `.morph` group, `::view-transition
  { pointer-events: none }`, and the reduced-motion rule.
- Untyped navigations (locale switch, header nav, browser Back) get no directional slide;
  the morph still plays on browser Back when both pages have the named title.
- Unsupported browsers navigate instantly.

## Testing

Vitest (jsdom), written alongside each unit, using `shared/animation/testing/fake-libs.ts`:

- `load-trigger`: fires once on the first of scroll / pointermove / keydown / touchstart;
  removes all listeners; the returned cancel function prevents firing.
- `motion()` / `magnetic()`: return the right attribute props.
- `engine`: dispatches each `[data-motion]` to its effect; skips unknown names; isolates a
  throwing effect; creates Lenis only on desktop without reduced motion; under reduced motion
  runs only `reducedMotion` effects; `rescan()` reverts and re-runs page effects without
  recreating Lenis; `dispose()` reverts everything and removes `data-motion-ready`.
- Each effect: anti-flash skip when at/above the viewport; the expected GSAP calls when
  below the fold; reduced-motion behaviour where relevant.
- Global handlers: cursor appears on mouse move and grows over interactive elements; magnetic
  moves toward the pointer and releases; hash links smooth-scroll mouse clicks only.
- Pure helpers: `parseStat`, `formatSwiftTimer`, `activeStep`, `greetingAt`.
- Registry: one entry per `motionNames` item.

Playwright (`e2e/motion.spec.ts`; runs in CI):

1. No motion chunk and no `data-motion-ready` after load and network idle; after
   `mouse.move`, `data-motion-ready` appears.
2. The scripts loaded after the first interaction total ≤ 70 KB gzip.
3. `javaScriptEnabled: false`: the `h1` and every section heading are visible.
4. `reducedMotion: "reduce"`: after interaction, no `.lenis` class, no `.pin-spacer`, no cursor.
5. Desktop: pins exist; home → Swift case study → back link: correct `h1`, then pins exist
   again (the rescan works).
6. Touch, 390 px viewport: after a tap, no cursor element, no pin spacers.
7. Desktop: clicking the header "Work" link lands on `#work` with the section in view.

## Budget enforcement

- **Initial JS:** the existing `resource-summary:script:size` ≤ 150 KB Lighthouse assertion.
  Lighthouse never interacts, so it proves the motion chunk stays out of the initial load.
- **Motion chunk:** Playwright test 2 above, run in CI after `pnpm build`.
- **CLS:** new `cumulative-layout-shift` assertion (max 0.1) in `lighthouserc.json`.
- **60 FPS desktop:** manual Chrome DevTools Performance recording over the pinned sections;
  results go in the PR description.

## Definition of done

- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass.
- `pnpm test:e2e` passes locally; `motion.spec.ts` passes in CI.
- Lighthouse CI green, including the new CLS assertion.
- FPS check recorded in the PR.
- CLAUDE.md updated (client-file list, motion-chunk budget, `data-motion` convention,
  `proxy.ts`).
