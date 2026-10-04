import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { work as allWork } from "#site/content";
import { getWorkBySlug } from "@/shared/content";

const dir = path.join(process.cwd(), "content/work");
const slugs = [
  "swift-performance",
  "oneloyalty-layered-architecture",
  "safebulk-bulk-editor"
] as const;
const read = (slug: string, locale: "en" | "vi") =>
  readFileSync(path.join(dir, `${slug}.${locale}.mdx`), "utf8");

const doc = (slug: string) => {
  const entry = getWorkBySlug(slug, "en");
  if (!entry) throw new Error(`missing ${slug}`);
  return entry.doc;
};

describe("case-study frontmatter matches the final content", () => {
  it.each([
    ["swift-performance", ["−20%", "JS → TS", "4"], "Team of 9 (2 FE)"],
    ["oneloyalty-layered-architecture", ["≤ 0.1", "2 → 1", "1"], "Team of 9 (2 FE)"],
    ["safebulk-bulk-editor", ["~1.5 mo", "Live", "3"], "1 FE, 1 BE"]
  ])("%s has metrics %j and names its team", (slug, values, team) => {
    expect(doc(slug).metrics.map((m) => m.value)).toEqual(values);
    expect(doc(slug).team).toBe(team);
  });

  it("adds GraphQL to Oneloyalty and the Admin GraphQL API and Claude to SafeBulk", () => {
    expect(doc("oneloyalty-layered-architecture").stack).toContain("GraphQL");
    expect(doc("safebulk-bulk-editor").stack).toEqual(
      expect.arrayContaining(["Shopify Admin GraphQL API", "Claude"])
    );
  });

  it("links SafeBulk to the App Store, GitHub, and the YouTube demo", () => {
    expect(doc("safebulk-bulk-editor").links).toEqual({
      appStore: "https://apps.shopify.com/safebulk-editor",
      github: "https://github.com/nguyenthanhdat22012001/safe-bulk-shopify",
      demo: "https://youtu.be/uaKi8VwIrKE"
    });
  });
});

describe("content files", () => {
  it("are named <slug>.<locale>.mdx, one en and one vi per case study", () => {
    expect(readdirSync(dir).sort()).toEqual(
      slugs.flatMap((s) => [`${s}.en.mdx`, `${s}.vi.mdx`]).sort()
    );
  });

  it.each(slugs.flatMap((s) => [[s, "en"], [s, "vi"]] as const))(
    "%s.%s has no TODO(Dat), opens with Context, and carries no stale claim",
    (slug, locale) => {
      const source = read(slug, locale);
      expect(source).not.toContain("TODO(Dat)");
      expect(source).toMatch(/\n## (Context|Bối cảnh)\n/);
      for (const stale of [
        "12–13s", "1–3s", "8–9s", "40+", "5–10 min", "12.6k", "520+",
        "8 languages", "4 tiers", "loom.com", "55%", "14 kB", "replaced Formik"
      ]) {
        expect(source).not.toContain(stale);
      }
    }
  );

  it("never marks an English file as a draft", () => {
    for (const slug of slugs) {
      expect(read(slug, "en")).not.toMatch(/^draft: true$/m);
    }
  });
});

describe("VI case studies mirror their EN source", () => {
  const translatable = new Set([
    "title", "summary", "description", "role", "team", "draft", "content",
    "locale", "metrics"
  ]);
  const find = (slug: string, locale: "en" | "vi") => {
    const doc = allWork.find((d) => d.slug === slug && d.locale === locale);
    if (!doc) throw new Error(`missing ${locale}/${slug}`);
    return doc;
  };
  const fixed = (doc: object) =>
    Object.fromEntries(
      Object.entries(doc).filter(([key]) => !translatable.has(key))
    );

  it.each(slugs)("%s keeps every non-translatable field identical", (slug) => {
    expect(fixed(find(slug, "vi"))).toEqual(fixed(find(slug, "en")));
  });

  it.each(slugs)("%s keeps metric values (a unit word may be localized)", (slug) => {
    const localizedUnit: Record<string, string> = { "~1.5 mo": "~1.5 th" };
    expect(find(slug, "vi").metrics.map((m) => m.value)).toEqual(
      find(slug, "en").metrics.map((m) => localizedUnit[m.value] ?? m.value)
    );
  });
});

// Canvas size of a VP8X WebP (24-bit little-endian, stored minus one).
function webpSize(file: string): { width: number; height: number } {
  const bytes = readFileSync(file);
  if (bytes.toString("ascii", 12, 16) !== "VP8X") {
    throw new Error(`${file}: expected an extended (VP8X) WebP`);
  }
  return {
    width: bytes.readUIntLE(24, 3) + 1,
    height: bytes.readUIntLE(27, 3) + 1
  };
}

describe("MDX images", () => {
  it.each(slugs.flatMap((s) => [[s, "en"], [s, "vi"]] as const))(
    "%s.%s declares each image's real size (no layout shift)",
    (slug, locale) => {
      const images = read(slug, locale).matchAll(
        /<Image\s+src="([^"]+)"\s+width=\{(\d+)\}\s+height=\{(\d+)\}/g
      );
      for (const [, src, width, height] of images) {
        const file = path.join(process.cwd(), "public", src!);
        expect([src, webpSize(file)]).toEqual([
          src,
          { width: Number(width), height: Number(height) }
        ]);
      }
    }
  );
});
