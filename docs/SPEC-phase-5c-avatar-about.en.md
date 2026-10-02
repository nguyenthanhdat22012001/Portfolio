# SPEC — Phase 5C: Move the avatar from the Hero to the About section

> Version 1.0 · 2026-10-02 · Requested by: Nguyen Thanh Dat
> Prerequisites: Phase 5 (Hero graph) and Phase 5B (avatar in the Hero) merged.
> Read together with `SPEC-phase-5-hero-3d.en.md`, `SPEC-phase-5b-avatar.en.md` and the repo's `CLAUDE.md`.
> Time box: **3 working days**.

---

## 0. Goal & decisions

The 3D avatar leaves the Hero and **replaces the portrait photo in the About section**. When About scrolls into view, the avatar walks forward, waves with the "Hi, I'm Dat" bubble, then idles and follows the pointer with its head — the same choreography as Phase 5B, now introducing the About text instead of the Hero.

| Decision | Choice |
| --- | --- |
| Hero | Node graph only (Phase 5 as shipped). All avatar code is removed from the Hero |
| About visual slot | The avatar **replaces the portrait photo**. No real photo is shown anywhere on the page |
| Rendering | A **separate, small `<Canvas>` in About**, lazy-mounted near the viewport. The Hero canvas already stops rendering when out of view, so only one canvas renders at a time |
| Trigger | Intro plays **once**, when About reaches 70 % of the viewport |
| Scroll coupling | The Phase 5B `heroMorph` recede/fade is removed |
| Reuse | `Avatar.tsx`, choreography, head look-at, bubble, fallbacks, `avatar.config.ts` and the assets are reused, not rewritten |

**Out of scope:** new clips or assets, changes to the Phase 5 graph, any avatar outside About, re-adding a portrait photo.

---

## 1. File changes

```
src/features/hero/canvas/
  HeroScene.tsx                 # REMOVE <Avatar/> and its lights/ContactShadows
  avatar/                       # MOVE whole folder → src/features/about/avatar/
src/features/about/
  AboutSection.tsx              # replace the portrait <Image> with <AboutAvatarSlot/>
  avatar/
    avatar.config.ts            # moved; edited (section 4)
    Avatar.tsx                  # moved; scroll-coupling code removed
    choreography.ts             # moved; unchanged API
    useAvatarIntro.ts           # moved; start condition changed (section 5)
    AvatarHitProxy.tsx          # moved
    AvatarBubble.tsx            # moved
    AvatarFallback.tsx          # moved; lazy-loading rules changed (section 7)
    AboutAvatarSlot.tsx         # NEW — server shell: fixed-size slot + fallback + gate
    AboutAvatarGate.tsx         # NEW — client: decides image vs. canvas, dynamic-imports canvas
    AboutAvatarCanvas.tsx       # NEW — client: <Canvas>, camera, lights, <Avatar/>
    __tests__/                  # moved + updated
src/shared/three/
  quality-store.ts              # NEW — Zustand store holding the current quality tier (section 3)
public/
  images/portrait*.{jpg,webp,avif}   # DELETE (and every reference to it)
```

Layer rules still apply: `features/about` may import from `shared/*`, never from `features/hero`. Anything both features need (tier detection, gate helpers, math) must live in `shared/three/` — move it there if Phase 5 kept it inside `features/hero`.

**Remove from the Hero / scroll store**
- `<Avatar/>`, the avatar key/rim lights and `ContactShadows` from `HeroScene`.
- The avatar's subscription to `heroMorph` and the recede/fade mapping (Phase 5B §B.7). `heroMorph` itself stays — the graph uses it.
- `data-avatar-phase` on the Hero slot; `hero.avatar.bubble` moves to `about.avatar.bubble` in both message files.
- The Hero-only LCP guard for the avatar fallback (no longer needed — see section 7).

---

## 2. About layout

The slot takes the exact place and size of the old portrait (Phase 2 grid: **4 of 12 columns** on desktop, full width above the text on mobile). Fixed aspect ratio from SSR so nothing shifts:

| Breakpoint | Slot | Aspect | Avatar on screen |
| --- | --- | --- | --- |
| ≥ 1024px | left column, `aspect-ratio: 4 / 5`, max-height 560px | 4:5 | ≈ 80 % of slot height (~420px at 1440) |
| 768–1023px | left column | 4:5 | ≈ 80 % |
| < 768px | above the paragraphs, centered, `height: 320px` | — | fallback image, ≈ 260px tall |

- Slot background: `--bg-elevated`, `--radius-lg`, no border. A soft floor gradient at the bottom (CSS, `--bg` → transparent, 30 % height) so the feet don't float.
- The avatar is **decorative**: slot is `aria-hidden="true"`. The About heading and paragraphs carry the meaning.
- Remove the portrait's `alt` text and any message keys used only by it.

```tsx
// AboutAvatarSlot.tsx (server)
<div className="relative aspect-[4/5] ..." aria-hidden="true" data-avatar-slot>
  <AvatarFallback variant="idle" />   {/* SSR, lazy — visible until the canvas paints */}
  <AboutAvatarGate />                 {/* client */}
</div>
```

---

## 3. Shared quality tier

Phase 5 decides the tier inside the Hero gate. About must use the **same** tier and see the same downgrades.

- New `shared/three/quality-store.ts` (Zustand): `{ level: 'high' | 'medium' | 'low' | 'off', setLevel, downgrade, toOff }`.
- The initial value comes from the existing `detectTier()` (run once on the client, on first read).
- Phase 5's `useQualityTier` is refactored to read/write this store (no behavior change for the Hero).
- A `PerformanceMonitor` in either canvas can call `downgrade()` / `toOff()`; both canvases react. Never upgrade within a session (unchanged rule).

---

## 4. Config changes — `avatar.config.ts`

Keep every measured asset value (clip names, `HEAD_BONE: 'mixamorigHead'`, height 1.70, walk speed note). Change only:

```ts
export const AVATAR = {
  // ...unchanged asset fields...

  /** About framing: avatar walks toward the camera from the back of the slot. */
  start: { x: 0, z: -1.2 },
  end:   { x: 0, z: 1.6 },          // still ≈ 2.8 m → no foot sliding at timeScale 1
  // receded: REMOVED (no scroll coupling)

  trigger: {
    mountMargin: '400px 0px',        // start loading canvas + GLB this far before About
    start: 'top 70%',                // ScrollTrigger start for the intro (once)
  },

  timings: {
    fadeIn: 0.4,
    walk: 2.2,
    walkToWave: 0.3,
    wave: 2.45,
    waveToIdle: 0.5,
    bubbleIn: 2.2,
    bubbleOut: 4.4,
    countersStart: 2.5,              // NEW — About stat counters start (section 6)
  },
} as const;
```

---

## 5. Canvas, loading & choreography

### 5.1 `AboutAvatarGate.tsx` (client)

Decision order:

1. Tier `off` (reduced motion, no WebGL, Save-Data, context lost elsewhere) → keep the static idle image. Done.
2. Tier `low` (touch / small screens) → **never** download `avatar.glb`; run the image animation (section 7).
3. Tier `high` / `medium` → when the slot is within `trigger.mountMargin` of the viewport (IntersectionObserver), `dynamic(() => import('./AboutAvatarCanvas'), { ssr: false })` and preload the GLB (`useGLTF.preload(url, false, true)`).

On first rendered frame the canvas fades in over 0.4 s and the fallback image fades out (then `visibility: hidden`, kept as the fallback if WebGL fails later). Wrap the canvas in an error boundary → on error, stay on the image.

### 5.2 `AboutAvatarCanvas.tsx`

```tsx
<Canvas
  dpr={tier === 'high' ? [1, 1.5] : [1, 1.25]}
  gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
  camera={{ fov: 30, position: [0, 1.0, 5.2], near: 0.1, far: 30 }}   // tight portrait framing
  frameloop={inView ? 'always' : 'never'}                                // IntersectionObserver on the slot
  eventSource={slotRef}
  style={{ position: 'absolute', inset: 0 }}
>
  <ambientLight intensity={0.5} />
  <directionalLight position={[1.5, 3, 4]} intensity={1.2} />            {/* key, neutral */}
  <directionalLight position={[-2, 2, -3]} intensity={0.8} color={accent} /> {/* rim, --accent */}
  {tier === 'high' && <ContactShadows position={[0, 0, 0]} opacity={0.35} blur={2.5} scale={4} resolution={256} />}
  <PerformanceMonitor onDecline={downgrade} onFallback={toOff} flipflops={3} />
  <Suspense fallback={null}><Avatar /></Suspense>
</Canvas>
```

- Framing: camera looks at `[0, 0.9, 0]`; on resize, adjust camera distance so the avatar at `end.z` fills **≈ 80 %** of the slot height (same fit approach as Phase 5B §B.4). Head and raised hand must never be clipped during `wave` (check at the widest point of the clip).
- `antialias: true` is acceptable here: the canvas is small and below the fold.
- The Hero canvas keeps `frameloop='never'` while out of view (Phase 5), so at most one canvas renders per frame.

### 5.3 Choreography (same phases as Phase 5B §B.5, new start rule)

| Phase | Time (s) | Position | Clip | Other |
| --- | --- | --- | --- | --- |
| `enter` | 0 → 0.4 | `start` | `walk` | opacity 0 → 1 |
| `walk` | 0 → 2.2 | `start.z → end.z`, ease `none` for 1.8 s then slow over 0.4 s | `walk` loop | |
| `wave` | 2.2 → 4.65 | `end` | crossfade 0.3 s, `LoopOnce`, `clampWhenFinished` | bubble in at 2.2 |
| `idle` | 4.65 → ∞ | `end` | crossfade 0.5 s, loop | bubble out at 4.4; head look-at on |

**Start rule:** the timeline starts when **both** are true: the GLB is ready, and a ScrollTrigger on the About section with `start: AVATAR.trigger.start` has fired (`once: true`). If the visitor is already past About when the GLB becomes ready (`self.progress === 1` / section above viewport), skip straight to `idle`.

**Leaving and returning:** when the slot leaves the viewport the canvas stops rendering (`frameloop='never'`); the timeline is paused, not reset. Coming back resumes where it was; once in `idle`, it stays in `idle`. The intro **never replays** in the same page view.

**Repeat visit in the same session** (`sessionStorage`, try/catch): skip `enter`/`walk`; appear at `end`, short `wave`, then `idle`.

**Bubble:** text from `about.avatar.bubble` — EN "Hi, I'm Dat" · VI "Chào, mình là Đạt". Same style as Phase 5B, no emoji, `aria-hidden`.

**Interaction:** unchanged from Phase 5B §B.6 — head look-at (fine pointer, idle only, ±30° / ±15°), click/tap the hit-proxy to wave again.

**Debug/test hook:** expose the current phase as `data-avatar-phase` on the About slot.

---

## 6. About counters sequencing

The three About stats (`4` years · `3` Shopify apps · `1.5` months to MVP) currently animate on their own ScrollTrigger. New rule, so the eye moves left (avatar) → right (stats):

- **High/Medium tier with the 3D avatar:** counters start at `timings.countersStart` (2.5 s) after the intro starts — i.e. right after the wave begins. Emit an event from `useAvatarIntro` (`window.dispatchEvent(new CustomEvent('about:avatar-wave'))`) or set a flag in a small store; the counters subscribe.
- **Fallback:** if the avatar is not on the 3D path (Low/Off tier, error, GLB slower than 1.5 s after the trigger fires), counters start on their own ScrollTrigger exactly as today. Never block the counters on the avatar.
- Reduced motion: counters show final values immediately (unchanged).

---

## 7. Fallback images

| Tier | Slot shows |
| --- | --- |
| High / Medium (before canvas paints, or on error) | `avatar-idle.webp`, static |
| Low (touch / small) | `avatar-wave.webp` slides up 24px + fades in (0.5 s, GSAP) when About hits `top 70%`; after 2 s crossfades to `avatar-idle.webp`; then a 2px idle bob (CSS, 4 s loop) |
| Off / reduced motion | `avatar-idle.webp`, static, no motion |
| No JS | `avatar-idle.webp` |

- About is below the fold, so the images use `loading="lazy"`, `decoding="async"`, fixed `width`/`height` (no CLS), `alt=""`. The Phase 5B LCP guard is no longer needed here — but confirm the Hero `h1` is still the LCP element (it should be).
- Images are positioned so their feet line up with the 3D avatar's feet at `end` — the swap from image to canvas must not visibly jump (tolerance ≤ 8px).

---

## 8. SEO & content

- Remove the portrait from the page, from `public/` and from any `next/image` import.
- `personSchema().image`: drop the field (no real photo is published). Do not use the avatar render as a person photo.
- Home OG image: unchanged (text-based `next/og` template from Phase 3). If it embedded the portrait, replace it with the name + title layout only.
- `about` messages: delete keys used only by the portrait (alt text, caption).

---

## 9. Performance & budgets

| Item | Rule |
| --- | --- |
| Initial load (Hero) | No avatar code or `avatar.glb` request on initial load, on any device — verify in the network panel |
| About chunk | The avatar canvas chunk is lazy; ≤ 20 KB gzip of avatar code on top of the shared three/R3F chunk (already loaded by Phase 5 on desktop) |
| `avatar.glb` | 0.79 MB, requested once, only on High/Medium, only when About is within 400px |
| Rendering | Only one canvas renders per frame (Hero pauses out of view; About pauses out of view) |
| Draw calls in About | ≤ 3 (avatar, optional ContactShadows) |
| Frame rate | 60 fps desktop during the intro |
| WebGL contexts | ≤ 2 on the page; on `webglcontextlost` in About → switch About to `avatar-idle.webp`, leave the Hero alone |
| Cleanup | On unmount: `mixer.stopAllAction()`, `mixer.uncacheRoot()`, kill GSAP timelines; no GPU memory growth after 10 navigations |

---

## 10. Tests

**Unit (Vitest)**
- `choreography.test.ts` (moved) still passes; add: `startPhase({ alreadyPast: true }) === 'idle'`.
- `quality-store.test.ts`: `downgrade()` steps High → Medium → Low; `toOff()` from any tier; never upgrades.
- Counter sequencing: with the avatar event the counters start at 2.5 s; without it they start on their own trigger.

**Playwright**
- Desktop, initial load: **no** request for `avatar.glb`; Hero contains no avatar (`[data-avatar-phase]` absent in the Hero).
- Desktop, scroll until About is ~400px away: `avatar.glb` requested once; scroll to About: `data-avatar-phase` goes `enter → walk → wave → idle` within 6 s; bubble visible during `wave`.
- Scroll away during `walk`, come back: phase continues, no restart; after `idle` it never returns to `walk`.
- Fast scroll past About before the GLB loads → on return, phase is `idle` directly.
- Mobile profile: no `avatar.glb` request at all; `avatar-wave.webp` then `avatar-idle.webp` visible in About.
- Reduced motion: `avatar-idle.webp` only, no canvas in About, counters show final values.
- No request for any `portrait*` file; no console errors.
- LCP element is still the Hero `h1` (desktop and mobile).
- Visual snapshots of the About section at 390px and 1440px (light + dark), taken in the `idle` state.

**Lighthouse CI:** thresholds unchanged (mobile Performance ≥ 90, CLS < 0.1).

---

## 11. Delivery plan

| Day | Work |
| --- | --- |
| 1 | Move folder, remove avatar from Hero, shared quality store, About slot + fallback, delete portrait |
| 2 | About canvas, gate, framing, choreography start rule, pause/resume, counters sequencing |
| 3 | Tests, budgets check, visual snapshots, cleanup |

---

## Acceptance criteria

- [ ] Hero shows only the node graph; no avatar code or asset loads with the Hero
- [ ] About shows the avatar in place of the portrait; no real photo anywhere on the page or in `public/`
- [ ] Desktop: intro (walk → wave + bubble → idle) starts once when About reaches 70 % of the viewport and never replays in the same page view
- [ ] Leaving and returning to About pauses and resumes without restarting; fast scroll past About lands in `idle`
- [ ] Head follows the pointer in idle; click/tap waves again
- [ ] Counters start right after the wave begins on the 3D path, and independently otherwise
- [ ] Mobile/Low tier never downloads `avatar.glb`; fallback images animate in About; reduced motion shows a static image
- [ ] Image ↔ canvas swap without visible jump (≤ 8px) and without layout shift
- [ ] Only one canvas renders at a time; ≤ 2 WebGL contexts; no GPU memory growth after 10 navigations
- [ ] `personSchema` has no `image`; no portrait files or references remain
- [ ] LCP is still the Hero `h1`; Lighthouse mobile Performance ≥ 90; CLS < 0.1
- [ ] Lint, typecheck, unit, e2e, build and Lighthouse CI green
