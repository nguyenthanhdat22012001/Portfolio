import { describe, expect, it } from "vitest";
import type { Vec3 } from "@/shared/lib/math";
import {
  LAYER_SPACING,
  STATIC_VIEW,
  chaosLayout,
  layeredLayout,
  project2D
} from "../graph/layouts";
import {
  GRAPH_WIDTH,
  crossEdgeOpacity,
  fitCameraZ,
  mixInto,
  morphK,
  nodeScale,
  visibleLabels,
  writeEdges,
  pushOffset,
  pushWeight
} from "./graph-frame";
import { NODES } from "../graph/graph-data";

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
    const positions = new Map<string, Vec3>([
      ["a", [1, 2, 3]],
      ["b", [4, 5, 6]]
    ]);
    const out = new Float32Array(12);
    const count = writeEdges(
      out,
      [
        { from: "a", to: "b" },
        { from: "a", to: "zzz" }
      ],
      positions
    );
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

// The SVG placeholder must line up with the canvas's first frame (spec §4.1).
// Both slots are no wider than the viewBox, so `meet` scales the viewBox to
// the slot width; compare positions as fractions of the slot width.
describe("static SVG vs first canvas frame", () => {
  const halfTan = Math.tan((45 * Math.PI) / 360);
  for (const [name, aspect] of [
    ["mobile 4/3", 4 / 3],
    ["desktop 7/8", 7 / 8]
  ] as const) {
    it(`${name}: nodes land within 1.5% of the slot width`, () => {
      expect(STATIC_VIEW.w / STATIC_VIEW.h).toBeGreaterThanOrEqual(
        aspect - 1e-9
      );
      const z = fitCameraZ(aspect);
      const visibleWidth = 2 * z * halfTan * aspect;
      for (const layout of [chaosLayout(NODES), layeredLayout(NODES)]) {
        const svg = project2D(layout, STATIC_VIEW);
        for (const [id, p] of Object.entries(layout)) {
          const f = z / (z - p[2]);
          const canvas = [
            (p[0] * f) / visibleWidth,
            (-p[1] * f) / visibleWidth
          ];
          const [x, y] = svg[id]!;
          const placeholder = [
            (x - STATIC_VIEW.w / 2) / STATIC_VIEW.w,
            (y - STATIC_VIEW.h / 2) / STATIC_VIEW.w
          ];
          expect(
            Math.hypot(
              canvas[0]! - placeholder[0]!,
              canvas[1]! - placeholder[1]!
            )
          ).toBeLessThan(0.015);
        }
      }
    });
  }
});

describe("visibleLabels", () => {
  it("shows nothing while tangled and nothing is hovered", () => {
    expect(visibleLabels(NODES, 0.5, null)).toEqual([]);
  });

  it("shows the four size-3 nodes once morph > 0.7", () => {
    expect(visibleLabels(NODES, 0.8, null)).toEqual([
      "admin",
      "extensions",
      "ui",
      "i18n"
    ]);
  });

  it("always shows the hovered node, replacing the least relevant", () => {
    expect(visibleLabels(NODES, 0.2, "redeem")).toEqual(["redeem"]);
    expect(visibleLabels(NODES, 0.8, "redeem")).toEqual([
      "redeem",
      "admin",
      "extensions",
      "ui"
    ]);
    expect(visibleLabels(NODES, 0.8, "ui")).toEqual([
      "ui",
      "admin",
      "extensions",
      "i18n"
    ]);
  });
});

describe("pushWeight", () => {
  it("is full until 0.2 and gone from 0.3", () => {
    expect(pushWeight(0)).toBe(1);
    expect(pushWeight(0.2)).toBe(1);
    expect(pushWeight(0.25)).toBeCloseTo(0.5);
    expect(pushWeight(0.3)).toBe(0);
  });
});

describe("pushOffset", () => {
  it("pushes away from the ray by (1.2 - d) x 0.35", () => {
    const out: Vec3 = [0, 0, 0];
    pushOffset(out, [0.5, 0, 0], [0, 0, 0], 1);
    expect(out[0]).toBeCloseTo((1.2 - 0.5) * 0.35);
    expect(out[1]).toBe(0);
    expect(out[2]).toBe(0);
  });

  it("does nothing outside the radius, at zero weight, or exactly on the ray", () => {
    const out: Vec3 = [9, 9, 9];
    expect(pushOffset(out, [2, 0, 0], [0, 0, 0], 1)).toEqual([0, 0, 0]);
    expect(pushOffset(out, [0.5, 0, 0], [0, 0, 0], 0)).toEqual([0, 0, 0]);
    expect(pushOffset(out, [0, 0, 0], [0, 0, 0], 1)).toEqual([0, 0, 0]);
  });
});
