import {
  useImperativeHandle,
  useMemo,
  useRef,
  type ReactNode,
  type Ref
} from "react";
import {
  DynamicDrawUsage,
  type LineBasicMaterial,
  type LineDashedMaterial,
  type LineSegments
} from "three";
import type { GraphEdge, GraphSet } from "../graph/graph-data";
import {
  crossEdgeOpacity,
  writeEdges,
  type FrameUpdatable
} from "./graph-frame";
import type { GraphPalette } from "./useGraphColors";

function markDirty(line: LineSegments) {
  const attribute = line.geometry.getAttribute("position");
  attribute.needsUpdate = true;
}

function Lines({
  buffer,
  lineRef,
  children,
  visible = true
}: {
  buffer: Float32Array;
  lineRef: Ref<LineSegments>;
  children: ReactNode;
  visible?: boolean;
}) {
  return (
    <lineSegments ref={lineRef} frustumCulled={false} visible={visible}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[buffer, 3]}
          usage={DynamicDrawUsage}
        />
      </bufferGeometry>
      {children}
    </lineSegments>
  );
}

// Three LineSegments (≤ 3 draw calls): structural, cross (fades out with the
// morph) and highlight (edges touching the hovered node).
export function GraphEdges({
  graph,
  palette,
  ref
}: {
  graph: GraphSet;
  palette: GraphPalette;
  ref?: Ref<FrameUpdatable>;
}) {
  const buffers = useMemo(
    () => ({
      structural: new Float32Array(graph.edges.length * 6),
      cross: new Float32Array(Math.max(1, graph.crossEdges.length) * 6),
      highlight: new Float32Array(Math.max(1, graph.edges.length) * 6)
    }),
    [graph]
  );
  const structuralRef = useRef<LineSegments>(null);
  const crossRef = useRef<LineSegments>(null);
  const highlightRef = useRef<LineSegments>(null);
  const last = useRef<{
    hovered: string | null;
    touching: readonly GraphEdge[];
    colorsVersion: number;
  }>({
    hovered: null,
    touching: [],
    colorsVersion: -1
  });

  useImperativeHandle(
    ref,
    () => ({
      update(positions, frame) {
        const structural = structuralRef.current;
        const cross = crossRef.current;
        const highlight = highlightRef.current;
        if (!structural || !cross || !highlight) return;

        writeEdges(buffers.structural, graph.edges, positions);
        markDirty(structural);

        const opacity = crossEdgeOpacity(frame.morph);
        cross.visible = opacity > 0 && graph.crossEdges.length > 0;
        if (cross.visible) {
          writeEdges(buffers.cross, graph.crossEdges, positions);
          markDirty(cross);
          cross.computeLineDistances();
          (cross.material as LineDashedMaterial).opacity = opacity;
        }

        if (frame.hovered !== last.current.hovered) {
          last.current.hovered = frame.hovered;
          last.current.touching = frame.hovered
            ? graph.edges.filter(
                (e) => e.from === frame.hovered || e.to === frame.hovered
              )
            : [];
        }
        highlight.visible = last.current.touching.length > 0;
        if (highlight.visible) {
          const count = writeEdges(
            buffers.highlight,
            last.current.touching,
            positions
          );
          highlight.geometry.setDrawRange(0, count * 2);
          markDirty(highlight);
        }

        if (last.current.colorsVersion !== palette.version) {
          (structural.material as LineBasicMaterial).color.copy(
            palette.feature
          );
          (cross.material as LineDashedMaterial).color.copy(palette.shared);
          (highlight.material as LineBasicMaterial).color.copy(palette.app);
          last.current.colorsVersion = palette.version;
        }
      }
    }),
    [buffers, graph, palette]
  );

  return (
    <>
      <Lines buffer={buffers.structural} lineRef={structuralRef}>
        <lineBasicMaterial transparent opacity={0.25} />
      </Lines>
      <Lines buffer={buffers.cross} lineRef={crossRef}>
        <lineDashedMaterial
          transparent
          dashSize={0.08}
          gapSize={0.06}
          opacity={0.6}
        />
      </Lines>
      <Lines buffer={buffers.highlight} lineRef={highlightRef} visible={false}>
        <lineBasicMaterial transparent opacity={0.8} />
      </Lines>
    </>
  );
}
