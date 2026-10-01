import { describe, expect, it } from "vitest";
import {
  CROSS_EDGES,
  EDGES,
  LOW_TIER_NODE_IDS,
  NODES,
  selectGraph,
  type Layer
} from "./graph-data";
import {
  CHAOS_RADIUS,
  LAYER_Y,
  MIN_DIST,
  chaosLayout,
  layeredLayout,
  project2D
} from "./layouts";
import { mulberry32 } from "./prng";

const layerOf = new Map(NODES.map((n) => [n.id, n.layer]));
const rank: Record<Layer, number> = { app: 0, feature: 1, shared: 2 };
const dist = (a: number[], b: number[]) =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

describe("graph data", () => {
  it("has unique node ids", () => {
    expect(new Set(NODES.map((n) => n.id)).size).toBe(NODES.length);
  });

  it("only references existing nodes and has no duplicate edges", () => {
    for (const edges of [EDGES, CROSS_EDGES]) {
      const keys = edges.map((e) => `${e.from}>${e.to}`);
      expect(new Set(keys).size).toBe(keys.length);
      for (const e of edges) {
        expect(layerOf.has(e.from)).toBe(true);
        expect(layerOf.has(e.to)).toBe(true);
      }
    }
  });

  it("allowed edges always point down a layer", () => {
    for (const e of EDGES) {
      expect(rank[layerOf.get(e.from)!]).toBeLessThan(rank[layerOf.get(e.to)!]);
    }
  });

  it("cross edges are feature ↔ feature", () => {
    for (const e of CROSS_EDGES) {
      expect(layerOf.get(e.from)).toBe("feature");
      expect(layerOf.get(e.to)).toBe("feature");
    }
  });

  it("low tier ids are a subset of the node ids", () => {
    for (const id of LOW_TIER_NODE_IDS) expect(layerOf.has(id)).toBe(true);
  });

  it("selectGraph drops nodes and the edges touching them", () => {
    const low = selectGraph(LOW_TIER_NODE_IDS);
    expect(low.nodes.map((n) => n.id)).toEqual(
      NODES.filter((n) => LOW_TIER_NODE_IDS.includes(n.id)).map((n) => n.id)
    );
    const kept = new Set(LOW_TIER_NODE_IDS);
    for (const e of [...low.edges, ...low.crossEdges]) {
      expect(kept.has(e.from) && kept.has(e.to)).toBe(true);
    }
    expect(selectGraph().nodes).toBe(NODES);
  });
});

describe("mulberry32", () => {
  it("is deterministic per seed and stays in [0, 1)", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i += 1) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("chaosLayout", () => {
  it("is deterministic", () => {
    expect(chaosLayout(NODES)).toEqual(chaosLayout(NODES));
  });

  it("keeps points inside the sphere and apart", () => {
    const points = Object.values(chaosLayout(NODES));
    expect(points).toHaveLength(NODES.length);
    for (const p of points) {
      expect(Math.hypot(...p)).toBeLessThanOrEqual(CHAOS_RADIUS);
    }
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        expect(dist(points[i]!, points[j]!)).toBeGreaterThanOrEqual(MIN_DIST);
      }
    }
  });
});

describe("layeredLayout", () => {
  it("puts every node on its layer's y, z = 0, x symmetric around 0", () => {
    const pos = layeredLayout(NODES);
    for (const layer of ["app", "feature", "shared"] as const) {
      const xs = NODES.filter((n) => n.layer === layer).map((n) => {
        const p = pos[n.id]!;
        expect(p[1]).toBe(LAYER_Y[layer]);
        expect(p[2]).toBe(0);
        return p[0];
      });
      const sum = xs.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(0);
    }
  });
});

describe("project2D", () => {
  it("fits points inside the padded viewBox with y flipped", () => {
    const view = { w: 400, h: 320, pad: 28 };
    const points = project2D(layeredLayout(NODES), view);
    for (const [x, y] of Object.values(points)) {
      expect(x).toBeGreaterThanOrEqual(view.pad - 0.05);
      expect(x).toBeLessThanOrEqual(view.w - view.pad + 0.05);
      expect(y).toBeGreaterThanOrEqual(view.pad - 0.05);
      expect(y).toBeLessThanOrEqual(view.h - view.pad + 0.05);
    }
    expect(points.admin![1]).toBeLessThan(points.ui![1]);
  });
});
