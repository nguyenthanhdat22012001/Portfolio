// Data, not copy: these values are identical in every locale.
export const site = {
  email: "nguyenthanhdat22012001@gmail.com",
  linkedin: "https://www.linkedin.com/in/dat-nguyen-b26744277",
  github: "https://github.com/nguyenthanhdat22012001",
  cv: "/cv.pdf",
  safebulkRepo: "https://github.com/nguyenthanhdat22012001/safe-bulk-shopify",
  safebulkDemo: "https://www.loom.com/share/6c30f307347d4555b0214ff8be0ab84f",
  // Lighthouse (mobile) for /en, measured by hand on 2026-09-27; replace with
  // Lighthouse CI output once Phase 3 lands.
  lighthouse: {
    performance: 96,
    accessibility: 100,
    bestPractices: 100,
    seo: 100
  }
} as const;
