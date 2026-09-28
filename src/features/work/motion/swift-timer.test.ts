import { describe, expect, it } from "vitest";
import { formatSwiftTimer } from "./swift-timer";

describe("formatSwiftTimer", () => {
  it.each([
    [0, "0.0s"],
    [0.5, "6.0s"],
    [1, "12.0s"],
    [-1, "0.0s"],
    [2, "12.0s"]
  ])("formats progress %d as %s", (progress, expected) => {
    expect(formatSwiftTimer(progress)).toBe(expected);
  });
});
