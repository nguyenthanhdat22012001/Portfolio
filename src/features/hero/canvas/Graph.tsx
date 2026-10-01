import { useFrame, type RootState } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Matrix4, Ray, Vector3, type Group, type InstancedMesh } from "three";
import { damp, damp3, type Vec3 } from "@/shared/lib/math";
import { useScrollStore } from "@/shared/lib/stores/scroll-store";
import { selectGraph, type GraphNode } from "../graph/graph-data";
import { graphLayouts } from "../graph/layouts";
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
  pushOffset,
  pushWeight,
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
  return hit?.instanceId === undefined
    ? null
    : (nodes[hit.instanceId]?.id ?? null);
}

// Owns the per-frame position model (spec §7.1). Reads heroMorph with
// getState() — never subscribes — so scrolling causes no React renders.
export function Graph({ tier, slot }: { tier: RenderTier; slot: HTMLElement }) {
  const { nodeIds, interactive, labels } = tierFeatures(tier);
  const graph = useMemo(() => selectGraph(nodeIds), [nodeIds]);
  const layouts = useMemo(() => graphLayouts(graph.nodes), [graph]);
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
  const offsetsRef = useRef(new Map<string, Vec3>());
  const pushRef = useRef({
    ray: new Ray(),
    inverse: new Matrix4(),
    point: new Vector3(),
    closest: new Vector3(),
    closestTuple: [0, 0, 0] as Vec3,
    target: [0, 0, 0] as Vec3
  });

  useFrame((state, delta) => {
    // A frame after a background tab can be seconds long; don't jump.
    const dt = Math.min(delta, 0.1);
    const morph = useScrollStore.getState().heroMorph;
    const k = morphK(morph);
    const positions = positionsRef.current;
    const target = scratchRef.current;
    const push = pushRef.current;
    const group = groupRef.current;
    const weight =
      interactive && inside.current && group ? pushWeight(morph) : 0;
    if (weight > 0 && group) {
      // The pointer ray in the group's (rotating) local space.
      state.raycaster.setFromCamera(state.pointer, state.camera);
      push.inverse.copy(group.matrixWorld).invert();
      push.ray.copy(state.raycaster.ray).applyMatrix4(push.inverse);
    }

    for (const node of graph.nodes) {
      const chaos = layouts.chaos[node.id];
      const layered = layouts.layered[node.id];
      if (!chaos || !layered) continue;
      let current = positions.get(node.id);
      if (!current) {
        current = [chaos[0], chaos[1], chaos[2]];
        positions.set(node.id, current);
      }
      let offset = offsetsRef.current.get(node.id);
      if (!offset) {
        offset = [0, 0, 0];
        offsetsRef.current.set(node.id, offset);
      }
      if (weight > 0) {
        push.ray.closestPointToPoint(
          push.point.set(current[0], current[1], current[2]),
          push.closest
        );
        push.closestTuple[0] = push.closest.x;
        push.closestTuple[1] = push.closest.y;
        push.closestTuple[2] = push.closest.z;
        pushOffset(push.target, current, push.closestTuple, weight);
      } else {
        push.target[0] = 0;
        push.target[1] = 0;
        push.target[2] = 0;
      }
      damp3(offset, push.target, POSITION_DAMPING, dt);
      mixInto(target, chaos, layered, k, offset);
      damp3(current, target, POSITION_DAMPING, dt);
    }

    if (group) {
      spinRef.current += SPIN_SPEED * dt * (1 - k);
      group.rotation.y = damp(
        group.rotation.y,
        (1 - k) * spinRef.current,
        ROTATION_DAMPING,
        dt
      );
    }

    let hovered = hoveredRef.current;
    if (!interactive || !inside.current) {
      hovered = null;
    } else {
      hoverClockRef.current += dt;
      if (hoverClockRef.current >= HOVER_INTERVAL) {
        hoverClockRef.current = 0;
        hovered = pickNode(
          state,
          nodesRef.current?.mesh() ?? null,
          graph.nodes
        );
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

    const frame: GraphFrame = { morph, delta: dt, hovered };
    nodesRef.current?.update(positions, frame);
    edgesRef.current?.update(positions, frame);
    labelsRef.current?.update(positions, frame);
  });

  return (
    <group ref={groupRef}>
      <GraphNodes
        key={`nodes-${graph.nodes.length}`}
        ref={nodesRef}
        nodes={graph.nodes}
        palette={palette}
      />
      <GraphEdges
        key={`edges-${graph.nodes.length}`}
        ref={edgesRef}
        graph={graph}
        palette={palette}
      />
      {labels && (
        <GraphLabels ref={labelsRef} ids={labelIds} nodes={graph.nodes} />
      )}
    </group>
  );
}
