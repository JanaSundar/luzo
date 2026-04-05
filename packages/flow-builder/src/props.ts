import type { CSSProperties, ReactNode } from "react";
import type {
  BlockRegistry,
  ConnectStartParams,
  Connection,
  EdgeChange,
  FlowEdge,
  FlowNode,
  NodeChange,
  SuggestionDropParams,
  SuggestionSource,
} from "@luzo/flow-types";

export interface FlowBuilderProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onConnectStart?: (params: ConnectStartParams) => void;
  onConnectEnd?: () => void;
  onNodeSelect?: (nodeIds: string[]) => void;
  onEdgeSelect?: (edgeIds: string[]) => void;
  onPaneClick?: () => void;
  onDuplicateNode?: (nodeId: string) => void;
  onSuggestionDrop?: (params: SuggestionDropParams) => void;
  onRun?: () => void;
  blockRegistry: BlockRegistry;
  renderNodeContextMenu?: (node: FlowNode, close: () => void) => ReactNode;
  renderEdgeContextMenu?: (edge: FlowEdge, close: () => void) => ReactNode;
  renderSuggestionMenu?: (params: SuggestionDropParams, close: () => void) => ReactNode;
  renderInspectorEmptyState?: () => ReactNode;
  suggestionSources?: SuggestionSource[];
  readOnly?: boolean;
  disableKeyboardShortcuts?: boolean;
  fitViewOnMount?: boolean;
  inspectorTitleResolver?: (node: FlowNode) => string;
  inspectorWidth?: number | string;
  className?: string;
  style?: CSSProperties;
}
