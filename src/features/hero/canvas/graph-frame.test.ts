import { describe, expect, it } from "vitest";
import type { Vec3 } from "@/shared/lib/math";
import { LAYER_SPACING } from "../graph/layouts";
import {
  GRAPH_WIDTH,
  crossEdgeOpacity,
  fitCameraZ,
  mixInto,
  morphK,
  nodeScale,
  writeEdges
} from "./graph-frame";

describe("morphK", () => {
  it("clamps and eases", () => {
    expect(morphK(-1)).toBe(0);
    expect(morphK(2)).toBe(1);
    expect(morphK(0.5)).toBeCloseTo(0.5);
  });
});

describe("crossEdgeOpacity", () => {
  it("is 0.6 while tangled and gone by 0.65", () => {
    expect(crossEdgeOpacity(0)).toBeCloseTo(0.6);
    expect(crossEdgeOpacity(0.35)).toBeCloseTo(0.6);
    expect(crossEdgeOpacity(0.5)).toBeCloseTo(0.3);
    expect(crossEdgeOpacity(0.65)).toBe(0);
    expect(crossEdgeOpacity(1)).toBe(0);
  });
});

describe("mixInto", () => {
  it("lerps two points and adds an optional offset", () => {
    const out: Vec3 = [0, 0, 0];
    mixInto(out, [0, 0, 0], [2, 4, 6], 0.5);
    expect(out).toEqual([1, 2, 3]);
    mixInto(out, [0, 0, 0], [2, 4, 6], 0.5, [1, 1, 1]);
    expect(out).toEqual([2, 3, 4]);
  });
});

describe("writeEdges", () => {
  it("writes endpoint pairs and skips edges with unknown nodes", () => {
    const positions = new Map<string, Vec3>([["a", [1, 2, 3]], ["b", [4, 5, 6]]]);
    const out = new Float32Array(12);
    const count = writeEdges(out, [{ from: "a", to: "b" }, { from: "a", to: "zzz" }], positions);
    expect(count).toBe(1);
    expect([...out.slice(0, 6)]).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("nodeScale", () => {
  it("maps size 1 → 1.0 and 3 → 1.5", () => {
    expect(nodeScale(1)).toBe(1);
    expect(nodeScale(3)).toBe(1.5);
  });
});

describe("fitCameraZ", () => {
  it("fits the layered width to 85% of the view and clamps to [7, 14]", () => {
    const fov = (45 * Math.PI) / 180;
    const expected = GRAPH_WIDTH / 2 / (Math.tan(fov / 2) * 1.5 * 0.85);
    expect(fitCameraZ(1.5)).toBeCloseTo(Math.min(14, Math.max(7, expected)));
    expect(fitCameraZ(10)).toBe(7);
    expect(fitCameraZ(0.2)).toBe(14);
  });

  it("uses 6 × LAYER_SPACING plus a node radius as the graph width", () => {
    expect(GRAPH_WIDTH).toBeCloseTo(6 * LAYER_SPACING + 0.27);
  });
});
