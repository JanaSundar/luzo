import type {
  BlockRegistry,
  EdgeChange,
  FlowEdge,
  FlowNode,
  FlowTransform,
  Handle,
  NodeChange,
} from "@luzo/flow-types";

import { useEditorStore } from "../store/editorStore";
import { getDisplayPosition, getNodeSize } from "../store/selectors";
import { getHandlePosition } from "../utils/handles";
import { EdgeMarkers } from "./EdgeMarkers";
import { EdgePath } from "./EdgePath";

interface EdgeLayerProps {
  blockRegistry: BlockRegistry;
  edges: FlowEdge[];
  nodes: FlowNode[];
  onNodeSelect?: (nodeIds: string[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onEdgeSelect?: (edgeIds: string[]) => void;
  transform: FlowTransform;
}

export function EdgeLayer({
  blockRegistry,
  edges,
  nodes,
  onNodeSelect,
  onNodesChange,
  onEdgesChange,
  onEdgeSelect,
  transform,
}: EdgeLayerProps) {
  const draggingPositions = useEditorStore((state) => state.draggingPositions);
  const nodeSizes = useEditorStore((state) => state.nodeSizes);
  const openEdgeMenu = useEditorStore((state) => state.openEdgeMenu);
  const isConnecting = useEditorStore((state) => state.activeConnection !== null);

  const nodeMap = new Map(
    nodes.map((node) => {
      const size = getNodeSize(node, nodeSizes);
      return [
        node.id,
        {
          ...node,
          position: getDisplayPosition(node, draggingPositions),
          width: size.width,
          height: size.height,
        },
      ] as const;
    }),
  );

  return (
    <svg
      aria-hidden="true"
      data-testid="flow-builder-edge-layer"
      style={{
        display: "block",
        height: "100%",
        inset: 0,
        overflow: "visible",
        pointerEvents: "none",
        position: "absolute",
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        transformOrigin: "0 0",
        width: "100%",
        zIndex: 2,
      }}
    >
      <EdgeMarkers />
      {edges.map((edge) => {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);
        if (!sourceNode || !targetNode) return null;
        const sourceHandles = blockRegistry[sourceNode.type]?.handles ?? [];
        const targetHandles = blockRegistry[targetNode.type]?.handles ?? [];

        const sourceHandle =
          sourceHandles.find((handle: Handle) => handle.id === (edge.sourceHandle ?? "output")) ??
          sourceHandles[0];
        const targetHandle =
          targetHandles.find((handle: Handle) => handle.id === (edge.targetHandle ?? "input")) ??
          targetHandles[0];

        if (!sourceHandle || !targetHandle) return null;

        return (
          <EdgePath
            key={edge.id}
            edge={edge}
            source={getHandlePosition(sourceNode, sourceHandle, sourceHandles)}
            target={getHandlePosition(targetNode, targetHandle, targetHandles)}
            interactive={!isConnecting}
            onClick={() => {
              const nodeChanges = nodes
                .filter((node) => node.selected)
                .map(
                  (node) => ({ type: "select", id: node.id, selected: false }) satisfies NodeChange,
                );
              if (nodeChanges.length > 0) {
                onNodesChange(nodeChanges);
              }
              onEdgesChange(
                edges.map((item) => ({
                  type: "select",
                  id: item.id,
                  selected: item.id === edge.id,
                })),
              );
              onNodeSelect?.([]);
              onEdgeSelect?.([edge.id]);
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              openEdgeMenu({
                anchor: { x: event.clientX, y: event.clientY },
                payload: { edgeId: edge.id },
              });
            }}
          />
        );
      })}
    </svg>
  );
}
