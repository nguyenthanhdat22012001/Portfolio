// Narrative order on the home page: fast → structured → trustworthy.
// Kept free of React imports so it can be unit-tested against real content.
// Holds only locale-invariant data; chapter copy lives in the messages.
export type ChapterLink = "github" | "demo";

interface Chapter {
  slug: string;
  key: string;
  affiliation: string | null;
  period: string;
  tags: readonly string[];
  links: readonly ChapterLink[];
}

export const chapterOrder = [
  {
    slug: "swift-performance",
    key: "swift",
    affiliation: "FireGroup",
    period: "2022–2024",
    tags: ["React 18", "TypeScript", "App Bridge", "Code splitting"],
    links: []
  },
  {
    slug: "oneloyalty-layered-architecture",
    key: "oneloyalty",
    affiliation: "FireGroup",
    period: "2024–2026",
    tags: ["Turborepo", "React Query v5", "GraphQL", "i18next"],
    links: []
  },
  {
    slug: "safebulk-bulk-editor",
    key: "safebulk",
    affiliation: null,
    period: "2026",
    tags: ["React", "TypeScript", "Polaris", "CSV"],
    links: ["github", "demo"]
  }
] as const satisfies readonly Chapter[];

export type ChapterKey = (typeof chapterOrder)[number]["key"];
