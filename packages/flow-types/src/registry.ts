import type { Handle } from "./handles";
import type { FlowNode } from "./nodes";

export type BlockRenderResult = unknown;

export interface BlockRenderAPI {
  onUpdate: (nodeId: string, patch: Record<string, unknown>) => void;
  readOnly: boolean;
  selected: boolean;
}

export interface BlockDefinition {
  type: FlowNode["type"] | (string & {});
  handles: Handle[];
  minWidth?: number;
  renderCard?: (node: FlowNode, api: BlockRenderAPI) => BlockRenderResult;
  renderInspector?: (node: FlowNode, api: BlockRenderAPI) => BlockRenderResult;
}

export type BlockRegistry = Record<string, BlockDefinition>;
