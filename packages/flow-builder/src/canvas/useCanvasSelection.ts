import { useCallback, useMemo } from "react";
import type { EdgeChange, FlowEdge, FlowNode, NodeChange } from "@luzo/flow-types";

interface UseCanvasSelectionOptions {
  edges: FlowEdge[];
  nodes: FlowNode[];
  onEdgeSelect?: (edgeIds: string[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onNodeSelect?: (nodeIds: string[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onPaneClick?: () => void;
}

export function useCanvasSelection({
  edges,
  nodes,
  onEdgeSelect,
  onEdgesChange,
  onNodeSelect,
  onNodesChange,
  onPaneClick,
}: UseCanvasSelectionOptions) {
  const selectedNode = useMemo(() => {
    const selected = nodes.filter((node) => node.selected);
    return selected.length === 1 ? (selected[0] ?? null) : null;
  }, [nodes]);

  const clearSelection = useCallback(() => {
    onPaneClick?.();
    const nodeChanges = nodes
      .filter((node) => node.selected)
      .map((node) => ({ type: "select", id: node.id, selected: false }) satisfies NodeChange);
    const edgeChanges = edges
      .filter((edge) => edge.selected)
      .map((edge) => ({ type: "select", id: edge.id, selected: false }) satisfies EdgeChange);

    if (nodeChanges.length > 0) onNodesChange(nodeChanges);
    if (edgeChanges.length > 0) onEdgesChange(edgeChanges);
    onNodeSelect?.([]);
    onEdgeSelect?.([]);
  }, [edges, nodes, onEdgeSelect, onEdgesChange, onNodeSelect, onNodesChange, onPaneClick]);

  return { clearSelection, selectedNode };
}
