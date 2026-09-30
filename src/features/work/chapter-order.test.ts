import { describe, expect, it } from "vitest";
import { getWork, getWorkBySlug } from "@/shared/content";
import { chapterOrder } from "./chapter-order";

describe("chapterOrder", () => {
  it("points every chapter at an existing English case study", () => {
    for (const { slug } of chapterOrder) {
      expect(getWorkBySlug(slug, "en"), slug).not.toBeNull();
    }
  });

  it("covers every case study, so none is missing from the home page", () => {
    const chapterSlugs = chapterOrder.map(({ slug }) => slug).sort();
    const contentSlugs = getWork("en")
      .map(({ doc }) => doc.slug)
      .sort();
    expect(chapterSlugs).toEqual(contentSlugs);
  });

  it("gives every chapter at least two metrics to show", () => {
    for (const { slug } of chapterOrder) {
      expect(
        getWorkBySlug(slug, "en")?.doc.metrics.length,
        slug
      ).toBeGreaterThanOrEqual(2);
    }
  });
});
