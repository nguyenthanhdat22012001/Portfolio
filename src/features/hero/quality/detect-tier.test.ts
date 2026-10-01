import { describe, expect, it } from "vitest";
import { LOW_TIER_NODE_IDS } from "../graph/graph-data";
import { TIER_DPR, detectTier, downgradeTier, tierFeatures, type TierEnv } from "./detect-tier";

const desktop: TierEnv = { finePointer: true, cores: 8, memory: undefined, slotWidth: 600 };

describe("detectTier", () => {
  it.each([
    [{}, "high"],
    [{ memory: 8 }, "high"],
    [{ memory: 16 }, "high"],
    [{ memory: 4 }, "medium"],
    [{ cores: 4 }, "medium"],
    [{ cores: undefined }, "medium"],
    [{ finePointer: false }, "low"],
    [{ slotWidth: 479 }, "low"],
    [{ slotWidth: 480 }, "high"]
  ] as const)("%o → %s", (override, expected) => {
    expect(detectTier({ ...desktop, ...override })).toBe(expected);
  });
});

describe("downgradeTier", () => {
  it("steps down one tier and stops at low", () => {
    expect(downgradeTier("high")).toBe("medium");
    expect(downgradeTier("medium")).toBe("low");
    expect(downgradeTier("low")).toBe("low");
  });
});

describe("tier table", () => {
  it("matches the spec's dpr column", () => {
    expect(TIER_DPR).toEqual({ high: [1, 1.5], medium: [1, 1.25], low: 1 });
  });

  it("low drops labels, interaction, parallax and three nodes", () => {
    expect(tierFeatures("low")).toEqual({
      labels: false,
      interactive: false,
      parallax: false,
      nodeIds: LOW_TIER_NODE_IDS
    });
    expect(tierFeatures("medium")).toEqual({
      labels: true,
      interactive: true,
      parallax: true,
      nodeIds: undefined
    });
  });
});
