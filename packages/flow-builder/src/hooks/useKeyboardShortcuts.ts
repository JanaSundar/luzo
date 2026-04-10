import type { RefObject } from "react";
import { useEffect } from "react";
import type { EdgeChange, FlowEdge, FlowNode, NodeChange } from "@luzo/flow-types";

interface UseKeyboardShortcutsOptions {
  canvasRef: RefObject<HTMLElement | null>;
  disabled?: boolean;
  isEditingInNode: boolean;
  nodes: FlowNode[];
  edges: FlowEdge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onPaneClick?: () => void;
  onFitView?: () => void;
  closeMenus: () => void;
}

export function useKeyboardShortcuts({
  canvasRef,
  disabled,
  isEditingInNode,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onPaneClick,
  onFitView,
  closeMenus,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const root = canvasRef.current;
      if (!root) return;
      if (!root.contains(document.activeElement) && document.activeElement !== document.body) {
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && !isEditingInNode) {
        const nodeChanges = nodes
          .filter((node) => node.selected)
          .map((node) => ({ type: "remove", id: node.id }) satisfies NodeChange);
        const edgeChanges = edges
          .filter((edge) => edge.selected)
          .map((edge) => ({ type: "remove", id: edge.id }) satisfies EdgeChange);

        if (nodeChanges.length > 0) onNodesChange(nodeChanges);
        if (edgeChanges.length > 0) onEdgesChange(edgeChanges);
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        onNodesChange(nodes.map((node) => ({ type: "select", id: node.id, selected: true })));
      }

      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        onFitView?.();
      }

      if (event.key === "Escape") {
        closeMenus();
        onPaneClick?.();
        onNodesChange(
          nodes
            .filter((node) => node.selected)
            .map((node) => ({ type: "select", id: node.id, selected: false })),
        );
        onEdgesChange(
          edges
            .filter((edge) => edge.selected)
            .map((edge) => ({ type: "select", id: edge.id, selected: false })),
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canvasRef,
    closeMenus,
    disabled,
    edges,
    isEditingInNode,
    nodes,
    onEdgesChange,
    onFitView,
    onNodesChange,
    onPaneClick,
  ]);
}
