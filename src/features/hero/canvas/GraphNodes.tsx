import { useImperativeHandle, useRef, type Ref } from "react";
import { Object3D, type InstancedMesh } from "three";
import { damp } from "@/shared/lib/math";
import type { GraphNode } from "../graph/graph-data";
import { HOVER_SCALE, nodeScale, type FrameUpdatable } from "./graph-frame";
import type { GraphPalette } from "./useGraphColors";

export interface GraphNodesHandle extends FrameUpdatable {
  mesh(): InstancedMesh | null;
}

const HOVER_DAMPING = 8;

// One InstancedMesh for every node: one draw call.
export function GraphNodes({
  nodes,
  palette,
  ref
}: {
  nodes: readonly GraphNode[];
  palette: GraphPalette;
  ref?: Ref<GraphNodesHandle>;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const work = useRef({
    dummy: new Object3D(),
    scales: Float32Array.from(nodes, (n) => nodeScale(n.size)),
    colorsVersion: -1
  });

  useImperativeHandle(
    ref,
    () => ({
      mesh: () => meshRef.current,
      update(positions, frame) {
        const mesh = meshRef.current;
        if (!mesh) return;
        const { dummy, scales } = work.current;
        nodes.forEach((node, i) => {
          const p = positions.get(node.id);
          if (!p) return;
          const target = nodeScale(node.size) * (frame.hovered === node.id ? HOVER_SCALE : 1);
          const scale = damp(scales[i] ?? target, target, HOVER_DAMPING, frame.delta);
          scales[i] = scale;
          dummy.position.set(p[0], p[1], p[2]);
          dummy.scale.setScalar(scale);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;

        if (work.current.colorsVersion !== palette.version) {
          nodes.forEach((node, i) => mesh.setColorAt(i, palette[node.layer]));
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
          work.current.colorsVersion = palette.version;
        }
      }
    }),
    [nodes, palette]
  );

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, nodes.length]} frustumCulled={false}>
      <icosahedronGeometry args={[0.18, 1]} />
      <meshStandardMaterial roughness={0.45} metalness={0.1} />
    </instancedMesh>
  );
}
