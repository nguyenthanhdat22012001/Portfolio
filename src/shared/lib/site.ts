export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  // ISO date of the production run the scores come from.
  measuredAt: string;
}

// Data, not copy: these values are identical in every locale.
export const site = {
  name: "Nguyen Thanh Dat",
  alternateName: "Nguyễn Thành Đạt",
  // schema.org Person.knowsAbout — technology names, identical in every locale.
  knowsAbout: [
    "React",
    "TypeScript",
    "Next.js",
    "Tailwind CSS",
    "Shopify",
    "GSAP",
    "Three.js"
  ],
  // schema.org Person.address — city and country only, never a street.
  address: { locality: "Ho Chi Minh City", country: "VN" },
  email: "nguyenthanhdat22012001@gmail.com",
  linkedin: "https://www.linkedin.com/in/dat-nguyen-b26744277",
  github: "https://github.com/nguyenthanhdat22012001",
  cv: "/cv.pdf",
  repo: "https://github.com/nguyenthanhdat22012001/Portfolio",
  // Feature flags. Turning `blog` on (with at least one post in
  // content/blog) needs no other code change.
  features: { blog: false as boolean },
  // Lighthouse (mobile, production URL), updated by hand after each release
  // from a real production run; null until the first one. The footer hides
  // scores older than 90 days.
  lighthouse: null as LighthouseScores | null
} as const;
