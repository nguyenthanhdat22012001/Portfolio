# Nguyen Thanh Dat — Curriculum Vitae

**Nguyen Thanh Dat** Front-End Engineer — React / TypeScript · Shopify Embedded Apps · 4 years

📧 nguyenthanhdat22012001@gmail.com | 📱 038 564 2061 📍 306 Hoa Binh, Phu Thanh, Ho Chi Minh, Viet Nam 🔗 linkedin.com/in/dat-nguyen-b26744277, https://github.com/nguyenthanhdat22012001

## Professional Summary

Front-End Engineer with ~4 years of experience building Shopify embedded applications for global merchants, from fresher to Middle Engineer. Contributed to rebuilding a production client codebase from legacy JavaScript to strict TypeScript and React 18, and helped execute a Feature-Driven → Layered Architecture restructuring across a multi-app Turborepo monorepo, removing duplication across 40+ shared UI components. Comfortable owning features end-to-end — from API integration and state management to CI/CD debugging — and designed the loader architecture for an 8-language i18n system and the public interface for an internally published NPM package used by two product teams.

## Technical Skills

- **Core:** HTML5, CSS3, TypeScript (Strict Mode), JavaScript (ES6+), React
- **Architecture:** Monorepo (Turborepo), Layered Architecture, Feature-Driven Architecture, Component-Driven Development
- **State & Data:** TanStack React Query, Zustand, Redux Toolkit, REST, GraphQL (Shopify Admin & Storefront APIs)
- **Build & Performance:** Vite, SWC, code splitting, bundle chunk analysis, Web Vitals (LCP, CLS, INP, FCP)
- **UI & Styling:** Responsive Design, Cross-browser Compatibility, Shopify Polaris, Polaris Viz, Tailwind CSS, SCSS Modules, styled-components, Figma
- **Integrations:** Real-time WebSockets (Pusher), Formik/React Hook Form + Yup, i18next (multi-locale)
- **DevOps & Tooling:** Git, GitLab CI/CD, Docker, internal NPM package publishing
- **AI-Augmented Development:** GitHub Copilot, Claude — prompt engineering for refactoring and debugging
- **Familiar with:** Next.js (App Router / SSR fundamentals)

## Work Experience

### FireGroup — Middle Front-End Engineer

**Project: Oneloyalty** — Shopify Embedded App, Loyalty & Rewards Suite | Jun 2024 – Aug 2026 [apps.shopify.com/oneloyalty](https://apps.shopify.com/oneloyalty)

- Contributed to architecting a multi-app Turborepo monorepo unifying Shopify Admin apps, Storefront extensions, and shared packages (`packages/i18n`, `packages/ui`), eliminating cross-repo code duplication
- Drove the migration to Layered Architecture for the features and shared layers I owned — UI, i18n, Rewards, Settings, Campaign, and Gamification; removed circular/cross-feature dependencies (e.g. lifting shared reward types out of the Rewards feature into a neutral shared layer) and eliminated duplication across **40+ shared UI components**
- Designed and implemented a dependency-injection loader architecture for an 8-language i18n system (`packages/i18n`), letting each app (Admin, Storefront) supply its own runtime translation source without changing the core package
- Integrated Shopify Admin & Storefront GraphQL APIs alongside REST endpoints using TanStack React Query v5
- Diagnosed and resolved GitLab CI/Docker pipeline failures (Node version mismatches, unintended nested `npm install` triggered by a `prepare` hook), keeping the monorepo's CI/CD stable at a **5–10 minute** build time
- Used AI-assisted tools (GitHub Copilot, Claude) to speed up TypeScript refactors and debugging in daily feature delivery

**Project: Swift** — Shopify Embedded App, SEO & Speed Suite | Oct 2022 – Jun 2024 [apps.shopify.com/swift](https://apps.shopify.com/swift)

- Rebuilt the core client architecture from legacy JavaScript to strict TypeScript and React 18, working with a Senior Engineer to overhaul state management and the data layer
- Cut ~3-4s off initial load via route-based code splitting; later collaborated with a Senior Engineer on the migration to App Bridge 2.0 session tokens and vendor chunking, bringing total load from ~12–13s to ~1–3s.
- Designed and published an internal NPM package for store speed-auditing, using an inversion-of-control pattern (host app supplies callbacks; React/UI libraries kept as peer dependencies) so two separate teams could adopt it independently
- Built UI for theme speed optimization (JS/CSS minification, image lazy-loading, HTML cleanup) and SEO tooling (alt-text automation, meta tags, structured snippets, sitemaps).

## Personal Project

**SafeBulk — Shopify Bulk Product Editor** _(Side project, team of 2)_ | Jul 2026 – Present Sole Frontend Developer — React 19, TypeScript (strict), TanStack Router + Query, Zustand, GraphQL (Shopify Admin API), Docker, GitHub Actions

- Built and own the entire frontend solo, working with 1 backend engineer on API contracts (wrote design specs before each feature to reduce rework)
- Designed a 3-step Bulk Edit Wizard (filter → configure rules → preview with per-row severity) and a resumable CSV import/export flow with validation preview
- Handled long-running backend jobs via React Query conditional polling, syncing job state to the URL for shareable/resumable links
- Built plan-gating/paywall logic across 4 tiers, including handling a race condition where a quota-limit error can return mid-job
- \~12.6k lines of TypeScript, 520+ i18n keys, no `any`; deployed via multi-stage Docker + GitHub Actions CI
- [GitHub](https://github.com/nguyenthanhdat22012001/safe-bulk-shopify) · [Demo](https://www.loom.com/share/6c30f307347d4555b0214ff8be0ab84f)

## Education

**FPT Polytechnic College** — Website Design | 09/2020 – 01/2022 Graduated with Honors, GPA 8.1/10
