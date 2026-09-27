import { describe, expect, it } from "vitest";
import { getWork, getWorkBySlug } from "@/shared/content";
import en from "@/shared/i18n/messages/en.json";
import vi from "@/shared/i18n/messages/vi.json";
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

  it.each([
    ["en", en],
    ["vi", vi]
  ] as const)(
    "gives every chapter a title, a summary, and exactly two stats in %s",
    (_locale, messages) => {
      const work = messages.work as Record<string, unknown>;
      for (const { key } of chapterOrder) {
        const entry = work[key] as {
          title?: string;
          summary?: string;
          stats?: Array<{ value: string; label: string }>;
        };
        expect(entry.title, key).toBeTruthy();
        expect(entry.summary, key).toBeTruthy();
        expect(entry.stats, key).toHaveLength(2);
      }
    }
  );
});
