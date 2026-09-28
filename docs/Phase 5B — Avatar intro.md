# Phase 5B — Intro: Waving avatar

**Decision:** The avatar appears _within the Hero section_ rather than as a full-screen intro overlay. The `h1` text appears immediately (preserving LCP and SEO); the avatar moves from the background to the foreground, pauses to wave, and then enters an idle state, tracking the cursor with its gaze. The Phase 5 node graph serves as the background, sharing a single `<Canvas>` element.

**Why no full-screen intro:** Recruiters often leave the page if forced to wait 3–5 seconds; the model has a much heavier rig than the node graph; and an overlay screen slows down LCP.

**Timeline:** 1 week (Nov 16 – Nov 22); Phase 6 moved to Nov 23 – Nov 29. Scheduled after Phase 5 to leverage existing Canvas, lazy loading, and quality tier implementations.

## Task 5B.1 — Create a personal avatar (self-created with AI assistance)

Direction B (stylized) has been selected: recognizability is achieved through hairstyle, glasses, physique, and clothing; it is lightweight and avoids the "uncanny valley" effect. Clothing and accessory colors are drawn from the established palette (grey, silver, dark gold, earth brown). The table below is retained for reference.

| Direction                 | Method                                                                                                                                                             | Pros                                             | Cons                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | ----------------------------------------------------------------- |
| A. Photo → 3D via AI      | Portrait + full-body photos → image-to-3D tools (e.g., Meshy, Tripo, Rodin) → mesh cleanup in Blender                                                              | Fast, accurate facial resemblance                | Messy mesh, requires retopology; must verify commercial licensing |
| B. Stylized (recommended) | Create a cartoon-style character in VRoid Studio (free) or use a Blender base mesh; customize hairstyle, glasses, clothing, and skin tone to match your appearance | Lightweight, visually appealing, self-controlled | Recognizable likeness, not a photorealistic portrait              |
| C. Outsourcing            | Hire a 3D artist to model and rig from photos                                                                                                                      | Highest quality                                  | Costly, long turnaround time                                      |

**Rigging & animation:** Upload the model to Mixamo (a free auto-rigger for humanoid characters) and download three "In Place" clips: `Walking`, `Waving`, and `Idle` (FBX format, 30 fps; select "without skin" for the latter two). If using VRoid (.vrm), you can load the model via `@pixiv/three-vrm` and retarget the Mixamo clips, but the simplest approach is to export it as a .glb file using Blender.

## Task 5B.2 — Pipeline asset

1. Blender: Combine the model and 3 clips into a single file; name actions correctly (`walk`, `wave`, `idle`); apply scale 1; ensure feet touch `y = 0` and the face points toward `+z`.
2. Mesh optimization: ≤ 15k triangles, ≤ 1 material, 1024² texture (2048² for the face if necessary); remove unused blend shapes (keep `blink` if present).
3. Export as `.glb` and compress: `gltf-transform optimize avatar.glb avatar.min.glb --compress meshopt --texture-compress webp` (or KTX2); resample animation.
4. Run `npx gltfjsx avatar.min.glb --types --transform` to generate a typed TSX component.
5. Place in `public/models/avatar.glb`, including 2 fallback images rendered from Blender: `avatar-wave.webp` (waving pose) and `avatar-idle.webp`, with transparent backgrounds.

**Budget:** `avatar.glb` ≤ 1.5 MB (target: 800 KB). The total model budget for the main tab has been increased from 500 KB to 1.5 MB; since it loads after the main content, it does not impact LCP.

## Task 5B.3 — Avatar Component

- `features/hero/scene/Avatar.tsx` renders within the same `<Canvas>` as the node graph (avoiding the creation of a second WebGL context).
- Uses `useGLTF('/models/avatar.glb')` and `useAnimations(animations, group)`; `useGLTF.preload` is called only when the decision to mount the canvas is made (per Task 5.2 requirements).
- Wrapped in `<Suspense fallback={null}>`: the node graph continues running during loading; no spinner is displayed.
- Positioning: on desktop, it stands to the right of the "Hero" text (`x ≈ 2.2`) at approximately 70% of the Hero text's height; on mobile, it is centered, positioned behind the text, and scaled down.
- Dedicated avatar lighting: one key light (front-top) and one rim light (using the `--accent` color) at the rear to separate the model from the background. Uses Drei's `ContactShadows` (High/Medium tier).

## Task 5B.4 — Intro Sequence

A GSAP timeline controls `group.position.z` and animation action weights; since the animations are "in-place," movement is handled via code rather than root motion.

| Step | Timing           | Action                                                                                                                                              |
| ---- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | 0s (model ready) | Avatar at `z = -6`, material `opacity` 0 → 1 over 0.4s; play `walk`                                                                                 |
| 2    | 0 → 2.2s         | Tween `z: -6 → 0`, `ease: 'power1.out'`; `walk` clip speed scales with velocity to prevent foot sliding                                             |
| 3    | 2.2s             | `crossFadeTo(wave, 0.3)`; DOM speech bubble "Hi, I'm Dat 👋" appears near the head (using drei's `Html`; `aria-hidden` set as it's already in `h1`) |
| 4    | 2.2 → 4.0s       | `wave` plays once (`LoopOnce`, `clampWhenFinished`)                                                                                                 |
| 5    | 4.0s             | `crossFadeTo(idle, 0.5)`, `LoopRepeat`; speech bubble fades out                                                                                     |
| 6    | Afterward        | Head/neck tracks cursor: `Head` bone constrained to ±30° horizontal, ±15° vertical, damp 5; random blinking every 3–6s (if blend shapes exist)      |

- Subsequent visits within the same session (using `sessionStorage` and `try/catch`): skip steps 1–4; the avatar starts at `z = 0`, performs a single short wave, then enters the idle state.
- Clicking the avatar: triggers a wave response (apply `cursor: pointer` via `data-cursor`). Optional Easter egg.
- Scrolling down (based on Phase 5 `morph`): the avatar moves back to `z = -2` and fades out when `morph > 0.5` to make room for the cascading graph; it returns upon scrolling up.
- Remove the Phase 4 preloader (the avatar itself serves as the "greeting").

## Task 5B.5 — Tiered Fallback Strategy

| Tier (Phase 5)       | Avatar                                                                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High                 | Full animation sequence, ContactShadows, cursor tracking                                                                                                                                      |
| Medium               | Full animation sequence, no shadows                                                                                                                                                           |
| Low (mobile)         | No `.glb` loading; display `avatar-wave.webp` sliding in via GSAP + simulated "wave" via slight rotation (or a short WebM video with a transparent background—requires HEVC alpha for Safari) |
| Off / reduced-motion | Static image `avatar-idle.webp`, no animation                                                                                                                                                 |

All fallback images must use `next/image` with fixed dimensions (CLS = 0) and `alt="Illustrated avatar of Nguyen Thanh Dat waving"`.

## Task 5B.6 — Testing

- "Fast 4G" network throttling: `h1` displays before `avatar.glb` starts loading (check waterfall).
- `renderer.info`: total scene draw calls < 70; memory usage remains stable after 10 page transitions.
- No foot sliding during walking (match tween speed to animation clip steps); smooth crossfading.
- Playwright: with `reducedMotion: 'reduce'`, only a static image is displayed; no request for `avatar.glb`.

## Acceptance criteria

- [ ] Avatar is recognizable as you (confirmed by 3 acquaintances)
- [ ] Intro completes within ≤ 4.5s of model readiness; does not block scrolling or clicks
- [ ] Lighthouse mobile score remains ≥ 90; LCP element is the `h1`
- [ ] `avatar.glb` ≤ 1.5 MB; loaded only for High/Medium tiers
- [ ] Correct fallback display for reduced-motion settings and low-end mobile devices
- [ ] 60 FPS on desktop with both avatar and graph running simultaneously
