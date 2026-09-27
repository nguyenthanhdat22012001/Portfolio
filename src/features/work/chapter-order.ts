// Narrative order on the home page: fast → structured → trustworthy.
// Kept free of React imports so it can be unit-tested against real content.
export const chapterOrder = [
  { slug: "swift-performance", key: "swift" },
  { slug: "oneloyalty-layered-architecture", key: "oneloyalty" },
  { slug: "safebulk-bulk-editor", key: "safebulk" }
] as const;

export type ChapterKey = (typeof chapterOrder)[number]["key"];
