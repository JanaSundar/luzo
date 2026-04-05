import type { FlowBlock } from "@/features/flow-editor/domain/types";
import type { FlowGraphIndex, TimelineRouteEdge } from "@/lib/pipeline/timeline/flow-graph";
import {
  deserializeFlowGraphIndex as deserializeCoreFlowGraphIndex,
  serializeFlowGraphIndex as serializeCoreFlowGraphIndex,
  type SerializedFlowGraphIndex as CoreSerializedFlowGraphIndex,
} from "@luzo/flow-core/serialize";

export type SerializedFlowGraphIndex = CoreSerializedFlowGraphIndex<FlowBlock, TimelineRouteEdge>;

type SerializedFlowGraphTransfer = {
  data: SerializedFlowGraphIndex;
  transferables: Transferable[];
};

export function serializeFlowGraphIndex(index: FlowGraphIndex): {
  data: SerializedFlowGraphIndex;
  transferables: Transferable[];
} {
  return serializeCoreFlowGraphIndex(index) as unknown as SerializedFlowGraphTransfer;
}

export function deserializeFlowGraphIndex(s: SerializedFlowGraphIndex): FlowGraphIndex {
  return deserializeCoreFlowGraphIndex(s) as unknown as FlowGraphIndex;
}
