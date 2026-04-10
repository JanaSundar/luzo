import type { FlowNode, FlowPosition } from "./nodes";

export interface FlowTransform {
  x: number;
  y: number;
  scale: number;
}

export interface FlowViewport {
  width: number;
  height: number;
  transform: FlowTransform;
}

export interface FlowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ConnectionPreviewState {
  sourceNodeId: string;
  sourceHandleId: string;
  cursor: FlowPosition;
}

export type VisibleNode = Pick<FlowNode, "id" | "position" | "width" | "height">;
