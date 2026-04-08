import { useCallback, useMemo, useState } from "react";
import type { Connection, EdgeChange, NodeChange, SuggestionDropParams } from "@luzo/flow-types";

import { MODEL_REGISTRY } from "@/config/model-registry";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import { useSettingsStore } from "@/lib/stores/useSettingsStore";
import type { PipelineStep } from "@/types";
import { createDefaultRequestName } from "@/features/pipeline/request-names";
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

const DEFAULT_REQUEST: Omit<PipelineStep, "id" | "upstreamStepIds" | "name"> = {
  auth: { type: "none" },
  body: null,
  bodyType: "none",
  headers: [],
  method: "GET",
  params: [],
  url: "",
};
const DUPLICATE_BLOCK_OFFSET = { x: 48, y: 48 };

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
  const selectedNodeIdSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);
  const selectedEdgeIdSet = useMemo(() => new Set(selectedEdgeIds), [selectedEdgeIds]);
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
      if (structural.length > 0) {
        updateFlow((current) => applyNodeChanges(current, structural));
      }
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
      if (structural.length > 0) {
        updateFlow((current) => applyEdgeChanges(current, structural));
      }
    },
    [updateFlow],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      updateFlow((current) => ({
        ...current,
        connections: appendConnectionWithFlowRules(current.connections, {
          id: crypto.randomUUID(),
          sourceBlockId: connection.source,
          sourceHandleId: connection.sourceHandle,
          targetBlockId: connection.target,
          targetHandleId: connection.targetHandle,
          kind:
            connection.sourceHandle === "success" || connection.sourceHandle === "fail"
              ? "conditional"
              : "control",
        } satisfies FlowConnection),
      }));
    },
    [updateFlow],
  );

  const canConnect = useCallback(
    (connection: Connection) => {
      if (!flow) return false;
      return canConnectWithFlowRules(connection, flow.connections);
    },
    [flow],
  );

  const addBlockFromSuggestion = useCallback(
    (params: SuggestionDropParams, type: FlowBlock["type"]) => {
      updateFlow((current) => {
        const block = createBlock(type, params.position, {
          aiModel: activeAiModel,
          aiProvider: activeAiProvider,
          existingRequestNames: current.blocks.flatMap((entry) =>
            entry.type === "request" ? [entry.data.name] : [],
          ),
        });
        // Only create a connection when a real source node was provided.
        // An empty sourceNodeId means the block was added from the bottom bar
        // and the user will wire it manually.
        const newConnections: FlowConnection[] = params.sourceNodeId
          ? appendConnectionWithFlowRules(current.connections, {
              id: crypto.randomUUID(),
              sourceBlockId: params.sourceNodeId,
              sourceHandleId: params.sourceHandleId,
              targetBlockId: block.id,
              targetHandleId: "input",
              kind:
                params.sourceHandleId === "success" || params.sourceHandleId === "fail"
                  ? "conditional"
                  : "control",
            })
          : current.connections;
        return {
          ...current,
          blocks: placeBlockWithCollisionResolution(current.blocks, block),
          connections: newConnections,
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
        if (!block || block.type === "start") {
          return current;
        }

        const duplicate = duplicateFlowBlock(block);
        duplicatedId = duplicate.id;

        return {
          ...current,
          blocks: placeBlockWithCollisionResolution(current.blocks, duplicate),
        };
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

function getSafeAiProvider(value: string | undefined): "openai" | "groq" | "openrouter" {
  if (value === "openai" || value === "groq" || value === "openrouter") {
    return value;
  }

  return "openrouter";
}

function isValidFlowBlock(block: unknown): block is FlowBlock {
  if (!block || typeof block !== "object") return false;

  const candidate = block as Partial<FlowBlock> & {
    position?: { x?: unknown; y?: unknown };
  };

  return (
    typeof candidate.id === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.position?.x === "number" &&
    typeof candidate.position?.y === "number" &&
    candidate.data !== undefined
  );
}

function duplicateFlowBlock(block: Exclude<FlowBlock, { type: "start" }>): FlowBlock {
  const duplicate = structuredClone(block) as FlowBlock;
  duplicate.id = crypto.randomUUID();
  duplicate.position = {
    x: block.position.x + DUPLICATE_BLOCK_OFFSET.x,
    y: block.position.y + DUPLICATE_BLOCK_OFFSET.y,
  };

  if (duplicate.type === "request") {
    duplicate.data.name = withCopySuffix(duplicate.data.name);
  } else if ("label" in duplicate.data && typeof duplicate.data.label === "string") {
    duplicate.data.label = withCopySuffix(duplicate.data.label);
  }

  return duplicate;
}

function withCopySuffix(value: string) {
  return value.endsWith(" (Copy)") ? value : `${value} (Copy)`;
}

function createBlock(
  type: FlowBlock["type"],
  position: { x: number; y: number },
  options: {
    aiModel: string;
    aiProvider: "openai" | "groq" | "openrouter";
    existingRequestNames: string[];
  },
): FlowBlock {
  const id = crypto.randomUUID();

  switch (type) {
    case "request":
      return {
        id,
        type,
        position,
        data: {
          ...DEFAULT_REQUEST,
          name: createDefaultRequestName(options.existingRequestNames),
        },
      };
    case "evaluate":
      return {
        id,
        type,
        position,
        data: { conditionType: "if", expression: "", label: "Evaluate" },
      };
    case "list":
      return { id, type, position, data: { itemCount: 0, label: "List" } };
    case "display":
      return { id, type, position, data: { chartType: "table", label: "Display" } };
    case "ai":
      return {
        id,
        type,
        position,
        data: {
          label: "AI",
          model: options.aiModel,
          prompt: "Summarize the previous response.",
          provider: options.aiProvider,
          systemPrompt: "You are a helpful API workflow assistant.",
        },
      };
    case "text":
      return { id, type, position, data: { content: "Notes", label: "Text" } };
    case "group":
      return { id, type, position, data: { color: "#dbeafe", label: "Group" } };
    case "start":
    default:
      return { id, type: "start", position, data: { label: "Start" } };
  }
}
