import { describe, expect, it } from "vitest";
import {
  TIER_DPR,
  capForSlot,
  detectTier,
  downgradeTier,
  lowerTier,
  type TierEnv
} from "./detect-tier";

const desktop: TierEnv = { finePointer: true, cores: 8, memory: undefined };

describe("detectTier (device only)", () => {
  it.each([
    [{}, "high"],
    [{ memory: 8 }, "high"],
    [{ memory: 16 }, "high"],
    [{ memory: 4 }, "medium"],
    [{ cores: 4 }, "medium"],
    [{ cores: undefined }, "medium"],
    [{ finePointer: false }, "low"]
  ] as const)("%o → %s", (override, expected) => {
    expect(detectTier({ ...desktop, ...override })).toBe(expected);
  });
});

describe("capForSlot", () => {
  it("drops to low below the slot's minimum width, else keeps the level", () => {
    expect(capForSlot("high", 479, 480)).toBe("low");
    expect(capForSlot("high", 480, 480)).toBe("high");
    expect(capForSlot("medium", 1000, 480)).toBe("medium");
  });
});

describe("lowerTier", () => {
  it("returns the lower of two tiers", () => {
    expect(lowerTier("high", "medium")).toBe("medium");
    expect(lowerTier("low", "high")).toBe("low");
    expect(lowerTier("medium", "medium")).toBe("medium");
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
});
