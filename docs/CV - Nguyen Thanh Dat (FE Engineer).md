# Nguyen Thanh Dat — Curriculum Vitae

**Nguyen Thanh Dat** Front-End Engineer · ~4 years

📧 nguyenthanhdat22012001@gmail.com  |  📱 038 564 2061  🔗 linkedin.com/in/dat-nguyen-b26744277, https://github.com/nguyenthanhdat22012001

## Professional Summary

Front-End Engineer with ~4 years of experience developing production-grade eCommerce web applications for Shopify merchants, using TypeScript, React, and Tailwind CSS, with hands-on experience in Next.js (App Router, SSR). Apply OOP, SOLID principles, and Design Patterns to codebase organization, including contributing to JavaScript-to-TypeScript migration, restructuring codebases using Layered and Feature-Driven Architecture, and building reusable shared packages within a monorepo. Continuously improve product quality, stability, and performance, including reducing CLS to ≤0.1 and cutting page load time by ~20%. Experienced in Agile/Scrum environments, working closely with Designers (Figma), Backend Engineers (API contract alignment), and POs. Strong ability to analyze requirements and propose solutions, having independently documented business logic and launched an MVP for a personal project within ~1.5 months. Comfortable reading and understanding technical documentation in English, with a proactive, growth-oriented mindset and strong ownership of product quality.


## Technical Skills

- **Languages & Core:** TypeScript, JavaScript (ES6+), OOP, SOLID, Design Pattern,React (18/19), HTML5, CSS3
- **Architecture:** Turborepo monorepo, Layered Architecture, Feature-Driven Architecture, Component-Driven Development
- **State & Data:** React Query, TanStack Router, TanStack Virtual, Zustand, Redux Toolkit, RESTful APIs, WebSockets (Pusher)
- **Forms & i18n:** React Hook Form, Formik, Yup, i18next
- **UI & Styling:** Tailwind CSS, SCSS Modules, styled-components, Shopify Polaris / Polaris Viz, Responsive Design, Figma
- **Performance & Build:** Vite, code splitting, lazy loading, Core Web Vitals (LCP, CLS, FCP)
- **DevOps & Workflow:** Git, GitLab CI/CD (pipeline troubleshooting), Docker (FE build images), Jira, Confluence, Scrum
- **AI Tools:** GitHub Copilot, Claude (project rules, AI-assisted refactoring & debugging)
- **Familiar with:** Next.js (App Router, SSR), Vitest

## Work Experience

### FireGroup — Middle Front-End Engineer

**Project: Oneloyalty** — Shopify Embedded App, Loyalty & Rewards Suite | Jun 2024 – Aug 2026 [apps.shopify.com/oneloyalty](https://apps.shopify.com/oneloyalty) | Team of 9 (2 FE)

- Implemented a senior-led migration of 2 separate repos (Admin, Extensions) into a Turborepo monorepo: extracted duplicated UI components into a shared `packages/ui` and moved features from Feature-Driven to Layered Architecture to eliminate cross-feature imports; shipped on schedule.
- Brought dashboard CLS to ≤0.1 by reserving layout space (height/min-height) for async sections, retaining the "Built for Shopify" badge that boosts App Store ranking and recommendations.
- Replaced Formik + Redux Toolkit with React Hook Form + Zustand, cutting ~14 kB gzipped (~55%) of form/state library weight and removing Redux slice/action boilerplate.
- Built a shared `packages/i18n` exposing a single i18next instance, preventing duplicate-initialization bugs and standardizing i18n usage across the team.
- Owned the FE deployment pipeline on GitLab CI/CD: fixed Node version mismatches and removed unnecessary Extensions installs from the Admin job, unblocking FE releases.
- Integrated GitHub Copilot into the team workflow with project rules and instructions to keep AI-generated code consistent, speeding up task delivery, debugging and refactoring.

**Project: Swift** — Shopify Embedded App, SEO & Speed Suite | Oct 2022 – Jun 2024 [apps.shopify.com/swift](https://apps.shopify.com/swift) | Team of 9 (2 FE)

- Co-implemented a senior-led migration of the entire codebase from JavaScript to TypeScript and into a Feature-Driven Architecture, catching type errors at compile time and making features easier to locate and extend.
- Built a real-time progress UI (via Pusher) for speed optimizations applied to merchants' storefront themes (JS/CSS minification, image lazy-loading, HTML cleanup), showing live step-by-step status and success/failure results.
- Built UIs for standalone SEO tools: alt-text automation, meta tag editing, structured snippets, and sitemap management.
- Cut initial page load by ~20% via code-splitting and converting images to optimized WebP.


## Personal Project

**SafeBulk — Shopify Bulk Product Editor** *(Side project, team: 1 FE, 1 BE)* | Jul 2026 – Present | Sole Frontend Developer — React 19, TypeScript (strict), TanStack Router + Query, Zustand, Docker

- Co-founded the product with a BE engineer: validated the Shopify market with AI-assisted research, wrote detailed business-logic specs per feature, and prototyped the UI in Figma AI.
- Built the entire frontend and aligned API contracts with the backend, shipping the MVP in ~1.5 months with an AI-first workflow: Bulk Edit Wizard, CSV import/export, history log, plan gating.
- Containerized the FE build stage with a Dockerfile.
- [GitHub](https://github.com/nguyenthanhdat22012001/safe-bulk-shopify) · [Demo](https://youtu.be/uaKi8VwIrKE) · [apps.shopify.com/safebulk-editor](https://apps.shopify.com/safebulk-editor)

## Education

**FPT Polytechnic College** — Website Design | 09/2020 – 01/2022 Graduated with Honors, GPA 8.1/10

## Languages

- **English:** Basic — able to read technical documentation
