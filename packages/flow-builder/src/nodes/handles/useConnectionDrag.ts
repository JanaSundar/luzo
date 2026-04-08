import type { RefObject } from "react";
import { useEffect } from "react";
import type {
  BlockRegistry,
  ConnectStartParams,
  Connection,
  FlowEdge,
  FlowNode,
  SuggestionDropParams,
} from "@luzo/flow-types";

import { useEditorStore } from "../../store/editorStore";
import { screenToCanvas } from "../../utils/geometry";
import { canCreateConnection, type ConnectionValidator } from "../../utils/connectionValidation";
import { wouldCreateCycle } from "../../utils/cycle";

interface UseConnectionDragOptions {
  blockRegistry: BlockRegistry;
  canConnect?: ConnectionValidator;
  canvasRef: RefObject<HTMLDivElement | null>;
  edges: FlowEdge[];
  nodes: FlowNode[];
  onConnect: (connection: Connection) => void;
  onConnectStart?: (params: ConnectStartParams) => void;
  onConnectEnd?: () => void;
  onSuggestionDrop?: (params: SuggestionDropParams) => void;
  readOnly?: boolean;
}

export function useConnectionDrag({
  canConnect,
  canvasRef,
  edges,
  nodes,
  onConnect,
  onConnectEnd,
  onConnectStart,
  onSuggestionDrop,
  readOnly,
}: UseConnectionDragOptions) {
  const activeConnection = useEditorStore((state) => state.activeConnection);
  const openSuggestionMenu = useEditorStore((state) => state.openSuggestionMenu);
  const setActiveConnection = useEditorStore((state) => state.setActiveConnection);
  const transform = useEditorStore((state) => state.transform);
  const viewport = useEditorStore((state) => state.viewport);
  const toCanvasPosition = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;

    return screenToCanvas(
      { x: clientX - rect.left, y: clientY - rect.top },
      { width: viewport.width, height: viewport.height, transform },
    );
  };

  useEffect(() => {
    if (!activeConnection || readOnly) return;

    const handlePointerMove = (event: PointerEvent) => {
      const cursor = toCanvasPosition(event.clientX, event.clientY);
      if (!cursor) return;
      setActiveConnection({ ...activeConnection, cursor });
    };

    const handlePointerUp = (event: PointerEvent) => {
      const targetElement = event.target;
      const target =
        targetElement instanceof HTMLElement
          ? targetElement.closest<HTMLElement>("[data-flow-handle='true']")
          : null;
      if (target) {
        const connection: Connection = {
          source: activeConnection.sourceNodeId,
          target: target.dataset.nodeId ?? "",
          ...(activeConnection.sourceHandleId
            ? { sourceHandle: activeConnection.sourceHandleId }
            : {}),
          ...(target.dataset.handleId ? { targetHandle: target.dataset.handleId } : {}),
        };

        if (
          connection.target &&
          connection.target !== connection.source &&
          !wouldCreateCycle(edges, connection.source, connection.target) &&
          canCreateConnection(connection, { edges, nodes }, canConnect)
        ) {
          onConnect(connection);
        }
      } else {
        const position = toCanvasPosition(event.clientX, event.clientY);
        if (position) {
          const params: SuggestionDropParams = {
            position,
            sourceNodeId: activeConnection.sourceNodeId,
            sourceHandleId: activeConnection.sourceHandleId,
          };

          openSuggestionMenu({ anchor: { x: event.clientX, y: event.clientY }, payload: params });
          onSuggestionDrop?.(params);
        }
      }

      setActiveConnection(null);
      onConnectEnd?.();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [
    activeConnection,
    canConnect,
    canvasRef,
    edges,
    nodes,
    onConnect,
    onConnectEnd,
    onSuggestionDrop,
    openSuggestionMenu,
    readOnly,
    setActiveConnection,
    toCanvasPosition,
    viewport.height,
    viewport.width,
  ]);

  const startConnection = (params: ConnectStartParams, cursor: { x: number; y: number }) => {
    setActiveConnection({
      sourceNodeId: params.nodeId,
      sourceHandleId: params.handleId,
      cursor,
    });
    onConnectStart?.(params);
  };

  return { startConnection };
}
