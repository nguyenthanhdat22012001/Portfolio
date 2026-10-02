import { describe, expect, it } from "vitest";
import { LOW_FPS_FLOOR, downgradeTier, type RenderTier } from "./detect-tier";
import { declineAction, monitorBounds } from "./perf-policy";

// drei's PerformanceMonitor rule (iterations 10, threshold 0.75): a window of
// ten 250 ms samples declines when more than 7.5 of them sit below `lower`.
function dreiDeclines(samples: number[], level: RenderTier, refreshrate = 60) {
  const [lower] = monitorBounds(level, refreshrate);
  return samples.filter((fps) => fps < lower).length > samples.length * 0.75;
}

const steady = (fps: number) => Array.from({ length: 10 }, () => fps);
const noisy = (base: number) =>
  Array.from({ length: 10 }, (_, i) => base + ((i * 7) % 5) - 2);

describe("monitorBounds", () => {
  it("keeps drei's defaults above Low", () => {
    expect(monitorBounds("high", 60)).toEqual([40, 60]);
    expect(monitorBounds("medium", 60)).toEqual([40, 60]);
    expect(monitorBounds("high", 120)).toEqual([60, 100]);
  });

  it("uses the Off floor as the lower bound at Low", () => {
    expect(monitorBounds("low", 60)[0]).toBe(LOW_FPS_FLOOR);
    expect(monitorBounds("low", 120)[0]).toBe(LOW_FPS_FLOOR);
  });
});

describe("Low tier Off rule", () => {
  it("a steady 34 fps phone (spec target ≥ 30) never declines or goes Off", () => {
    for (const samples of [steady(34), noisy(34), steady(26)]) {
      expect(dreiDeclines(samples, "low")).toBe(false);
      expect(dreiDeclines(samples, "low", 120)).toBe(false);
      expect(declineAction("low", samples)).toBe("stay");
    }
  });

  it("a few dips below the floor are not sustained", () => {
    const samples = [34, 20, 34, 18, 34, 34, 22, 34, 34, 34];
    expect(dreiDeclines(samples, "low")).toBe(false);
  });

  it("sustained fps below the floor goes Off", () => {
    for (const samples of [
      steady(20),
      noisy(18),
      [24, 20, 22, 19, 21, 23, 20, 18, 30, 22]
    ]) {
      expect(dreiDeclines(samples, "low")).toBe(true);
      expect(declineAction("low", samples)).toBe("off");
    }
  });

  it("stays on when the window average is at or above the floor", () => {
    expect(declineAction("low", [24, 24, 24, 24, 24, 24, 24, 24, 60, 60])).toBe(
      "stay"
    );
  });
});

describe("tiers above Low", () => {
  it("a decline steps down exactly one tier", () => {
    expect(dreiDeclines(steady(34), "high")).toBe(true);
    expect(declineAction("high", steady(34))).toBe("downgrade");
    expect(declineAction("medium", steady(34))).toBe("downgrade");
    expect(declineAction("medium", steady(5))).toBe("downgrade");
    expect(downgradeTier("high")).toBe("medium");
    expect(downgradeTier("medium")).toBe("low");
  });

  it("never steps up", () => {
    const rank: Record<RenderTier, number> = { low: 0, medium: 1, high: 2 };
    for (const level of ["high", "medium", "low"] as const) {
      for (const samples of [steady(5), steady(34), steady(60), steady(120)]) {
        const action = declineAction(level, samples);
        expect(["stay", "downgrade", "off"]).toContain(action);
        const next = action === "downgrade" ? downgradeTier(level) : level;
        expect(rank[next]).toBeLessThanOrEqual(rank[level]);
      }
    }
  });
});
