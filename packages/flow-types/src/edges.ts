import type { HandleId } from "./handles";

export type EdgeType = "default" | "variable" | "conditional";

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: HandleId;
  targetHandle?: HandleId;
  type?: EdgeType;
  label?: string;
  selected?: boolean;
}

export interface Connection {
  source: string;
  target: string;
  sourceHandle?: HandleId;
  targetHandle?: HandleId;
}

export interface ConnectStartParams {
  nodeId: string;
  handleId: HandleId;
}
