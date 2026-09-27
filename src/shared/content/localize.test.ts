import { describe, expect, it } from "vitest";
import {
  assertUnique,
  findDuplicate,
  findForLocale,
  localeParams,
  newestFirst,
  selectForLocale
} from "./localize";

const docs = [
  { slug: "alpha", locale: "en", date: "2024-01-01" },
  { slug: "alpha", locale: "vi", date: "2024-01-01" },
  { slug: "beta", locale: "en", date: "2025-01-01" },
  { slug: "gamma", locale: "vi", date: "2023-01-01" }
] as const;

describe("findForLocale", () => {
  it("returns the exact locale when it exists", () => {
    expect(findForLocale(docs, "alpha", "vi")).toEqual({
      doc: docs[1],
      isFallback: false
    });
  });

  it("falls back to English and flags it", () => {
    expect(findForLocale(docs, "beta", "vi")).toEqual({
      doc: docs[2],
      isFallback: true
    });
  });

  it("returns null for an unknown slug", () => {
    expect(findForLocale(docs, "missing", "en")).toBeNull();
  });

  it("never falls back from English to Vietnamese", () => {
    expect(findForLocale(docs, "gamma", "en")).toBeNull();
  });
});

describe("selectForLocale", () => {
  it("returns one entry per slug, preferring the locale", () => {
    expect(
      selectForLocale(docs, "vi").map(({ doc, isFallback }) => [
        doc.slug,
        doc.locale,
        isFallback
      ])
    ).toEqual([
      ["alpha", "vi", false],
      ["beta", "en", true],
      ["gamma", "vi", false]
    ]);
  });

  it("omits Vietnamese-only documents from English", () => {
    expect(selectForLocale(docs, "en").map(({ doc }) => doc.slug)).toEqual([
      "alpha",
      "beta"
    ]);
  });
});

describe("localeParams", () => {
  it("lists only slug/locale pairs that resolve", () => {
    expect(localeParams(docs)).toEqual([
      { locale: "en", slug: "alpha" },
      { locale: "en", slug: "beta" },
      { locale: "vi", slug: "alpha" },
      { locale: "vi", slug: "beta" },
      { locale: "vi", slug: "gamma" }
    ]);
  });
});

describe("newestFirst", () => {
  it("sorts entries by date descending", () => {
    const sorted = newestFirst(selectForLocale(docs, "vi"), (d) => d.date);
    expect(sorted.map(({ doc }) => doc.slug)).toEqual([
      "beta",
      "alpha",
      "gamma"
    ]);
  });
});

describe("duplicate detection", () => {
  it("returns null when every slug/locale pair is unique", () => {
    expect(findDuplicate(docs)).toBeNull();
  });

  it("reports the first duplicated slug/locale pair", () => {
    expect(findDuplicate([...docs, { slug: "beta", locale: "en" as const }])).toBe(
      "en/beta"
    );
  });

  it("throws with the collection name when duplicates exist", () => {
    expect(() =>
      assertUnique("work", [...docs, { slug: "beta", locale: "en" as const }])
    ).toThrow("Duplicate work entry: en/beta");
  });
});
