import { describe, expect, it } from "vitest";
import {
  assertDefaultLocale,
  assertUnique,
  availableLocales,
  findDuplicate,
  findForLocale,
  localeParams,
  newestFirst,
  selectForLocale,
  withoutDrafts
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
    expect(
      findDuplicate([...docs, { slug: "beta", locale: "en" as const }])
    ).toBe("en/beta");
  });

  it("throws with the collection name when duplicates exist", () => {
    expect(() =>
      assertUnique("work", [...docs, { slug: "beta", locale: "en" as const }])
    ).toThrow("Duplicate work entry: en/beta");
  });
});

describe("default-locale coverage", () => {
  it("accepts documents that all have an English version", () => {
    expect(() => assertDefaultLocale("work", docs.slice(0, 3))).not.toThrow();
  });

  // The locale switcher links every page to its English twin, so a
  // Vietnamese-only document would give it a link to a 404.
  it("rejects a Vietnamese document with no English version", () => {
    expect(() => assertDefaultLocale("work", docs)).toThrow(
      "work entry vi/gamma has no en version"
    );
  });
});

describe("availableLocales", () => {
  it("lists only locales with a real document", () => {
    expect(availableLocales(docs, "alpha")).toEqual(["en", "vi"]);
    expect(availableLocales(docs, "beta")).toEqual(["en"]);
    expect(availableLocales(docs, "gamma")).toEqual(["vi"]);
  });

  it("returns nothing for an unknown slug", () => {
    expect(availableLocales(docs, "missing")).toEqual([]);
  });

  it("orders by routing.locales, not by document order", () => {
    const reversed = [
      { slug: "x", locale: "vi" },
      { slug: "x", locale: "en" }
    ] as const;
    expect(availableLocales(reversed, "x")).toEqual(["en", "vi"]);
  });
});

describe("withoutDrafts", () => {
  const all: { slug: string; draft?: boolean }[] = [
    { slug: "a" },
    { slug: "a", draft: true },
    { slug: "b", draft: false }
  ];

  it("drops drafts when drafts are excluded", () => {
    expect(withoutDrafts(all, false)).toEqual([all[0], all[2]]);
  });

  it("keeps everything when drafts are included", () => {
    expect(withoutDrafts(all, true)).toEqual(all);
  });
});
