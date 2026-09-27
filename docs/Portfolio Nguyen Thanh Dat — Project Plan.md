# Nguyen Thanh Dat Portfolio — Project Plan

Sep 25, 2026 · @leoghi

## Overview & Objectives

A bilingual (EN/VI) personal portfolio designed to convey a clear message to recruiters within 30 seconds: Dat is a Frontend Engineer specializing in React/TypeScript, performance, and architecture. GSAP and Three.js are used for storytelling, not mere decoration.

**Target Audience:** Recruiters and Tech Leads (focusing on remote/international companies); primary usage on desktop, quick scanning on mobile.

**Key Message:** "I build products quickly and with solid structure" — demonstrated by the site's own speed and code quality.

| KPI | Target |
| --- | --- |
| Lighthouse Performance (mobile) | ≥ 90 |
| Lighthouse SEO / Accessibility / Best Practices | 100 / ≥ 95 / 100 |
| LCP · CLS · INP (mobile, 4G) | < 2.5s · < 0.1 · < 200ms |
| Initial JS load (excluding 3D assets, gzip) | < 150 KB |
| Google search "Nguyen Thanh Dat frontend" | Top 3 ranking within 2 months |
| Conversion | Contact clicks / CV downloads / GitHub visits — tracked via analytics |

## Scope

Version 1.0 includes a storytelling homepage, 3 case studies, and a blog section; no custom backend or CMS.

| Page | URL | Content |
| --- | --- | --- |
| Home | `/[locale]` | 3D Hero → About → Selected Work → Skills → Contact |
| Case study | `/[locale]/work/[slug]` | Oneloyalty, Swift, SafeBulk (MDX) |
| Blog | `/[locale]/blog`, `/[locale]/blog/[slug]` | 2 technical articles at launch |
| CV | `/cv.pdf` | Downloadable PDF |
| 404 | `/not-found` | Error page with subtle effects |

**In scope:** Bilingual EN (default) + VI, dark/light themes, contact form (email via Resend or Formspree), analytics.

**Out of scope for v1.0:** CMS (Sanity/Contentful), blog comments, admin dashboard, multiple 3D scenes per page, WebGPU.

## Tech stack

Built using Next.js App Router with Static Site Generation (SSG), React Three Fiber for 3D, and GSAP for animations—ensuring strong SEO and turning "Familiar with Next.js" on your CV into genuine, hands-on experience.

| Layer | Technology | Rationale |
| --- | --- | --- |
| Framework | Next.js App Router + TypeScript strict | SSG/metadata API for SEO; React Server Components reduce client-side JS |
| 3D | three + @react-three/fiber + @react-three/drei | Component-based Three.js; React-style lifecycle management |
| 3D Effects | @react-three/postprocessing (minimal usage) | Subtle bloom for the node graph |
| Animation | gsap + ScrollTrigger + SplitText + @gsap/react (useGSAP) | Free plugins, powerful timelines, automatic cleanup |
| Smooth scroll | Lenis | Synchronized with ScrollTrigger via `gsap.ticker` |
| Styling | Tailwind CSS + CSS variables | Dark/light mode via design tokens |
| Content | MDX (next-mdx-remote or Velite/Content Collections) | Type-safe case studies and blog posts stored in the repo |
| i18n | next-intl | `/en` and `/vi` routes; Server Component support |
| Local State | Zustand | Sharing scroll/section state between DOM and canvas |
| Forms | React Hook Form + Zod, Server Actions with Resend | No dedicated backend required |
| Quality | ESLint, Prettier, Vitest, Playwright, Lighthouse CI | Smoke tests + CI checks to prevent performance regressions |
| Deployment | Vercel + GitHub Actions | PR previews, Speed ​​Insights, Analytics |
| 3D Assets | Blender → glTF, compressed via gltf-transform (Draco/Meshopt) | Lightweight models, fast loading |

## Architecture & Directory Structure

Adopting Layered Architecture (similar to the approach used in Oneloyalty): `app` → `features` → `shared`, where lower layers do not import from higher layers.

```
src/
  app/[locale]/            # route, layout, metadata, sitemap.ts, robots.ts
    page.tsx
    work/[slug]/page.tsx
    blog/[slug]/page.tsx
  features/
    hero/                  # HeroSection (DOM) + HeroScene (canvas, lazy)
    about/  work/  skills/  contact/
  shared/
    ui/                    # Button, MagneticButton, Cursor, SectionTitle
    three/                 # Canvas wrapper, hooks useInViewport, useReducedMotion, quality tier
    animation/             # gsap register, Lenis provider, preset timeline
    seo/                   # buildMetadata(), JsonLd component, schema helpers
    i18n/                  # next-intl config, messages/en.json, messages/vi.json
    lib/  types/
content/
  work/*.mdx  blog/*.mdx
public/
  models/*.glb  og/  cv.pdf
```

**Key Conventions:**

- Default to Server Components; use `"use client"` only for components involving GSAP or canvas.
- Import 3D canvases using `dynamic(() => import(...), { ssr: false })` so they mount only when entering the viewport.
- Keep all primary text in the DOM; the canvas serves merely as an `aria-hidden` background layer.
- Manage scroll state (section progress) via a Zustand store; GSAP writes to the store, while the canvas reads from it within `useFrame`—avoiding React re-renders on every frame.
- Use a single `Lenis` instance and a single `gsap.ticker` for the entire application.

## Section Content & Storytelling

The page tells a narrative arc: "chaotic → structured → fast"; only the Hero section utilizes Three.js, while other sections rely on GSAP.
| Section | Content | Effects | Libraries |
| --- | --- | --- | --- |
| Hero | Name, title, tagline, CTA | 3D node graph: nodes (UI, i18n, admin, storefront...) floating and reacting to mouse movement; scroll down to arrange into neat layers (Feature-Driven → Layered) | R3F, drei (Instances, Line), GSAP ScrollTrigger |
| About | 4 years, Fresher → Mid-level, workflow | Line-by-line text reveal; counting up years/apps | SplitText, ScrollTrigger |
| Work: Swift | Rebuild JS → TS, code splitting, NPM package | Loading bar pinned on scroll, time drops from **12s → 1–3s**; Web Vitals counter | ScrollTrigger pin + scrub |
| Work: Oneloyalty | Monorepo, Layered Architecture, i18n (8 languages) | 40+ components merging together; "Hello" text morphing across 8 languages ​​| GSAP Flip, SplitText |
| Work: SafeBulk | 3-step wizard, CSV import, polling | 3 stacked cards, pinned and flipped step-by-step; GitHub link + Loom demo | ScrollTrigger pin |
| Skills | Skill categories (from CV) | Staggered tag appearance, magnetic hover effect | GSAP quickTo |
| Contact | Email, LinkedIn, GitHub, form, CV download | Magnetic button, footer reveal | GSAP |
| Global | — | Custom cursor, smooth page transitions, short preloader (< 1s) | GSAP, Lenis |

**Materials to prepare:**

- [ ] One-sentence tagline (EN + VI)
- [ ] 3 case studies: context → problem → solution → results with metrics → key takeaways
- [ ] Interface screenshots/GIFs (permission obtained or merchant data blurred)
- [ ] Headshot and latest CV (PDF)
- [ ] 2 blog posts: "Reducing Shopify app load time from 12s to 2s" and "DI loader for i18n in a monorepo"

## SEO Plan

The SEO strategy rests on three pillars: readable static HTML, correct structured data, and long-form content (case studies + blog posts) to drive traffic.

**Technical (On-page):**

- [ ] Implement `generateMetadata` for all routes: title ≤ 60 characters, description 140–160 characters, canonical URL
- [ ] Open Graph + Twitter cards; generate dynamic OG images using `next/og` for each case study/blog post
- [ ] Configure `hreflang` (en/vi) + `x-default` via `alternates.languages`
- [ ] Set up `app/sitemap.ts` (covering both locales) and `app/robots.ts`
- [ ] Ensure exactly one `h1` per page, logical heading hierarchy, and alt text for all images
- [ ] Ensure canvas-based text always has a corresponding DOM representation
- [ ] Use short, keyword-rich URLs (e.g., `/work/swift-performance` instead of `/work/1`)

**Structured data (JSON-LD):**

| Trang | Schema | Trường chính |
| --- | --- | --- |
| Home | `Person` + `WebSite` | name, jobTitle, image, sameAs (LinkedIn, GitHub), knowsAbout |
| Case study | `CreativeWork` | name, author, dateCreated, about, url |
| Blog | `BlogPosting` | headline, datePublished, dateModified, author, image |
| Mọi trang con | `BreadcrumbList` | position, name, item |

**Off-page & theo dõi:**

- [ ] Custom domain (e.g., `nguyenthanhdat.dev`) linked to LinkedIn, GitHub profile, and CV
- [ ] Google Search Console: verify domain, submit sitemap, monitor indexing
- [ ] Cross-post blog content to dev.to / Viblo with a `canonical` link pointing to the original site
- [ ] Vercel Analytics or Plausible to track Contact clicks / CV downloads

**Target keywords:** "Nguyen Thanh Dat", "Front-End Engineer Vietnam", "React TypeScript developer", "Shopify app developer", "Shopify embedded app frontend".

## Performance budget & accessibility

3D assets must load after the main content: the LCP element is the Hero section's text or image, never the canvas.

| Category | Budget |
| --- | --- |
| Initial JS (gzipped) | < 150 KB |
| 3D Chunk (three + R3F + scene, lazy-loaded) | < 250 KB |
| Total .glb models | < 500 KB |
| Fonts | Max 2 families, self-hosted via `next/font`, Latin + Vietnamese subsets |
| Images | AVIF/WebP via `next/image`, with width/height defined to ensure CLS = 0 |
| Hero scene draw calls | < 50 (use `Instances`) |
| Target FPS | 60 (desktop), ≥ 30 (mid-range mobile) |

**Performance Optimization:**

- Use `dpr={[1, 1.5]}` and drei's `PerformanceMonitor` to lower quality when FPS drops
- Use `frameloop="demand"` or pause rendering when the canvas is outside the viewport or the tab is hidden
- Fallback to static images or SVG for low-end mobile devices or environments lacking WebGL support
- Dispose of geometry, materials, and textures upon unmounting; use `gsap.context` or `useGSAP` for cleanup
- Animate only `transform` and `opacity`

**Accessibility:**

- Respect `prefers-reduced-motion`: disable scrubbing/pinning and Lenis, and keep the 3D scene static
- Ensure keyboard navigability, clear focus rings, and skip links; ensure custom cursors do not obscure the actual cursor on touch devices
- Maintain a contrast ratio of ≥ 4.5:1 in both dark and light modes
- Set canvas `aria-hidden="true"`; ensure SplitText preserves the original text in the `aria-label`

## Roadmap

8-week timeline (working outside office hours, ~10–12 hours/week); starts Sep 28, 2026; target launch Nov 22, 2026. Principle: Ensure the site functions well without 3D first; add 3D elements later.

| Phase | Week | Deliverables | Phase Completion Criteria |
| --- | --- | --- | --- |
| 0. Preparation | 1 (Sep 28 – Oct 4) | English content, moodboard, Figma wireframes, domain purchase | Text ready for 3 case studies + tagline |
| 1. Foundation | 2 (Oct 5 – Oct 11) | Next.js repo + strict TS, Tailwind, next-intl, MDX, layout, CI + Vercel preview deployment | Deployable blank site, Lighthouse score of 100 |
| 2. Static Content | 3 (Oct 12 – Oct 18) | All sections + case study pages, responsive design, dark/light mode (no animations yet) | Fully functional site, no JS animations required |
| 3. SEO | 4 (Oct 19 – Oct 25) | Metadata, OG images, JSON-LD, sitemap, robots.txt, hreflang, Search Console setup | Rich Results Test passed, SEO score of 100 |
| 4. GSAP | 5 (Oct 26 – Nov 1) | Lenis, text reveal, Swift loading bar, SafeBulk pin, magnetic effects, custom cursor, reduced-motion support | 60 FPS on desktop, CLS < 0.1 |
| 5. Three.js | 6–7 (Nov 2 – Nov 15) | Hero node graph, scroll-to-stack transition, lazy loading, fallbacks, quality tiers | Mobile performance score ≥ 90 |
| 6. Finalization & Launch | 8 (Nov 16 – Nov 22) | Vietnamese version, 2 blog posts, real browser/device testing, analytics, LinkedIn launch | Met all "Overview" section KPIs |

**Post-launch:** Write 1 blog post/month, update SafeBulk when new features are released, check Search Console every 2 weeks.

**Addition:** 3D avatar intro (character walks up and waves) — add 1 week after Phase 5 (launch postponed to Nov 29, 2026); specification: Phase 5B — Avatar intro.

## Risks & Definition of Done

The biggest risk is getting bogged down in 3D work and never launching—hence, Phase 5 has a strict 2-week limit.

| Risk | Impact | Mitigation |
| --- | --- | --- |
| 3D scope creep | Launch delay | Limit to one 3D scene; ship a simplified version after 2 weeks |
| 3D lowers Lighthouse score | Conflicts with "performance" image | Lazy loading; Lighthouse CI blocks PRs scoring below 90 |
| Lag on low-end mobile | Poor user experience | PerformanceMonitor + static image fallback |
| GSAP conflicts with React 19 / Strict Mode | Double animation execution, memory leaks | Use `useGSAP`; avoid manual cleanup management |
| Sharing company/merchant data | NDA issues | Use only public info (App Store); blur screenshots |
| Slow content writing | Phase 2 bottleneck | Write content during Phase 0, prior to coding |

**Definition of Done for v1.0:**

- [ ] All KPIs in the Overview section met on mobile
- [ ] Functions correctly on Chrome, Safari (iOS + macOS), Firefox, and Edge
- [ ] Reduced-motion and keyboard navigation fully functional
- [ ] Sitemap indexed by Search Console; passes Rich Results Test
- [ ] Public repository; README includes architecture details and Lighthouse scores
- [ ] Portfolio links added to CV, LinkedIn, and GitHub

Detailed specifications for each phase for AI implementation: Implementation specifications
