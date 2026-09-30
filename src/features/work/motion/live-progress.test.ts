import { describe, expect, it } from "vitest";
import { resultAt, stateAt, type StepState } from "./live-progress";

const steps = [0, 1, 2, 3];
const failOnce = (i: number) => i === 2;
const rank: Record<StepState, number> = {
  pending: 0,
  running: 1,
  failed: 1,
  done: 2
};

describe("stateAt", () => {
  it("starts with every step pending", () => {
    for (const i of steps) expect(stateAt(0, i, failOnce(i))).toBe("pending");
  });

  it("finishes every step once the result phase starts, and at the end", () => {
    for (const p of [0.8, 1]) {
      for (const i of steps) expect(stateAt(p, i, failOnce(i))).toBe("done");
    }
  });

  it("runs the step whose segment contains p", () => {
    expect(stateAt(0.1, 0, false)).toBe("running");
    expect(stateAt(0.1, 1, false)).toBe("pending");
  });

  it("shows the fail-once step as failed mid-segment, then done", () => {
    expect(stateAt(0.5, 2, true)).toBe("failed");
    expect(stateAt(0.5, 2, false)).toBe("running");
    expect(stateAt(0.45, 2, true)).toBe("running");
    expect(stateAt(0.61, 2, true)).toBe("done");
  });

  it("never moves a step backwards as progress grows", () => {
    for (const i of steps) {
      let previous = 0;
      for (let p = 0; p <= 1.0001; p += 0.01) {
        const current = rank[stateAt(p, i, failOnce(i))];
        expect(current).toBeGreaterThanOrEqual(previous);
        previous = current;
      }
    }
  });
});

describe("resultAt", () => {
  it.each([
    [-1, 0],
    [0, 0],
    [0.8, 0],
    [0.9, 10],
    [1, 20],
    [1.5, 20]
  ])("resultAt(%s) = %s", (p, expected) => {
    expect(resultAt(p)).toBe(expected);
  });
});
