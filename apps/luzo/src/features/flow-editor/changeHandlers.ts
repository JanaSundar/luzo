import type { EdgeChange, NodeChange } from "@luzo/flow-types";
import {
  applyEdgeChanges as applyCoreEdgeChanges,
  applyNodeChanges as applyCoreNodeChanges,
} from "@luzo/flow-core/transform";

import type { FlowBlock, FlowConnection, FlowDocument } from "./domain/types";

export function applyNodeChanges(flow: FlowDocument, changes: NodeChange[]) {
  return applyCoreNodeChanges<FlowBlock, FlowConnection>({
    document: flow,
    changes,
  }) as FlowDocument;
}

export function applyEdgeChanges(flow: FlowDocument, changes: EdgeChange[]) {
  return applyCoreEdgeChanges<FlowBlock, FlowConnection>({
    document: flow,
    changes,
  }) as FlowDocument;
}
