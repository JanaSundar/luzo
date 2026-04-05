import type { MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FlowRect } from "@luzo/flow-types";

import { NodeWrapper } from "../nodes/NodeWrapper";
import { useConnectionDrag } from "../nodes/handles/useConnectionDrag";
import type { FlowBuilderProps } from "../props";
import { useEditorStore } from "../store/editorStore";
import { screenToCanvas } from "../utils/geometry";
import { getNodesInSelection } from "../utils/selection";
import { EdgeLayer } from "../edges/EdgeLayer";
import { useFocusGuard } from "../hooks/useFocusGuard";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { CanvasOverlays } from "./CanvasOverlays";
import { CanvasBottomBar } from "./CanvasBottomBar";
import { DotGrid } from "./DotGrid";
import { useBottomBarAddBlock } from "./useBottomBarAddBlock";
import { useCanvasControls } from "./useCanvasControls";
import { useCanvasSelection } from "./useCanvasSelection";
import { useFitViewOnMount } from "./useFitViewOnMount";
import { usePanZoom } from "./usePanZoom";

export function Canvas(props: FlowBuilderProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const transform = useEditorStore((state) => state.transform);
  const viewport = useEditorStore((state) => state.viewport);
  const nodeMenu = useEditorStore((state) => state.nodeMenu);
  const edgeMenu = useEditorStore((state) => state.edgeMenu);
  const suggestionMenu = useEditorStore((state) => state.suggestionMenu);
  const activeConnection = useEditorStore((state) => state.activeConnection);
  const selectionRect = useEditorStore((state) => state.selectionRect);
  const setSelectionRect = useEditorStore((state) => state.setSelectionRect);
  const setTransform = useEditorStore((state) => state.setTransform);
  const setViewport = useEditorStore((state) => state.setViewport);
  const openNodeMenu = useEditorStore((state) => state.openNodeMenu);
  const openEdgeMenu = useEditorStore((state) => state.openEdgeMenu);
  const openSuggestionMenu = useEditorStore((state) => state.openSuggestionMenu);
  const { isEditingInNode } = useFocusGuard(canvasRef);
  const { clearSelection, selectedNode } = useCanvasSelection({
    edges: props.edges,
    nodes: props.nodes,
    onEdgesChange: props.onEdgesChange,
    onNodesChange: props.onNodesChange,
    ...(props.onEdgeSelect ? { onEdgeSelect: props.onEdgeSelect } : {}),
    ...(props.onNodeSelect ? { onNodeSelect: props.onNodeSelect } : {}),
    ...(props.onPaneClick ? { onPaneClick: props.onPaneClick } : {}),
  });
  const { fitView, zoomIn, zoomOut } = useCanvasControls(
    props.nodes,
    viewport,
    transform,
    setTransform,
  );
  const panZoom = usePanZoom({ canvasRef, transform, setTransform });
  const openAddBlockMenu = useBottomBarAddBlock({
    blockRegistry: props.blockRegistry,
    canvasRect: () => canvasRef.current?.getBoundingClientRect() ?? null,
    nodes: props.nodes,
    openSuggestionMenu,
    transform,
    viewport,
    ...(props.readOnly !== undefined ? { readOnly: props.readOnly } : {}),
  });
  const { startConnection } = useConnectionDrag({
    blockRegistry: props.blockRegistry,
    canvasRef,
    edges: props.edges,
    nodes: props.nodes,
    onConnect: props.onConnect,
    ...(props.onConnectEnd ? { onConnectEnd: props.onConnectEnd } : {}),
    ...(props.onConnectStart ? { onConnectStart: props.onConnectStart } : {}),
    ...(props.onSuggestionDrop ? { onSuggestionDrop: props.onSuggestionDrop } : {}),
    ...(props.readOnly !== undefined ? { readOnly: props.readOnly } : {}),
  });

  useKeyboardShortcuts({
    canvasRef,
    closeMenus: () => {
      openNodeMenu(null);
      openEdgeMenu(null);
      openSuggestionMenu(null);
    },
    edges: props.edges,
    isEditingInNode,
    nodes: props.nodes,
    onEdgesChange: props.onEdgesChange,
    onNodesChange: props.onNodesChange,
    ...(props.disableKeyboardShortcuts !== undefined
      ? { disabled: props.disableKeyboardShortcuts }
      : {}),
    ...(props.onPaneClick ? { onPaneClick: props.onPaneClick } : {}),
    onFitView: fitView,
  });

  useFitViewOnMount({
    fitView,
    ready: viewport.width > 0 && viewport.height > 0 && props.nodes.length > 0,
    ...(props.fitViewOnMount !== undefined ? { enabled: props.fitViewOnMount } : {}),
  });

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });

    const current = canvasRef.current;
    if (current) observer.observe(current);
    return () => observer.disconnect();
  }, [setViewport]);

  const selectionBounds = useMemo<FlowRect | null>(
    () => (selectionStart && selectionRect ? selectionRect : null),
    [selectionRect, selectionStart],
  );
  const edgeLayerProps = {
    blockRegistry: props.blockRegistry,
    edges: props.edges,
    nodes: props.nodes,
    onEdgesChange: props.onEdgesChange,
    transform,
    ...(props.onEdgeSelect ? { onEdgeSelect: props.onEdgeSelect } : {}),
  };
  const canvasOverlayProps = {
    activeConnection,
    blockRegistry: props.blockRegistry,
    clearSelection,
    edgeMenu,
    edges: props.edges,
    nodeMenu,
    nodes: props.nodes,
    onDeleteEdge: (edgeId: string) => props.onEdgesChange([{ type: "remove", id: edgeId }]),
    onDeleteNode: (nodeId: string) => props.onNodesChange([{ type: "remove", id: nodeId }]),
    onInspectorUpdate: (nodeId: string, patch: Record<string, unknown>) => {
      if (!selectedNode) return;
      props.onNodesChange([
        {
          type: "replace",
          id: nodeId,
          item: {
            ...selectedNode,
            data: { ...(selectedNode.data as Record<string, unknown>), ...patch },
          } as typeof selectedNode,
        },
      ]);
    },
    openEdgeMenu,
    openNodeMenu,
    openSuggestionMenu,
    selectedNode,
    selectionRect,
    suggestionMenu,
    transform,
    ...(props.inspectorTitleResolver
      ? { inspectorTitleResolver: props.inspectorTitleResolver }
      : {}),
    ...(props.inspectorWidth !== undefined ? { inspectorWidth: props.inspectorWidth } : {}),
    ...(props.onDuplicateNode ? { onDuplicateNode: props.onDuplicateNode } : {}),
    ...(props.readOnly !== undefined ? { readOnly: props.readOnly } : {}),
    ...(props.renderEdgeContextMenu ? { renderEdgeContextMenu: props.renderEdgeContextMenu } : {}),
    ...(props.renderNodeContextMenu ? { renderNodeContextMenu: props.renderNodeContextMenu } : {}),
    ...(props.renderSuggestionMenu ? { renderSuggestionMenu: props.renderSuggestionMenu } : {}),
    ...(props.suggestionSources ? { suggestionSources: props.suggestionSources } : {}),
    ...(props.renderInspectorEmptyState
      ? { inspectorEmptyState: props.renderInspectorEmptyState() }
      : {}),
  };
  const bottomBarProps = {
    canAddBlock: !props.readOnly,
    onAddBlock: (event: ReactMouseEvent<HTMLButtonElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      openAddBlockMenu({ x: rect.left + rect.width / 2, y: rect.top - 12 });
    },
    onFitView: fitView,
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    scale: transform.scale,
    ...(props.onRun ? { onRun: props.onRun } : {}),
  };

  return (
    <div
      ref={canvasRef}
      className={props.className}
      data-testid="flow-builder-canvas"
      onPointerDown={(event) => {
        panZoom.onPointerDown(event);
        if (event.button !== 0 || props.readOnly || event.target !== event.currentTarget) return;

        clearSelection();
        const rect = event.currentTarget.getBoundingClientRect();
        const start = screenToCanvas(
          { x: event.clientX - rect.left, y: event.clientY - rect.top },
          { width: viewport.width, height: viewport.height, transform },
        );

        setSelectionStart(start);
        setSelectionRect({ x: start.x, y: start.y, width: 0, height: 0 });
      }}
      onPointerMove={(event) => {
        panZoom.onPointerMove(event);
        if (!selectionStart || props.readOnly) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const current = screenToCanvas(
          { x: event.clientX - rect.left, y: event.clientY - rect.top },
          { width: viewport.width, height: viewport.height, transform },
        );

        setSelectionRect({
          x: Math.min(selectionStart.x, current.x),
          y: Math.min(selectionStart.y, current.y),
          width: Math.abs(current.x - selectionStart.x),
          height: Math.abs(current.y - selectionStart.y),
        });
      }}
      onPointerUp={(event) => {
        panZoom.onPointerUp(event);
        if (!selectionBounds || props.readOnly) {
          setSelectionStart(null);
          setSelectionRect(null);
          return;
        }

        const selectedIds = getNodesInSelection(props.nodes, selectionBounds);
        props.onNodesChange(
          props.nodes.map((node) => ({
            type: "select",
            id: node.id,
            selected: selectedIds.includes(node.id),
          })),
        );
        props.onNodeSelect?.(selectedIds);
        setSelectionStart(null);
        setSelectionRect(null);
      }}
      style={{
        ...props.style,
        height: "100%",
        overflow: "hidden",
        position: "relative",
        width: "100%",
      }}
    >
      <DotGrid transform={transform} />
      <EdgeLayer {...edgeLayerProps} />
      <div
        style={{
          inset: 0,
          position: "absolute",
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "0 0",
          zIndex: 1,
        }}
      >
        {props.nodes.map((node) => (
          <NodeWrapper
            key={node.id}
            blockRegistry={props.blockRegistry}
            canvasRef={canvasRef}
            node={node}
            nodes={props.nodes}
            onNodesChange={props.onNodesChange}
            onStartConnection={startConnection}
            {...(props.onNodeSelect ? { onNodeSelect: props.onNodeSelect } : {})}
            {...(props.readOnly !== undefined ? { readOnly: props.readOnly } : {})}
          />
        ))}
      </div>
      <CanvasOverlays {...canvasOverlayProps} />
      <CanvasBottomBar {...bottomBarProps} />
    </div>
  );
}
