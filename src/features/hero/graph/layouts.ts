import type { Vec3 } from "@/shared/lib/math";
import { NODES, type GraphNode, type Layer } from "./graph-data";
import { mulberry32 } from "./prng";

export type { Vec3 };

export const LAYER_Y: Record<Layer, number> = {
  app: 1.8,
  feature: 0,
  shared: -1.8
};
export const LAYER_SPACING = 1.15;
export const CHAOS_RADIUS = 2.6;
export const MIN_DIST = 0.6;
export const SEED = 20260101;
const MAX_TRIES = 200;

/** Node sphere radius in world units, before `nodeScale`. */
export const NODE_RADIUS = 0.18;

export function nodeScale(size: GraphNode["size"]): number {
  return 0.75 + size * 0.25;
}

/** Layered graph width the camera fits: 6 × spacing plus the largest radius. */
export const GRAPH_WIDTH = 6 * LAYER_SPACING + NODE_RADIUS * nodeScale(3);
/** The camera fits GRAPH_WIDTH to this fraction of the slot width. */
export const FIT_FRACTION = 0.85;

/**
 * The static SVG's projection. The viewBox spans the same world width as the
 * canvas at z = 0 (GRAPH_WIDTH / FIT_FRACTION), centred on the origin, and is
 * 4 : 3 — as wide as the widest slot — so `meet` maps its width to the slot
 * width on both breakpoints, like the camera. The camera distance depends on
 * the slot's aspect (≈ 7.6 on mobile, ≈ 11.6 on desktop); 9 keeps every node
 * within ~1% of the slot width of its first canvas frame on both.
 */
export const STATIC_VIEW = {
  w: 400,
  h: 300,
  worldWidth: GRAPH_WIDTH / FIT_FRACTION,
  cameraZ: 9
} as const;

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

const FULL_CHAOS = chaosLayout(NODES);

/**
 * Chaos positions always come from the full graph (what the SVG draws), so a
 * node subset (Low tier) keeps each node where the placeholder shows it.
 * Layered rows are laid out per subset so they stay centred.
 */
export function graphLayouts(nodes: readonly GraphNode[]) {
  const chaos: Record<string, Vec3> = {};
  for (const node of nodes) {
    const p = FULL_CHAOS[node.id];
    if (p) chaos[node.id] = p;
  }
  return { chaos, layered: layeredLayout(nodes) };
}

/** Three horizontal layers, nodes centered and evenly spaced on x, z = 0. */
export function layeredLayout(
  nodes: readonly GraphNode[]
): Record<string, Vec3> {
  const out: Record<string, Vec3> = {};
  for (const layer of ["app", "feature", "shared"] as const) {
    const onLayer = nodes.filter((n) => n.layer === layer);
    onLayer.forEach((node, i) => {
      out[node.id] = [
        (i - (onLayer.length - 1) / 2) * LAYER_SPACING,
        LAYER_Y[layer],
        0
      ];
    });
  }
  return out;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * Perspective projection (camera on +z at `cameraZ`, looking at the origin) to
 * an SVG viewBox whose width spans `worldWidth` at z = 0, y flipped. Returns
 * [x, y, viewBox units per world unit at that depth].
 */
export function project2D(
  pos: Record<string, Vec3>,
  view: { w: number; h: number; worldWidth: number; cameraZ: number }
): Record<string, [number, number, number]> {
  const out: Record<string, [number, number, number]> = {};
  for (const [id, p] of Object.entries(pos)) {
    const unit =
      (view.w / view.worldWidth) * (view.cameraZ / (view.cameraZ - p[2]));
    out[id] = [
      round1(view.w / 2 + p[0] * unit),
      round1(view.h / 2 - p[1] * unit),
      unit
    ];
  }
  return out;
}
