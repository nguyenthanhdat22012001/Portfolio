import { describe, expect, it } from "vitest";
import { lighthouseToShow, type LighthouseScores } from "./lighthouse";

const scores: LighthouseScores = {
  performance: 95,
  accessibility: 100,
  bestPractices: 100,
  seo: 100,
  measuredAt: "2026-10-01"
};
const daysAfter = (days: number) =>
  new Date(Date.UTC(2026, 9, 1) + days * 24 * 60 * 60 * 1000);

describe("lighthouseToShow", () => {
  it("shows nothing before a production run is recorded", () => {
    expect(lighthouseToShow(null, daysAfter(0))).toBeNull();
  });

  it("shows scores measured 89 days ago", () => {
    expect(lighthouseToShow(scores, daysAfter(89))).toEqual(scores);
  });

  it("shows scores measured exactly 90 days ago", () => {
    expect(lighthouseToShow(scores, daysAfter(90))).toEqual(scores);
  });

  it("hides scores older than 90 days", () => {
    expect(lighthouseToShow(scores, daysAfter(91))).toBeNull();
  });
});
