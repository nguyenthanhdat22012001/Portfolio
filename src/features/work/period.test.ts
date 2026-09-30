import { describe, expect, it } from "vitest";
import { yearRange } from "./period";

describe("yearRange", () => {
  it.each([
    [{ start: "2022-10", end: "2024-06" }, "2022–2024"],
    [{ start: "2026-07" }, "2026"],
    [{ start: "2026-01", end: "2026-08" }, "2026"]
  ])("%j → %s", (period, expected) => {
    expect(yearRange(period)).toBe(expected);
  });
});
