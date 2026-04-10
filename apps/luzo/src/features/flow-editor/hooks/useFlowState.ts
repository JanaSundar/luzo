import { useCallback, useMemo, useState } from "react";
import type { Connection, EdgeChange, NodeChange, SuggestionDropParams } from "@luzo/flow-types";
import { MODEL_REGISTRY } from "@/config/model-registry";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { applyEdgeChanges, applyNodeChanges } from "../changeHandlers";
import { placeBlockWithCollisionResolution } from "../domain/block-placement";
import {
  appendConnectionWithFlowRules,
  canConnectWithFlowRules,
} from "../domain/connection-limits";
import {
  ensureFlowDocument,
  syncPipelineSteps,
  toWorkflowFlowDocument,
} from "../domain/flow-document";
import type { FlowBlock, FlowConnection } from "../domain/types";
import { toFlowEdge, toFlowNode } from "../nodeAdapters";
import { createFlowBlock } from "./createFlowBlock";
import { duplicateFlowBlock } from "./flowBlockDuplication";

export function useFlowState(pipelineId: string | null) {
  const activeAiProvider = useSettingsStore((state) => getSafeAiProvider(state.activeAiProvider));
  const activeAiModel = useSettingsStore((state) => {
    const provider = getSafeAiProvider(state.activeAiProvider);
    return state.providers?.[provider]?.model || MODEL_REGISTRY[provider].defaultModel;
  });
  const pipeline = usePipelineStore((state) =>
    pipelineId ? (state.pipelines.find((entry) => entry.id === pipelineId) ?? null) : null,
  );
  const updatePipeline = usePipelineStore((state) => state.updatePipeline);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);

  const flow = useMemo(
    () => (pipeline ? ensureFlowDocument(pipeline.flowDocument, pipeline.steps) : null),
    [pipeline],
  );
  const blocks = useMemo(
    () => (flow?.blocks ?? []).filter((block): block is FlowBlock => isValidFlowBlock(block)),
    [flow],
  );
  const connections = useMemo(
    () =>
      (flow?.connections ?? []).filter((connection): connection is FlowConnection =>
        Boolean(connection?.id),
      ),
    [flow],
  );
  const selectedNodeIdSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);
  const selectedEdgeIdSet = useMemo(() => new Set(selectedEdgeIds), [selectedEdgeIds]);

  const nodes = useMemo(
    () => blocks.map((block) => toFlowNode(block, selectedNodeIdSet.has(block.id))),
    [blocks, selectedNodeIdSet],
  );
  const edges = useMemo(
    () =>
      connections.map((connection) => toFlowEdge(connection, selectedEdgeIdSet.has(connection.id))),
    [connections, selectedEdgeIdSet],
  );
  const blockMap = useMemo(
    () => new Map(blocks.map((block) => [block.id, block] as const)),
    [blocks],
  );

  const updateFlow = useCallback(
    (updater: (current: NonNullable<typeof flow>) => NonNullable<typeof flow>) => {
      if (!pipelineId || !flow || !pipeline) return;
      const nextFlow = updater(flow);
      updatePipeline(pipelineId, {
        flowDocument: toWorkflowFlowDocument(nextFlow, pipeline),
        steps: syncPipelineSteps(nextFlow, pipeline.steps),
      });
    },
    [flow, pipeline, pipelineId, updatePipeline],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const selectIds = changes.filter((change) => change.type === "select");
      if (selectIds.length > 0) {
        setSelectedNodeIds(
          selectIds.filter((change) => change.selected).map((change) => change.id),
        );
      }

      const structural = changes.filter(
        (change) => change.type !== "select" && change.type !== "dimensions",
      );
      if (structural.length > 0) updateFlow((current) => applyNodeChanges(current, structural));
    },
    [updateFlow],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const selectIds = changes.filter((change) => change.type === "select");
      if (selectIds.length > 0) {
        setSelectedEdgeIds(
          selectIds.filter((change) => change.selected).map((change) => change.id),
        );
      }

      const structural = changes.filter((change) => change.type !== "select");
      if (structural.length > 0) updateFlow((current) => applyEdgeChanges(current, structural));
    },
    [updateFlow],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      updateFlow((current) => ({
        ...current,
        connections: appendConnectionWithFlowRules(
          current.connections,
          toFlowConnection(connection),
        ),
      }));
    },
    [updateFlow],
  );

  const canConnect = useCallback(
    (connection: Connection) =>
      flow ? canConnectWithFlowRules(connection, flow.connections) : false,
    [flow],
  );

  const addBlockFromSuggestion = useCallback(
    (params: SuggestionDropParams, type: FlowBlock["type"]) => {
      updateFlow((current) => {
        const block = createFlowBlock(type, params.position, {
          aiModel: activeAiModel,
          aiProvider: activeAiProvider,
          existingRequestNames: current.blocks.flatMap((entry) =>
            entry.type === "request" ? [entry.data.name] : [],
          ),
        });
        const connections = params.sourceNodeId
          ? appendConnectionWithFlowRules(
              current.connections,
              toFlowConnection({
                source: params.sourceNodeId,
                sourceHandle: params.sourceHandleId,
                target: block.id,
                targetHandle: "input",
              } satisfies Connection),
            )
          : current.connections;

        return {
          ...current,
          blocks: placeBlockWithCollisionResolution(current.blocks, block),
          connections,
        };
      });
    },
    [activeAiModel, activeAiProvider, updateFlow],
  );

  const duplicateNode = useCallback(
    (nodeId: string) => {
      let duplicatedId: string | null = null;

      updateFlow((current) => {
        const block = current.blocks.find((entry) => entry.id === nodeId);
        if (!block || block.type === "start") return current;

        const duplicate = duplicateFlowBlock(block);
        duplicatedId = duplicate.id;
        return { ...current, blocks: placeBlockWithCollisionResolution(current.blocks, duplicate) };
      });

      if (duplicatedId) {
        setSelectedEdgeIds([]);
        setSelectedNodeIds([duplicatedId]);
      }
    },
    [updateFlow],
  );

  return {
    addBlockFromSuggestion,
    blockMap,
    canConnect,
    duplicateNode,
    edges,
    flow,
    nodes,
    onConnect,
    onEdgesChange,
    onNodesChange,
    pipeline,
    setSelectedEdgeIds,
    setSelectedNodeIds,
  };
}

function toFlowConnection(connection: Connection): FlowConnection {
  const sourceHandleId = connection.sourceHandle;
  return {
    id: crypto.randomUUID(),
    sourceBlockId: connection.source,
    sourceHandleId,
    targetBlockId: connection.target,
    targetHandleId: connection.targetHandle,
    kind:
      sourceHandleId === "success" ||
      sourceHandleId === "fail" ||
      sourceHandleId === "true" ||
      sourceHandleId === "false"
        ? "conditional"
        : "control",
  };
}

function getSafeAiProvider(value: string | undefined) {
  if (value === "openai" || value === "groq" || value === "openrouter") return value;
  return "openrouter";
}

function isValidFlowBlock(block: unknown): block is FlowBlock {
  if (!block || typeof block !== "object") return false;
  const candidate = block as Partial<FlowBlock> & { position?: { x?: unknown; y?: unknown } };
  return (
    typeof candidate.id === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.position?.x === "number" &&
    typeof candidate.position?.y === "number" &&
    candidate.data !== undefined
  );
}
