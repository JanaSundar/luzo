"use client";

import { useCallback, useEffect, useRef } from "react";
import type { FlowDocument } from "@/features/flow-editor/domain/types";
import { useTimelineStore } from "@/lib/stores/useTimelineStore";
import { deserializeFlowGraphIndex } from "./serialization";
import type { GraphWorkerResponse } from "./graph.worker";

/**
 * Manages the graph.worker lifecycle and wires its output to the timeline store.
 *
 * Stale responses are discarded via a monotonic requestId counter — only the
 * result matching the most recent request is applied to the store.
 *
 * Falls back gracefully: if the worker hasn't responded yet, syncFromExecution
 * will compute the index on the main thread (existing fallback path).
 */
export function useGraphWorker() {
  const setPrebuiltGraphIndex = useTimelineStore((s) => s.setPrebuiltGraphIndex);

  const workerRef = useRef<Worker | null>(null);
  const latestRequestIdRef = useRef(0);
  // Keep store action ref stable so useCallback below has no deps.
  const setIndexRef = useRef(setPrebuiltGraphIndex);
  useEffect(() => {
    setIndexRef.current = setPrebuiltGraphIndex;
  });

  // Create and wire the worker once on mount; terminate on unmount.
  useEffect(() => {
    const worker = new Worker(new URL("./graph.worker.ts", import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<GraphWorkerResponse>) => {
      const msg = event.data;

      if (msg.type === "error") {
        return;
      }

      if (msg.type === "graph_index_ready") {
        // Discard stale results from superseded requests.
        if (msg.requestId !== latestRequestIdRef.current) return;
        setIndexRef.current(msg.result ? deserializeFlowGraphIndex(msg.result) : null);
      }
    };

    worker.onerror = () => undefined;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  /**
   * Request an async build of the FlowGraphIndex for the given flow.
   * Stable reference — safe to use in useEffect dependency arrays.
   *
   * When flow is null/undefined/empty the index is cleared immediately
   * without sending a worker message.
   */
  const requestGraphIndex = useCallback((flow: FlowDocument | null | undefined) => {
    if (!flow || flow.blocks.length === 0) {
      setIndexRef.current(null);
      return;
    }

    const worker = workerRef.current;
    if (!worker) return;

    const requestId = ++latestRequestIdRef.current;
    worker.postMessage({ type: "build_index", flow, requestId });
  }, []); // stable — uses only refs

  return { requestGraphIndex };
}
