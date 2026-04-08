import type { ReactNode } from "react";
import { createContext, useContext, useRef } from "react";
import { createStore, useStore } from "zustand";
import type {
  ConnectionPreviewState,
  FlowPosition,
  FlowRect,
  FlowSize,
  FlowTransform,
  SuggestionDropParams,
} from "@luzo/flow-types";

interface FloatingMenu<T> {
  anchor: FlowPosition;
  anchorEdge?: "top" | "bottom";
  payload: T;
}

interface EditorState {
  transform: FlowTransform;
  viewport: FlowSize;
  draggingPositions: Record<string, FlowPosition>;
  nodeSizes: Record<string, FlowSize>;
  selectionRect: FlowRect | null;
  activeConnection: ConnectionPreviewState | null;
  suggestionMenu: FloatingMenu<SuggestionDropParams> | null;
  nodeMenu: FloatingMenu<{ nodeId: string }> | null;
  edgeMenu: FloatingMenu<{ edgeId: string }> | null;
  setTransform: (transform: FlowTransform) => void;
  setViewport: (viewport: FlowSize) => void;
  setDraggingPosition: (nodeId: string, position: FlowPosition | null) => void;
  setNodeSize: (nodeId: string, size: FlowSize) => void;
  setSelectionRect: (rect: FlowRect | null) => void;
  setActiveConnection: (connection: ConnectionPreviewState | null) => void;
  openSuggestionMenu: (menu: FloatingMenu<SuggestionDropParams> | null) => void;
  openNodeMenu: (menu: FloatingMenu<{ nodeId: string }> | null) => void;
  openEdgeMenu: (menu: FloatingMenu<{ edgeId: string }> | null) => void;
}

type EditorStore = ReturnType<typeof createEditorStore>;

function isSameSize(left: FlowSize, right: FlowSize) {
  return left.width === right.width && left.height === right.height;
}

function isSameTransform(left: FlowTransform, right: FlowTransform) {
  return left.x === right.x && left.y === right.y && left.scale === right.scale;
}

function createEditorStore() {
  return createStore<EditorState>((set) => ({
    transform: { x: 0, y: 0, scale: 1 },
    viewport: { width: 0, height: 0 },
    draggingPositions: {},
    nodeSizes: {},
    selectionRect: null,
    activeConnection: null,
    suggestionMenu: null,
    nodeMenu: null,
    edgeMenu: null,
    setTransform: (transform) =>
      set((state) => (isSameTransform(state.transform, transform) ? state : { transform })),
    setViewport: (viewport) =>
      set((state) => (isSameSize(state.viewport, viewport) ? state : { viewport })),
    setDraggingPosition: (nodeId, position) =>
      set((state) => {
        if (!position) {
          const next = { ...state.draggingPositions };
          delete next[nodeId];
          return { draggingPositions: next };
        }

        return {
          draggingPositions: { ...state.draggingPositions, [nodeId]: position },
        };
      }),
    setNodeSize: (nodeId, size) =>
      set((state) => {
        const current = state.nodeSizes[nodeId];
        if (current && isSameSize(current, size)) return state;
        return { nodeSizes: { ...state.nodeSizes, [nodeId]: size } };
      }),
    setSelectionRect: (selectionRect) => set({ selectionRect }),
    setActiveConnection: (activeConnection) => set({ activeConnection }),
    openSuggestionMenu: (suggestionMenu) => set({ suggestionMenu }),
    openNodeMenu: (nodeMenu) => set({ nodeMenu }),
    openEdgeMenu: (edgeMenu) => set({ edgeMenu }),
  }));
}

const EditorStoreContext = createContext<EditorStore | null>(null);

export function EditorStoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<EditorStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createEditorStore();
  }

  return (
    <EditorStoreContext.Provider value={storeRef.current}>{children}</EditorStoreContext.Provider>
  );
}

export function useEditorStore<T>(selector: (state: EditorState) => T) {
  const store = useContext(EditorStoreContext);
  if (!store) {
    throw new Error("useEditorStore must be used within EditorStoreProvider");
  }

  return useStore(store, selector);
}
