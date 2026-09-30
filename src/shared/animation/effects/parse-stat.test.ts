import { describe, expect, it } from "vitest";
import { parseStat } from "./parse-stat";

describe("parseStat", () => {
  it.each([
    ["4", { value: 4, decimals: 0, suffix: "" }],
    ["40+", { value: 40, decimals: 0, suffix: "+" }],
    ["12.6k", { value: 12.6, decimals: 1, suffix: "k" }],
    ["2 teams", { value: 2, decimals: 0, suffix: " teams" }],
    ["1.5", { value: 1.5, decimals: 1, suffix: "" }]
  ])("parses %s", (text, expected) => {
    expect(parseStat(text)).toEqual(expected);
  });

  it.each(["1–3s", "5–10 min", "", "fast"])(
    "refuses %j (ranges and non-numbers are not counted)",
    (text) => {
      expect(parseStat(text)).toBeNull();
    }
  );
});
