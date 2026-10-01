import { clamp, easeInOutCubic, smoothstep, type Vec3 } from "@/shared/lib/math";
import type { GraphEdge, GraphNode } from "../graph/graph-data";
import { LAYER_SPACING } from "../graph/layouts";

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
const NODE_RADIUS = 0.27;
export const GRAPH_WIDTH = 6 * LAYER_SPACING + NODE_RADIUS;

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

export function nodeScale(size: GraphNode["size"]): number {
  return 0.75 + size * 0.25;
}

/** Camera z that makes the layered graph fill 85% of the slot width. */
export function fitCameraZ(aspect: number, fovDeg = 45): number {
  const halfFov = (fovDeg * Math.PI) / 360;
  return clamp(GRAPH_WIDTH / 2 / (Math.tan(halfFov) * aspect * 0.85), 7, 14);
}
