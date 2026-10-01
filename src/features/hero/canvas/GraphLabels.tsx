import { Html } from "@react-three/drei/web/Html";
import { useImperativeHandle, useRef, type Ref } from "react";
import type { Group } from "three";
import type { GraphNode } from "../graph/graph-data";
import type { FrameUpdatable } from "./graph-frame";

// DOM labels (not canvas text) that follow their nodes through refs.
export function GraphLabels({
  ids,
  nodes,
  ref
}: {
  ids: readonly string[];
  nodes: readonly GraphNode[];
  ref?: Ref<FrameUpdatable>;
}) {
  const groups = useRef(new Map<string, Group>());

  useImperativeHandle(
    ref,
    () => ({
      update(positions) {
        for (const [id, group] of groups.current) {
          const p = positions.get(id);
          if (p) group.position.set(p[0], p[1], p[2]);
        }
      }
    }),
    []
  );

  return ids.map((id) => {
    const node = nodes.find((n) => n.id === id);
    if (!node) return null;
    return (
      <group
        key={id}
        ref={(group) => {
          if (group) groups.current.set(id, group);
          return () => {
            groups.current.delete(id);
          };
        }}
      >
        <Html center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
          <span className="hero-graph-label">{node.label}</span>
        </Html>
      </group>
    );
  });
}
