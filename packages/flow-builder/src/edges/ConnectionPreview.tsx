import type { BlockRegistry, FlowNode, Handle } from "@luzo/flow-types";

import { useEditorStore } from "../store/editorStore";
import { getNodeSize } from "../store/selectors";
import { getBezierPath } from "../utils/bezier";
import { getHandlePosition } from "../utils/handles";
import { EdgeMarkers } from "./EdgeMarkers";
import { getEdgeAppearance } from "./edgeAppearance";

interface ConnectionPreviewProps {
  activeConnection: {
    sourceNodeId: string;
    sourceHandleId: string;
    cursor: { x: number; y: number };
  };
  blockRegistry: BlockRegistry;
  nodes: FlowNode[];
}

export function ConnectionPreview({
  activeConnection,
  blockRegistry,
  nodes,
}: ConnectionPreviewProps) {
  const nodeSizes = useEditorStore((state) => state.nodeSizes);
  const sourceNode = nodes.find((node) => node.id === activeConnection.sourceNodeId);
  if (!sourceNode) return null;

  const sourceHandle = blockRegistry[sourceNode.type]?.handles.find(
    (handle: Handle) => handle.id === activeConnection.sourceHandleId,
  );
  if (!sourceHandle) return null;
  const sourceHandles = blockRegistry[sourceNode.type]?.handles ?? [sourceHandle];
  const sourceSize = getNodeSize(sourceNode, nodeSizes);
  const source = getHandlePosition(
    { ...sourceNode, width: sourceSize.width, height: sourceSize.height },
    sourceHandle,
    sourceHandles,
  );
  const appearance = getEdgeAppearance({
    preview: true,
    sourceHandleId: activeConnection.sourceHandleId,
  });
  const path = getBezierPath(source, activeConnection.cursor);

  return (
    <>
      <EdgeMarkers />
      <path
        d={path}
        data-testid="flow-builder-connection-preview-line"
        fill="none"
        markerEnd={appearance.markerEnd}
        stroke={appearance.stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={appearance.dasharray}
        strokeWidth={appearance.strokeWidth}
        pointerEvents="none"
      />
      <circle
        cx={activeConnection.cursor.x}
        cy={activeConnection.cursor.y}
        data-testid="flow-builder-connection-preview-target"
        fill="transparent"
        r="6"
        stroke={appearance.stroke}
        strokeWidth="2"
      />
    </>
  );
}
