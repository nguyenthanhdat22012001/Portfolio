import type { GraphEdge, Layer } from "./graph-data";
import { CROSS_EDGES, EDGES, NODES } from "./graph-data";
import {
  NODE_RADIUS,
  STATIC_VIEW as VIEW,
  chaosLayout,
  layeredLayout,
  nodeScale,
  project2D
} from "./layouts";

const LAYERS: readonly Layer[] = ["app", "feature", "shared"];
const NODE_CLASS: Record<Layer, string> = {
  app: "fill-accent",
  feature: "fill-silver",
  shared: "fill-earth"
};

// Server-rendered placeholder ("chaos", matches the canvas's first frame: same
// world scale, centre and node sizes, see STATIC_VIEW) and
// fallback ("layered"). Both are always rendered; globals.css shows one. No
// text inside: the DOM caption carries the meaning.
export function HeroGraphStatic({
  state,
  driftNodeId
}: {
  state: "chaos" | "layered";
  // 404 page only: this node drifts out of its layer (CSS, globals.css).
  driftNodeId?: string;
}) {
  const points = project2D(
    state === "chaos" ? chaosLayout(NODES) : layeredLayout(NODES),
    VIEW
  );
  const line = (edge: GraphEdge) => {
    const a = points[edge.from];
    const b = points[edge.to];
    if (!a || !b) return null;
    return (
      <line
        key={`${edge.from}-${edge.to}`}
        x1={a[0]}
        y1={a[1]}
        x2={b[0]}
        y2={b[1]}
      />
    );
  };

  return (
    <svg
      data-graph-state={state}
      className="hero-graph-svg"
      viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
    >
      <g className="stroke-silver" strokeOpacity={0.25}>
        {EDGES.map(line)}
      </g>
      {state === "chaos" && (
        <g className="stroke-earth" strokeDasharray="4 4">
          {CROSS_EDGES.map(line)}
        </g>
      )}
      {LAYERS.map((layer) => (
        <g key={layer} className={NODE_CLASS[layer]}>
          {NODES.filter((n) => n.layer === layer).map((node) => {
            const p = points[node.id];
            return p ? (
              <circle
                key={node.id}
                data-drift={node.id === driftNodeId ? "" : undefined}
                cx={p[0]}
                cy={p[1]}
                r={
                  Math.round(p[2] * NODE_RADIUS * nodeScale(node.size) * 10) /
                  10
                }
              />
            ) : null;
          })}
        </g>
      ))}
    </svg>
  );
}
