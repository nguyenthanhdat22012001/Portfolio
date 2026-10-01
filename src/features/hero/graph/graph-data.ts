// Illustrative package graph (Oneloyalty-style public feature names); not the
// exact internal package list. Change only this file to rename nodes.
export type Layer = "app" | "feature" | "shared";
export type GraphNode = {
  id: string;
  label: string;
  layer: Layer;
  size: 1 | 2 | 3;
};
export type GraphEdge = { from: string; to: string };

export const NODES: readonly GraphNode[] = [
  { id: "admin", label: "apps/admin", layer: "app", size: 3 },
  { id: "extensions", label: "apps/extensions", layer: "app", size: 3 },
  { id: "rewards", label: "features/rewards", layer: "feature", size: 2 },
  { id: "vip-tier", label: "features/vip-tier", layer: "feature", size: 2 },
  { id: "campaign", label: "features/campaign", layer: "feature", size: 2 },
  { id: "gamification", label: "features/gamification", layer: "feature", size: 2 },
  { id: "settings", label: "features/settings", layer: "feature", size: 2 },
  { id: "redeem", label: "features/redeem", layer: "feature", size: 2 },
  { id: "ui", label: "packages/ui", layer: "shared", size: 3 },
  { id: "i18n", label: "packages/i18n", layer: "shared", size: 3 },
  { id: "types", label: "shared/types", layer: "shared", size: 1 },
  { id: "api", label: "shared/api", layer: "shared", size: 1 },
  { id: "hooks", label: "shared/hooks", layer: "shared", size: 1 }
];

/** Allowed dependencies: always point DOWN (app → feature → shared, or app → shared). */
export const EDGES: readonly GraphEdge[] = [
  { from: "admin", to: "rewards" },
  { from: "admin", to: "vip-tier" },
  { from: "admin", to: "campaign" },
  { from: "admin", to: "gamification" },
  { from: "admin", to: "settings" },
  { from: "extensions", to: "rewards" },
  { from: "extensions", to: "redeem" },
  { from: "extensions", to: "gamification" },
  { from: "admin", to: "ui" },
  { from: "admin", to: "i18n" },
  { from: "extensions", to: "ui" },
  { from: "extensions", to: "i18n" },
  { from: "rewards", to: "types" },
  { from: "rewards", to: "api" },
  { from: "vip-tier", to: "types" },
  { from: "campaign", to: "types" },
  { from: "campaign", to: "ui" },
  { from: "gamification", to: "ui" },
  { from: "settings", to: "i18n" },
  { from: "settings", to: "ui" },
  { from: "redeem", to: "api" },
  { from: "redeem", to: "hooks" }
];

/** Feature ↔ feature imports — the "before" problem. Visible only in the chaos state. */
export const CROSS_EDGES: readonly GraphEdge[] = [
  { from: "campaign", to: "rewards" },
  { from: "vip-tier", to: "rewards" },
  { from: "rewards", to: "campaign" },
  { from: "gamification", to: "settings" }
];

/** Low tier keeps only these node ids (10). Edges touching removed nodes are dropped. */
export const LOW_TIER_NODE_IDS: readonly string[] = [
  "admin",
  "extensions",
  "rewards",
  "campaign",
  "gamification",
  "settings",
  "ui",
  "i18n",
  "types",
  "api"
];

export interface GraphSet {
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  crossEdges: readonly GraphEdge[];
}

const FULL: GraphSet = { nodes: NODES, edges: EDGES, crossEdges: CROSS_EDGES };

export function selectGraph(ids?: readonly string[]): GraphSet {
  if (!ids) return FULL;
  const keep = new Set(ids);
  const inside = (e: GraphEdge) => keep.has(e.from) && keep.has(e.to);
  return {
    nodes: NODES.filter((n) => keep.has(n.id)),
    edges: EDGES.filter(inside),
    crossEdges: CROSS_EDGES.filter(inside)
  };
}
