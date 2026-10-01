import { describe, expect, it } from "vitest";
import {
  clamp,
  damp,
  damp3,
  easeInOutCubic,
  lerp,
  smoothstep,
  type Vec3
} from "./math";

describe("clamp", () => {
  it("keeps values inside the range", () => {
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(2, 0, 1)).toBe(1);
    expect(clamp(0.3, 0, 1)).toBe(0.3);
  });
});

describe("lerp", () => {
  it("interpolates linearly", () => {
    expect(lerp(2, 4, 0.5)).toBe(3);
  });
});

describe("easeInOutCubic", () => {
  it("starts at 0, ends at 1, passes 0.5 at the middle", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
  });

  it("is monotonic", () => {
    let previous = -Infinity;
    for (let i = 0; i <= 100; i += 1) {
      const value = easeInOutCubic(i / 100);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });
});

describe("smoothstep", () => {
  it("is 0 below edge0, 1 above edge1, 0.5 in the middle", () => {
    expect(smoothstep(0.35, 0.65, 0.2)).toBe(0);
    expect(smoothstep(0.35, 0.65, 0.9)).toBe(1);
    expect(smoothstep(0.35, 0.65, 0.5)).toBeCloseTo(0.5);
  });
});

describe("damp", () => {
  it("moves towards the target and converges", () => {
    let value = 0;
    const first = damp(value, 10, 6, 1 / 60);
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(10);
    for (let i = 0; i < 600; i += 1) value = damp(value, 10, 6, 1 / 60);
    expect(value).toBeCloseTo(10, 5);
  });

  it("is frame-rate independent", () => {
    let at60 = 0;
    for (let i = 0; i < 60; i += 1) at60 = damp(at60, 1, 4, 1 / 60);
    let at30 = 0;
    for (let i = 0; i < 30; i += 1) at30 = damp(at30, 1, 4, 1 / 30);
    expect(at60).toBeCloseTo(at30, 6);
  });
});

describe("damp3", () => {
  it("damps each component in place", () => {
    const current: Vec3 = [0, 0, 0];
    for (let i = 0; i < 600; i += 1) damp3(current, [1, -2, 3], 6, 1 / 60);
    expect(current[0]).toBeCloseTo(1, 5);
    expect(current[1]).toBeCloseTo(-2, 5);
    expect(current[2]).toBeCloseTo(3, 5);
  });
});
