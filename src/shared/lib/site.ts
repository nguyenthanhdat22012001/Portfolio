// Data, not copy: these values are identical in every locale.
export const site = {
  name: "Nguyen Thanh Dat",
  alternateName: "Nguyễn Thành Đạt",
  // schema.org Person.knowsAbout — technology names, identical in every locale.
  knowsAbout: [
    "React",
    "TypeScript",
    "Next.js",
    "Front-end performance",
    "Web Vitals",
    "Shopify app development",
    "Monorepo architecture",
    "Internationalization (i18n)"
  ],
  email: "nguyenthanhdat22012001@gmail.com",
  linkedin: "https://www.linkedin.com/in/dat-nguyen-b26744277",
  github: "https://github.com/nguyenthanhdat22012001",
  cv: "/cv.pdf",
  safebulkRepo: "https://github.com/nguyenthanhdat22012001/safe-bulk-shopify",
  safebulkDemo: "https://www.loom.com/share/6c30f307347d4555b0214ff8be0ab84f",
  // Lighthouse (mobile) for /en. Update from the latest LHCI report
  // (.lighthouseci/ locally, or the "lighthouse-report" CI artifact).
  lighthouse: {
    performance: 98,
    accessibility: 100,
    bestPractices: 100,
    seo: 100
  }
} as const;
