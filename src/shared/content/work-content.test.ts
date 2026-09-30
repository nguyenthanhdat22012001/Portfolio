import { describe, expect, it } from "vitest";
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
