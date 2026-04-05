import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { useEffect, useMemo, useRef } from "react";
import type { BlockRegistry, FlowNode, Handle as FlowHandle, NodeChange } from "@luzo/flow-types";

import { useEditorStore } from "../store/editorStore";
import { getDisplayPosition } from "../store/selectors";
import { screenToCanvas } from "../utils/geometry";
import { resolveNodeCollisions } from "../utils/nodeCollisions";
import { getNodeMinWidth } from "./cardUtils";
import { Handle } from "./handles/Handle";
import { NodeRenderer } from "./NodeRenderer";

interface NodeWrapperProps {
  blockRegistry: BlockRegistry;
  canvasRef: RefObject<HTMLDivElement | null>;
  node: FlowNode;
  nodes: FlowNode[];
  onNodesChange: (changes: NodeChange[]) => void;
  onNodeSelect?: (nodeIds: string[]) => void;
  onStartConnection: (
    params: { nodeId: string; handleId: string },
    cursor: { x: number; y: number },
  ) => void;
  readOnly?: boolean;
}

export function NodeWrapper({
  blockRegistry,
  canvasRef,
  node,
  nodes,
  onNodesChange,
  onNodeSelect,
  onStartConnection,
  readOnly,
}: NodeWrapperProps) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const draggingPositions = useEditorStore((state) => state.draggingPositions);
  const nodeSizes = useEditorStore((state) => state.nodeSizes);
  const openNodeMenu = useEditorStore((state) => state.openNodeMenu);
  const setDraggingPosition = useEditorStore((state) => state.setDraggingPosition);
  const setNodeSize = useEditorStore((state) => state.setNodeSize);
  const transform = useEditorStore((state) => state.transform);
  const viewport = useEditorStore((state) => state.viewport);
  const position = getDisplayPosition(node, draggingPositions);
  const definition = blockRegistry[node.type];
  const size = nodeSizes[node.id] ?? {
    width: node.width ?? getNodeMinWidth(node, definition?.minWidth),
    height: node.height ?? 180,
  };
  const isSelected = Boolean(node.selected);
  const handles = useMemo(() => getHandleLayout(definition?.handles ?? []), [definition?.handles]);

  useEffect(() => {
    const element = nodeRef.current;
    if (!element) return;

    const observer = new ResizeObserver(() => {
      setNodeSize(node.id, { width: element.offsetWidth, height: element.offsetHeight });
    });

    observer.observe(element);
    setNodeSize(node.id, { width: element.offsetWidth, height: element.offsetHeight });
    return () => observer.disconnect();
  }, [node.id, setNodeSize]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (readOnly || event.button !== 0) return;
    if (
      (event.target as HTMLElement).closest(
        "input, textarea, select, button, [data-flow-editable='true']",
      )
    ) {
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const start = screenToCanvas(
      { x: event.clientX - rect.left, y: event.clientY - rect.top },
      { width: viewport.width, height: viewport.height, transform },
    );
    const offsetX = start.x - position.x;
    const offsetY = start.y - position.y;
    let latestPosition = position;
    let hasDragged = false;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const next = screenToCanvas(
        { x: moveEvent.clientX - rect.left, y: moveEvent.clientY - rect.top },
        { width: viewport.width, height: viewport.height, transform },
      );

      latestPosition = { x: next.x - offsetX, y: next.y - offsetY };
      if (
        !hasDragged &&
        (Math.abs(moveEvent.clientX - event.clientX) > 3 ||
          Math.abs(moveEvent.clientY - event.clientY) > 3)
      ) {
        hasDragged = true;
      }
      setDraggingPosition(node.id, latestPosition);
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      setDraggingPosition(node.id, null);

      if (!hasDragged) {
        onNodesChange(
          nodes.map((item) => ({ type: "select", id: item.id, selected: item.id === node.id })),
        );
        onNodeSelect?.([node.id]);
        return;
      }

      const collisionChanges = resolveNodeCollisions(
        nodes.map((item) =>
          item.id === node.id ? ({ ...item, position: latestPosition } as FlowNode) : item,
        ),
        {
          activeNodeId: node.id,
          margin: 16,
          maxIterations: 40,
          nodeSizes,
        },
      );

      onNodesChange([
        { type: "position", id: node.id, position: latestPosition, dragging: false },
        ...collisionChanges
          .filter((change) => change.id !== node.id)
          .map(
            (change) =>
              ({
                type: "position",
                id: change.id,
                position: change.position,
              }) satisfies NodeChange,
          ),
        ...nodes
          .filter((item) => item.selected)
          .map((item) => ({ type: "select", id: item.id, selected: false }) as NodeChange),
      ]);
      onNodeSelect?.([]);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div
      ref={nodeRef}
      aria-label={`${node.type} node`}
      onContextMenu={(event) => {
        event.preventDefault();
        openNodeMenu({
          anchor: { x: event.clientX, y: event.clientY },
          payload: { nodeId: node.id },
        });
      }}
      onPointerDown={handlePointerDown}
      style={{
        ...getNodeShellStyle(node, isSelected),
        left: position.x,
        minWidth: getNodeMinWidth(node, definition?.minWidth),
        position: "absolute",
        top: position.y,
        width: size.width,
      }}
      tabIndex={0}
    >
      {handles.map(({ handle, index, total }) => (
        <Handle
          key={`${node.id}:${handle.id}:${handle.type}`}
          handle={handle}
          index={index}
          nodeId={node.id}
          onPointerDown={(event, currentHandle) => {
            event.stopPropagation();
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;
            const cursor = screenToCanvas(
              { x: event.clientX - rect.left, y: event.clientY - rect.top },
              { width: viewport.width, height: viewport.height, transform },
            );
            onStartConnection({ nodeId: node.id, handleId: currentHandle.id }, cursor);
          }}
          total={total}
        />
      ))}
      <NodeRenderer
        blockRegistry={blockRegistry}
        node={node}
        readOnly={Boolean(readOnly)}
        selected={isSelected}
        onUpdate={(nodeId, patch) => {
          onNodesChange([
            {
              type: "replace",
              id: nodeId,
              item: {
                ...node,
                data: { ...(node.data as Record<string, unknown>), ...patch },
              } as FlowNode,
            },
          ]);
        }}
      />
    </div>
  );
}

function getHandleLayout(handles: FlowHandle[]) {
  return handles.map((handle) => {
    const siblings = handles.filter((entry) => entry.position === handle.position);
    return {
      handle,
      index: siblings.findIndex((entry) => entry.id === handle.id && entry.type === handle.type),
      total: siblings.length,
    };
  });
}

function getNodeShellStyle(node: FlowNode, isSelected: boolean) {
  const borderColor = isSelected
    ? "var(--fb-node-border-selected, #2563eb)"
    : node.type === "group"
      ? "var(--fb-node-group-border, rgba(148, 163, 184, 0.42))"
      : "var(--fb-node-border, rgba(148, 163, 184, 0.22))";

  return {
    background:
      node.type === "group"
        ? "var(--fb-node-group-bg, rgba(148, 163, 184, 0.08))"
        : "var(--fb-node-bg, #fff)",
    border: `1px ${node.type === "group" ? "dashed" : "solid"} ${borderColor}`,
    borderRadius: "var(--fb-node-border-radius, 18px)",
    boxShadow:
      node.type === "group"
        ? "var(--fb-node-group-shadow, 0 8px 20px rgba(15, 23, 42, 0.06))"
        : "var(--fb-node-shadow, 0 12px 32px rgba(15, 23, 42, 0.08))",
    color: "var(--fb-text-primary, #111827)",
    overflow: "visible",
    padding: node.type === "start" ? 14 : 16,
    userSelect: "none",
  } as const;
}
