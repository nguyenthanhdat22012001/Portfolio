import { describe, expect, it } from "vitest";
import en from "./en.json";
import vi from "./vi.json";

// Reduces a message tree to its shape: object keys, array lengths, and the
// ICU placeholders each string uses. Translations may differ; shapes may not.
function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, shape(child)])
    );
  }
  if (typeof value === "string") {
    return [...value.matchAll(/\{(\w+)/g)].map((m) => m[1]).sort();
  }
  return typeof value;
}

describe("message catalogs", () => {
  it("en and vi have identical key trees and placeholders", () => {
    expect(shape(vi)).toEqual(shape(en));
  });

  it("defines the Phase 2 namespaces", () => {
    expect(Object.keys(en)).toEqual(
      expect.arrayContaining([
        "nav",
        "locales",
        "theme",
        "hero",
        "about",
        "work",
        "skills",
        "contact",
        "footer",
        "caseStudy",
        "blog"
      ])
    );
  });
});

describe("SEO copy lengths", () => {
  for (const [name, catalog] of [
    ["en", en],
    ["vi", vi]
  ] as const) {
    it(`${name}: meta.title is at most 60 characters`, () => {
      expect(catalog.meta.title.length).toBeLessThanOrEqual(60);
    });

    for (const [key, value] of [
      ["meta.description", catalog.meta.description],
      ["blog.description", catalog.blog.description]
    ] as const) {
      it(`${name}: ${key} is 140–160 characters`, () => {
        expect(value.length).toBeGreaterThanOrEqual(140);
        expect(value.length).toBeLessThanOrEqual(160);
      });
    }
  }
});
