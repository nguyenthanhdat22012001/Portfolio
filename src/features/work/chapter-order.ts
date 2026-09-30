// Narrative order on the home page: fast → structured → trustworthy.
// Kept free of React imports so it can be unit-tested against real content.
// Everything a chapter shows comes from its case study's frontmatter; `key`
// only picks the visual and the motion effect.
export const chapterOrder = [
  { slug: "swift-performance", key: "swift" },
  { slug: "oneloyalty-layered-architecture", key: "oneloyalty" },
  { slug: "safebulk-bulk-editor", key: "safebulk" }
] as const;

export type ChapterKey = (typeof chapterOrder)[number]["key"];
