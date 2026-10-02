import { describe, expect, it } from "vitest";
import { LOW_TIER_NODE_IDS } from "../graph/graph-data";
import { HERO_MIN_SLOT_WIDTH, tierFeatures } from "./tier-features";

describe("tierFeatures", () => {
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

  it("keeps the Phase 5 slot rule", () => {
    expect(HERO_MIN_SLOT_WIDTH).toBe(480);
  });
});
