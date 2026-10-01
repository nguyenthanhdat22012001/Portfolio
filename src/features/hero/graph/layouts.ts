import type { Vec3 } from "@/shared/lib/math";
import type { GraphNode, Layer } from "./graph-data";
import { mulberry32 } from "./prng";

export type { Vec3 };

export const LAYER_Y: Record<Layer, number> = { app: 1.8, feature: 0, shared: -1.8 };
export const LAYER_SPACING = 1.15;
export const CHAOS_RADIUS = 2.6;
export const MIN_DIST = 0.6;
export const SEED = 20260101;
const MAX_TRIES = 200;

/** Deterministic tangle: rejection-sample points in a sphere, min distance MIN_DIST. */
export function chaosLayout(
  nodes: readonly GraphNode[],
  seed = SEED
): Record<string, Vec3> {
  const random = mulberry32(seed);
  const coord = () => (random() * 2 - 1) * CHAOS_RADIUS;
  const sample = (): Vec3 => [coord(), coord(), coord()];
  const accepted: Vec3[] = [];
  const fits = (p: Vec3) =>
    Math.hypot(...p) <= CHAOS_RADIUS &&
    accepted.every(
      (q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) >= MIN_DIST
    );

  const out: Record<string, Vec3> = {};
  for (const node of nodes) {
    let point = sample();
    for (let tries = 1; tries < MAX_TRIES && !fits(point); tries += 1) {
      point = sample();
    }
    accepted.push(point);
    out[node.id] = point;
  }
  return out;
}

/** Three horizontal layers, nodes centered and evenly spaced on x, z = 0. */
export function layeredLayout(nodes: readonly GraphNode[]): Record<string, Vec3> {
  const out: Record<string, Vec3> = {};
  for (const layer of ["app", "feature", "shared"] as const) {
    const onLayer = nodes.filter((n) => n.layer === layer);
    onLayer.forEach((node, i) => {
      out[node.id] = [(i - (onLayer.length - 1) / 2) * LAYER_SPACING, LAYER_Y[layer], 0];
    });
  }
  return out;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Orthographic projection (drops z) to an SVG viewBox, y flipped. */
export function project2D(
  pos: Record<string, Vec3>,
  view: { w: number; h: number; pad: number }
): Record<string, [number, number]> {
  const points = Object.values(pos);
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...ys),
    Math.max(...ys)
  ];
  const scale = Math.min(
    (view.w - 2 * view.pad) / (maxX - minX || 1),
    (view.h - 2 * view.pad) / (maxY - minY || 1)
  );
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const out: Record<string, [number, number]> = {};
  for (const [id, p] of Object.entries(pos)) {
    out[id] = [
      round1(view.w / 2 + (p[0] - cx) * scale),
      round1(view.h / 2 - (p[1] - cy) * scale)
    ];
  }
  return out;
}
