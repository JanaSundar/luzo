import type { ReactNode } from "react";
import type {
  BlockRegistry,
  ConnectionPreviewState,
  FlowEdge,
  FlowNode,
  FlowRect,
  FlowTransform,
  SuggestionSource,
} from "@luzo/flow-types";

import { ConnectionPreview } from "../edges/ConnectionPreview";
import { DockedInspector } from "../inspector/DockedInspector";
import { EdgeContextMenu } from "../menus/EdgeContextMenu";
import { NodeContextMenu } from "../menus/NodeContextMenu";
import { SuggestionMenu } from "../menus/SuggestionMenu";
import { useEditorStore } from "../store/editorStore";

interface CanvasOverlaysProps {
  activeConnection: ConnectionPreviewState | null;
  blockRegistry: BlockRegistry;
  clearSelection: () => void;
  edgeMenu: { anchor: { x: number; y: number }; payload: { edgeId: string } } | null;
  edges: FlowEdge[];
  inspectorEmptyState?: ReactNode;
  inspectorTitleResolver?: (node: FlowNode) => string;
  inspectorWidth?: number | string;
  nodeMenu: { anchor: { x: number; y: number }; payload: { nodeId: string } } | null;
  nodes: FlowNode[];
  onDeleteEdge: (edgeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
  onInspectorUpdate: (nodeId: string, patch: Record<string, unknown>) => void;
  openEdgeMenu: (menu: null) => void;
  openNodeMenu: (menu: null) => void;
  openSuggestionMenu: (menu: null) => void;
  readOnly?: boolean;
  renderEdgeContextMenu?: (edge: FlowEdge, close: () => void) => ReactNode;
  renderNodeContextMenu?: (node: FlowNode, close: () => void) => ReactNode;
  renderSuggestionMenu?: (
    params: { position: { x: number; y: number }; sourceNodeId: string; sourceHandleId: string },
    close: () => void,
  ) => ReactNode;
  selectedNode: FlowNode | null;
  selectionRect: FlowRect | null;
  suggestionMenu: {
    anchor: { x: number; y: number };
    anchorEdge?: "top" | "bottom";
    payload: { position: { x: number; y: number }; sourceNodeId: string; sourceHandleId: string };
  } | null;
  suggestionSources?: SuggestionSource[];
  transform: FlowTransform;
}

export function CanvasOverlays({
  activeConnection,
  blockRegistry,
  clearSelection,
  edgeMenu,
  edges,
  inspectorEmptyState,
  inspectorTitleResolver,
  inspectorWidth,
  nodeMenu,
  nodes,
  onDeleteEdge,
  onDeleteNode,
  onDuplicateNode,
  onInspectorUpdate,
  openEdgeMenu,
  openNodeMenu,
  openSuggestionMenu,
  readOnly,
  renderEdgeContextMenu,
  renderNodeContextMenu,
  renderSuggestionMenu,
  selectedNode,
  selectionRect,
  suggestionMenu,
  suggestionSources,
  transform,
}: CanvasOverlaysProps) {
  const isDraggingNode = useEditorStore((state) => Object.keys(state.draggingPositions).length > 0);
  const connectionPreview = activeConnection
    ? activeConnection
    : suggestionMenu
      ? {
          cursor: suggestionMenu.payload.position,
          sourceHandleId: suggestionMenu.payload.sourceHandleId,
          sourceNodeId: suggestionMenu.payload.sourceNodeId,
        }
      : null;
  const selectedMenuNode = nodeMenu
    ? (nodes.find((node) => node.id === nodeMenu.payload.nodeId) ?? null)
    : null;
  const selectedMenuEdge = edgeMenu
    ? (edges.find((edge) => edge.id === edgeMenu.payload.edgeId) ?? null)
    : null;

  return (
    <>
      {connectionPreview ? (
        <svg
          data-testid="flow-builder-connection-preview"
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
            zIndex: 3,
          }}
        >
          <ConnectionPreview
            activeConnection={connectionPreview}
            blockRegistry={blockRegistry}
            nodes={nodes}
          />
        </svg>
      ) : null}
      {selectionRect ? <SelectionOverlay rect={selectionRect} transform={transform} /> : null}
      {suggestionMenu ? (
        <SuggestionMenu
          anchor={suggestionMenu.anchor}
          blockRegistry={blockRegistry}
          close={() => openSuggestionMenu(null)}
          params={suggestionMenu.payload}
          {...(suggestionMenu.anchorEdge ? { anchorEdge: suggestionMenu.anchorEdge } : {})}
          {...(renderSuggestionMenu ? { renderSuggestionMenu } : {})}
          {...(suggestionSources ? { suggestionSources } : {})}
        />
      ) : null}
      {selectedNode && !connectionPreview && !isDraggingNode ? (
        <DockedInspector
          blockRegistry={blockRegistry}
          node={selectedNode}
          onClose={clearSelection}
          onUpdate={onInspectorUpdate}
          selected
          {...(inspectorEmptyState !== undefined ? { emptyState: inspectorEmptyState } : {})}
          {...(readOnly !== undefined ? { readOnly } : {})}
          {...(inspectorTitleResolver ? { titleResolver: inspectorTitleResolver } : {})}
          {...(inspectorWidth !== undefined ? { width: inspectorWidth } : {})}
        />
      ) : null}
      {nodeMenu && selectedMenuNode ? (
        <NodeContextMenu
          anchor={nodeMenu.anchor}
          close={() => openNodeMenu(null)}
          node={selectedMenuNode}
          onDelete={() => onDeleteNode(nodeMenu.payload.nodeId)}
          {...(onDuplicateNode
            ? { onDuplicate: () => onDuplicateNode(nodeMenu.payload.nodeId) }
            : {})}
          {...(renderNodeContextMenu ? { renderNodeContextMenu } : {})}
        />
      ) : null}
      {edgeMenu && selectedMenuEdge ? (
        <EdgeContextMenu
          anchor={edgeMenu.anchor}
          close={() => openEdgeMenu(null)}
          edge={selectedMenuEdge}
          onCopyId={() => {
            void navigator.clipboard?.writeText(edgeMenu.payload.edgeId).catch(() => undefined);
          }}
          onDelete={() => onDeleteEdge(edgeMenu.payload.edgeId)}
          {...(renderEdgeContextMenu ? { renderEdgeContextMenu } : {})}
        />
      ) : null}
    </>
  );
}

function SelectionOverlay({ rect, transform }: { rect: FlowRect; transform: FlowTransform }) {
  return (
    <div
      aria-hidden="true"
      style={{
        background: "rgba(37, 99, 235, 0.08)",
        border: "1px dashed rgba(37, 99, 235, 0.5)",
        height: rect.height * transform.scale,
        left: rect.x * transform.scale + transform.x,
        position: "absolute",
        top: rect.y * transform.scale + transform.y,
        width: rect.width * transform.scale,
      }}
    />
  );
}
