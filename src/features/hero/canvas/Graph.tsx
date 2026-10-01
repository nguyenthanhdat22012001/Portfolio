import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { damp, damp3, type Vec3 } from "@/shared/lib/math";
import { useScrollStore } from "@/shared/lib/stores/scroll-store";
import { selectGraph } from "../graph/graph-data";
import { chaosLayout, layeredLayout } from "../graph/layouts";
import { tierFeatures, type RenderTier } from "../quality/detect-tier";
import { GraphEdges } from "./GraphEdges";
import { GraphNodes, type GraphNodesHandle } from "./GraphNodes";
import {
  POSITION_DAMPING,
  ROTATION_DAMPING,
  SPIN_SPEED,
  mixInto,
  morphK,
  type FrameUpdatable,
  type GraphFrame
} from "./graph-frame";
import { useGraphColors } from "./useGraphColors";

// Owns the per-frame position model (spec §7.1). Reads heroMorph with
// getState() — never subscribes — so scrolling causes no React renders.
export function Graph({ tier }: { tier: RenderTier }) {
  const { nodeIds } = tierFeatures(tier);
  const graph = useMemo(() => selectGraph(nodeIds), [nodeIds]);
  const layouts = useMemo(
    () => ({ chaos: chaosLayout(graph.nodes), layered: layeredLayout(graph.nodes) }),
    [graph]
  );
  const palette = useGraphColors();

  const groupRef = useRef<Group>(null);
  const nodesRef = useRef<GraphNodesHandle>(null);
  const edgesRef = useRef<FrameUpdatable>(null);
  // Keyed by id and kept across tier changes, so a smaller node set
  // continues from where its nodes already are.
  const positionsRef = useRef(new Map<string, Vec3>());
  const scratchRef = useRef<Vec3>([0, 0, 0]);
  const spinRef = useRef(0);

  useFrame((_, delta) => {
    const morph = useScrollStore.getState().heroMorph;
    const k = morphK(morph);
    const positions = positionsRef.current;
    const target = scratchRef.current;

    for (const node of graph.nodes) {
      const chaos = layouts.chaos[node.id];
      const layered = layouts.layered[node.id];
      if (!chaos || !layered) continue;
      let current = positions.get(node.id);
      if (!current) {
        current = [chaos[0], chaos[1], chaos[2]];
        positions.set(node.id, current);
      }
      mixInto(target, chaos, layered, k);
      damp3(current, target, POSITION_DAMPING, delta);
    }

    const group = groupRef.current;
    if (group) {
      spinRef.current += SPIN_SPEED * delta * (1 - k);
      group.rotation.y = damp(group.rotation.y, (1 - k) * spinRef.current, ROTATION_DAMPING, delta);
    }

    const frame: GraphFrame = { morph, delta, hovered: null };
    nodesRef.current?.update(positions, frame);
    edgesRef.current?.update(positions, frame);
  });

  return (
    <group ref={groupRef}>
      <GraphNodes key={graph.nodes.length} ref={nodesRef} nodes={graph.nodes} palette={palette} />
      <GraphEdges key={graph.nodes.length} ref={edgesRef} graph={graph} palette={palette} />
    </group>
  );
}
