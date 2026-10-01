import {
  clamp,
  easeInOutCubic,
  smoothstep,
  type Vec3
} from "@/shared/lib/math";
import type { GraphEdge, GraphNode } from "../graph/graph-data";
import { FIT_FRACTION, GRAPH_WIDTH } from "../graph/layouts";

export { GRAPH_WIDTH, nodeScale } from "../graph/layouts";

export type Positions = ReadonlyMap<string, Vec3>;

export interface GraphFrame {
  morph: number;
  delta: number;
  hovered: string | null;
}

/** Scene parts that Graph's single useFrame drives imperatively. */
export interface FrameUpdatable {
  update(positions: Positions, frame: GraphFrame): void;
}

export const POSITION_DAMPING = 6;
export const ROTATION_DAMPING = 4;
export const SPIN_SPEED = 0.05;
export const HOVER_SCALE = 1.4;

export function morphK(morph: number): number {
  return easeInOutCubic(clamp(morph, 0, 1));
}

export function crossEdgeOpacity(morph: number): number {
  return 0.6 * (1 - smoothstep(0.35, 0.65, morph));
}

export function mixInto(
  out: Vec3,
  a: Readonly<Vec3>,
  b: Readonly<Vec3>,
  k: number,
  offset?: Readonly<Vec3>
): Vec3 {
  out[0] = a[0] + (b[0] - a[0]) * k + (offset?.[0] ?? 0);
  out[1] = a[1] + (b[1] - a[1]) * k + (offset?.[1] ?? 0);
  out[2] = a[2] + (b[2] - a[2]) * k + (offset?.[2] ?? 0);
  return out;
}

/** Copies edge endpoints into a LineSegments position buffer; returns the edge count written. */
export function writeEdges(
  out: Float32Array,
  edges: readonly GraphEdge[],
  positions: Positions
): number {
  let count = 0;
  for (const edge of edges) {
    const a = positions.get(edge.from);
    const b = positions.get(edge.to);
    if (!a || !b) continue;
    out.set(a, count * 6);
    out.set(b, count * 6 + 3);
    count += 1;
  }
  return count;
}

/** Camera z that makes the layered graph fill 85% of the slot width. */
export function fitCameraZ(aspect: number, fovDeg = 45): number {
  const halfFov = (fovDeg * Math.PI) / 360;
  return clamp(GRAPH_WIDTH / 2 / (Math.tan(halfFov) * aspect * FIT_FRACTION), 7, 14);
}

export const LABEL_MORPH = 0.7;
export const MAX_LABELS = 4;
export const HOVER_INTERVAL = 1 / 30;

/** Labels: the size-3 nodes once layered (> 0.7), plus the hovered node first. */
export function visibleLabels(
  nodes: readonly GraphNode[],
  morph: number,
  hovered: string | null
): string[] {
  const big =
    morph > LABEL_MORPH
      ? nodes.filter((n) => n.size === 3).map((n) => n.id)
      : [];
  if (!hovered) return big.slice(0, MAX_LABELS);
  return [hovered, ...big.filter((id) => id !== hovered)].slice(0, MAX_LABELS);
}

export const PUSH_RADIUS = 1.2;
export const PUSH_STRENGTH = 0.35;
export const PARALLAX = 0.5;

/** Push only while tangled: full until 0.2, fading to 0 by 0.3. */
export function pushWeight(morph: number): number {
  return 1 - smoothstep(0.2, 0.3, morph);
}

/** Offset pushing node away from the closest point on the pointer ray. */
export function pushOffset(
  out: Vec3,
  node: Readonly<Vec3>,
  closest: Readonly<Vec3>,
  weight: number
): Vec3 {
  const dx = node[0] - closest[0];
  const dy = node[1] - closest[1];
  const dz = node[2] - closest[2];
  const d = Math.hypot(dx, dy, dz);
  if (weight <= 0 || d === 0 || d >= PUSH_RADIUS) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return out;
  }
  const scale = ((PUSH_RADIUS - d) * PUSH_STRENGTH * weight) / d;
  out[0] = dx * scale;
  out[1] = dy * scale;
  out[2] = dz * scale;
  return out;
}
