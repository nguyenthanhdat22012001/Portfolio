import { useFrame, type RootState } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group, InstancedMesh } from "three";
import { damp, damp3, type Vec3 } from "@/shared/lib/math";
import { useScrollStore } from "@/shared/lib/stores/scroll-store";
import { selectGraph, type GraphNode } from "../graph/graph-data";
import { chaosLayout, layeredLayout } from "../graph/layouts";
import { tierFeatures, type RenderTier } from "../quality/detect-tier";
import { GraphEdges } from "./GraphEdges";
import { GraphLabels } from "./GraphLabels";
import { GraphNodes, type GraphNodesHandle } from "./GraphNodes";
import {
  HOVER_INTERVAL,
  LABEL_MORPH,
  POSITION_DAMPING,
  ROTATION_DAMPING,
  SPIN_SPEED,
  mixInto,
  morphK,
  visibleLabels,
  type FrameUpdatable,
  type GraphFrame
} from "./graph-frame";
import { useGraphColors } from "./useGraphColors";
import { usePointerInside } from "./usePointerInside";

// The slot is an external DOM node; the cursor effect reads this attribute.
function setNodeCursor(slot: HTMLElement, on: boolean) {
  if (on) slot.dataset.cursor = "node";
  else delete slot.dataset.cursor;
}

function pickNode(
  state: RootState,
  mesh: InstancedMesh | null,
  nodes: readonly GraphNode[]
): string | null {
  if (!mesh) return null;
  state.raycaster.setFromCamera(state.pointer, state.camera);
  // Instances move every frame; the cached bounding sphere would be stale.
  mesh.computeBoundingSphere();
  const hit = state.raycaster.intersectObject(mesh, false)[0];
  return hit?.instanceId === undefined ? null : (nodes[hit.instanceId]?.id ?? null);
}

// Owns the per-frame position model (spec §7.1). Reads heroMorph with
// getState() — never subscribes — so scrolling causes no React renders.
export function Graph({ tier, slot }: { tier: RenderTier; slot: HTMLElement }) {
  const { nodeIds, interactive, labels } = tierFeatures(tier);
  const graph = useMemo(() => selectGraph(nodeIds), [nodeIds]);
  const layouts = useMemo(
    () => ({ chaos: chaosLayout(graph.nodes), layered: layeredLayout(graph.nodes) }),
    [graph]
  );
  const palette = useGraphColors();
  const inside = usePointerInside(slot, interactive);
  const labelsRef = useRef<FrameUpdatable>(null);
  const hoveredRef = useRef<string | null>(null);
  const hoverClockRef = useRef(0);
  const labelModeRef = useRef<boolean | null>(null);
  const [labelIds, setLabelIds] = useState<readonly string[]>([]);

  useEffect(
    () => () => {
      setNodeCursor(slot, false);
    },
    [slot]
  );

  const groupRef = useRef<Group>(null);
  const nodesRef = useRef<GraphNodesHandle>(null);
  const edgesRef = useRef<FrameUpdatable>(null);
  // Keyed by id and kept across tier changes, so a smaller node set
  // continues from where its nodes already are.
  const positionsRef = useRef(new Map<string, Vec3>());
  const scratchRef = useRef<Vec3>([0, 0, 0]);
  const spinRef = useRef(0);

  useFrame((state, delta) => {
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

    let hovered = hoveredRef.current;
    if (!interactive || !inside.current) {
      hovered = null;
    } else {
      hoverClockRef.current += delta;
      if (hoverClockRef.current >= HOVER_INTERVAL) {
        hoverClockRef.current = 0;
        hovered = pickNode(state, nodesRef.current?.mesh() ?? null, graph.nodes);
      }
    }
    const hoverChanged = hovered !== hoveredRef.current;
    if (hoverChanged) {
      hoveredRef.current = hovered;
      setNodeCursor(slot, hovered !== null);
    }

    const labelMode = morph > LABEL_MORPH;
    if (labels && (hoverChanged || labelMode !== labelModeRef.current)) {
      labelModeRef.current = labelMode;
      setLabelIds(visibleLabels(graph.nodes, morph, hovered));
    }

    const frame: GraphFrame = { morph, delta, hovered };
    nodesRef.current?.update(positions, frame);
    edgesRef.current?.update(positions, frame);
    labelsRef.current?.update(positions, frame);
  });

  return (
    <group ref={groupRef}>
      <GraphNodes key={graph.nodes.length} ref={nodesRef} nodes={graph.nodes} palette={palette} />
      <GraphEdges key={graph.nodes.length} ref={edgesRef} graph={graph} palette={palette} />
      {labels && <GraphLabels ref={labelsRef} ids={labelIds} nodes={graph.nodes} />}
    </group>
  );
}
