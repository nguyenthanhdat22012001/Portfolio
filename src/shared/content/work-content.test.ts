import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getWorkBySlug } from "@/shared/content";

const doc = (slug: string) => {
  const entry = getWorkBySlug(slug, "en");
  if (!entry) throw new Error(`missing ${slug}`);
  return entry.doc;
};

describe("case-study frontmatter matches CV v2", () => {
  it.each([
    ["swift-performance", "−20%", "Team of 9 (2 FE)"],
    ["oneloyalty-layered-architecture", "≤ 0.1", "Team of 9 (2 FE)"],
    ["safebulk-bulk-editor", "~1.5 mo", "1 FE, 1 BE"]
  ])("%s leads with %s and names its team", (slug, headline, team) => {
    expect(doc(slug).metrics[0]?.value).toBe(headline);
    expect(doc(slug).team).toBe(team);
  });

  it("links SafeBulk to the App Store, GitHub, and the YouTube demo", () => {
    expect(doc("safebulk-bulk-editor").links).toEqual({
      appStore: "https://apps.shopify.com/safebulk-editor",
      github: "https://github.com/nguyenthanhdat22012001/safe-bulk-shopify",
      demo: "https://youtu.be/uaKi8VwIrKE"
    });
  });
});

const files = [
  "swift-performance",
  "oneloyalty-layered-architecture",
  "safebulk-bulk-editor"
].map((slug) => [
  slug,
  readFileSync(path.join(process.cwd(), "content/work", `${slug}.mdx`), "utf8")
] as const);

describe("case-study bodies carry no CV v1 claims", () => {
  it.each(files)("%s", (_slug, source) => {
    for (const stale of [
      "12–13s", "1–3s", "8–9s", "40+", "5–10 min", "12.6k", "520+",
      "8 languages", "8-language", "4 tiers", "two product teams",
      "loom.com", "Loom"
    ]) {
      expect(source).not.toContain(stale);
    }
  });

  it("every body opens with a Context section", () => {
    for (const [, source] of files) {
      expect(source).toMatch(/\n## Context\n/);
    }
  });
});
