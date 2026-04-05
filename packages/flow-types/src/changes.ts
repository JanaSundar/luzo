import type { Connection } from "./edges";
import type { HandleId } from "./handles";
import type { FlowNode, FlowPosition } from "./nodes";
import type { FlowEdge } from "./edges";

export type NodeChange =
  | { type: "add"; item: FlowNode }
  | { type: "remove"; id: string }
  | { type: "replace"; id: string; item: FlowNode }
  | { type: "position"; id: string; position: FlowPosition; dragging?: boolean }
  | { type: "select"; id: string; selected: boolean }
  | { type: "dimensions"; id: string; width: number; height: number };

export type EdgeChange =
  | { type: "add"; item: FlowEdge }
  | { type: "remove"; id: string }
  | { type: "replace"; id: string; item: FlowEdge }
  | { type: "select"; id: string; selected: boolean };

export interface SuggestionDropParams {
  position: FlowPosition;
  sourceNodeId: string;
  sourceHandleId: HandleId;
}

export interface SuggestionItem {
  type: string;
  label: string;
  description?: string;
  defaultData?: Record<string, unknown>;
}

export interface SuggestionSource {
  id: string;
  label: string;
  items: SuggestionItem[];
}

export interface SelectionSnapshot {
  nodeIds: string[];
  edgeIds: string[];
}

export interface ConnectResult {
  connection: Connection;
  preventedByCycle: boolean;
}
