import { describe, expect, it } from "vitest";
import { activeStep } from "./safebulk-step";

describe("activeStep", () => {
  it.each([
    [0, 0],
    [0.33, 0],
    [0.34, 1],
    [0.99, 2],
    [1, 2],
    [-0.5, 0],
    [1.5, 2]
  ])("maps progress %d to step %d of 3", (progress, expected) => {
    expect(activeStep(progress, 3)).toBe(expected);
  });
});
