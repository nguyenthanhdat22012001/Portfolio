// @vitest-environment node
import { describe, expect, it } from "vitest";
import { linkKeys } from "./links";
import { workFrontmatter } from "./work-schema";

const valid = {
  slug: "swift-performance",
  title: "Swift: live feedback for store speed optimizations",
  summary: "A summary.",
  description: "x".repeat(150),
  locale: "en",
  role: "Front-End Engineer",
  team: "Team of 9 (2 FE)",
  company: "FireGroup",
  period: { start: "2022-10", end: "2024-06" },
  stack: ["React"],
  metrics: [{ value: "−20%", label: "initial load" }],
  links: { live: "https://apps.shopify.com/swift" },
  dateModified: "2026-09-30"
};

const parse = (patch: Record<string, unknown>) =>
  workFrontmatter.safeParse({ ...valid, ...patch }).success;

describe("workFrontmatter", () => {
  it("accepts a complete case study", () => {
    expect(parse({})).toBe(true);
  });

  it("accepts an optional boolean draft flag", () => {
    expect(parse({ draft: true })).toBe(true);
    expect(parse({ draft: "yes" })).toBe(false);
  });

  it("accepts an open-ended period and no team or company", () => {
    expect(
      parse({ period: { start: "2026-07" }, team: undefined, company: undefined })
    ).toBe(true);
  });

  it.each([
    ["a missing description", { description: undefined }],
    ["a description under 140 characters", { description: "x".repeat(139) }],
    ["a description over 160 characters", { description: "x".repeat(161) }],
    ["a non-URL App Store link", { links: { appStore: "safebulk-editor" } }],
    ["an unknown link key", { links: { loom: "https://www.loom.com/x" } }],
    ["no metrics", { metrics: [] }],
    ["five metrics", { metrics: Array(5).fill({ value: "1", label: "x" }) }],
    ["a period start that is not YYYY-MM", { period: { start: "2022" } }],
    ["a missing role", { role: undefined }]
  ])("rejects %s", (_name, patch) => {
    expect(parse(patch)).toBe(false);
  });

  it("allows exactly the link keys the UI knows how to order", () => {
    expect(Object.keys(workFrontmatter.shape.links.shape).sort()).toEqual(
      [...linkKeys].sort()
    );
  });
});
