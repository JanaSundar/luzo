/**
 * graph.worker — offloads FlowGraphIndex construction from the main thread.
 *
 * buildFlowGraphIndex includes O(V²/32) bitset relation computation that
 * blocks the main thread on pipeline load. Running it here keeps the canvas
 * and editor interactive while the index builds.
 *
 * Message protocol:
 *   IN:  GraphWorkerRequest
 *   OUT: GraphWorkerResponse   (bitset ArrayBuffers are transferred, not copied)
 */

import type { FlowDocument } from "@/features/flow-editor/domain/types";
import { buildFlowGraphIndex } from "@/lib/pipeline/timeline/flow-graph";
import { serializeFlowGraphIndex, type SerializedFlowGraphIndex } from "./serialization";

// ─── Message types ───────────────────────────────────────────────────────────

export type GraphWorkerRequest = {
  type: "build_index";
  flow: FlowDocument;
  requestId: number;
};

export type GraphWorkerResponse =
  | { type: "graph_index_ready"; result: SerializedFlowGraphIndex; requestId: number }
  | { type: "graph_index_ready"; result: null; requestId: number }
  | { type: "error"; error: string; requestId: number };

// ─── Worker message handler ──────────────────────────────────────────────────

// `declare` gives TypeScript the correct overload without pulling in lib.webworker.
declare function postMessage(message: GraphWorkerResponse, transfer?: Transferable[]): void;

(self as unknown as { onmessage: (e: MessageEvent<GraphWorkerRequest>) => void }).onmessage = (
  event,
) => {
  const { type, requestId } = event.data;
  if (type !== "build_index") return;

  try {
    const index = buildFlowGraphIndex(event.data.flow);

    if (!index) {
      postMessage({ type: "graph_index_ready", result: null, requestId });
      return;
    }

    const { data, transferables } = serializeFlowGraphIndex(index);
    postMessage({ type: "graph_index_ready", result: data, requestId }, transferables);
  } catch (err) {
    postMessage({
      type: "error",
      error: err instanceof Error ? err.message : String(err),
      requestId,
    });
  }
};
