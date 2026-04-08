"use client";

import { Braces, Plus } from "lucide-react";
import { useMemo } from "react";
import { FlowBuilder } from "@luzo/flow-builder";
import type { SuggestionDropParams } from "@luzo/flow-types";

import { CollectionPipelineDialog } from "@/components/pipelines/collection-generator/CollectionPipelineDialog";
import { Button } from "@/components/ui/button";
import { getFlowNodeAutocompleteSuggestions } from "@/lib/pipeline/autocomplete";
import { useEnvironmentStore } from "@/lib/stores/useEnvironmentStore";
import { usePipelineExecutionStore } from "@/lib/stores/usePipelineExecutionStore";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import { getUnsupportedWorkflowNodeKinds } from "./domain/flow-document";
import { createLuzoBlockRegistry } from "./blockDefs";
import { useFlowState } from "./hooks/useFlowState";

const suggestionSources = [
  {
    id: "core",
    label: "Core",
    items: [
      { label: "Request", type: "request" },
      { label: "Condition", type: "evaluate" },
    ],
  },
];

export function FlowEditorPage({
  onClearRequestedCollection,
  requestedCollectionId,
}: {
  onClearRequestedCollection?: () => void;
  requestedCollectionId?: string | null;
}) {
  const activePipelineId = usePipelineStore((state) => state.activePipelineId);
  const {
    addBlockFromSuggestion,
    blockMap,
    canConnect,
    duplicateNode,
    edges,
    nodes,
    onConnect,
    onEdgesChange,
    onNodesChange,
    pipeline,
    setSelectedEdgeIds,
    setSelectedNodeIds,
  } = useFlowState(activePipelineId);
  const activeEnvironment = useEnvironmentStore((state) =>
    state.environments.find((environment) => environment.id === state.activeEnvironmentId),
  );
  const runtimeVariables = usePipelineExecutionStore((state) => state.runtimeVariables);
  const envVars = useMemo(
    () =>
      Object.fromEntries(
        (activeEnvironment?.variables ?? [])
          .filter((variable) => variable.enabled && variable.key)
          .map((variable) => [variable.key, variable.value]),
      ),
    [activeEnvironment],
  );
  const getNodeSuggestions = useMemo(
    () => (nodeId: string) =>
      getFlowNodeAutocompleteSuggestions(
        pipeline ?? undefined,
        nodeId,
        envVars,
        runtimeVariables as Record<string, unknown>,
      ),
    [envVars, pipeline, runtimeVariables],
  );
  const blockRegistry = useMemo(
    () =>
      createLuzoBlockRegistry(blockMap, {
        getNodeSuggestions,
        pipeline,
      }),
    [blockMap, getNodeSuggestions, pipeline],
  );

  if (!pipeline) return null;
  const unsupportedKinds = getUnsupportedWorkflowNodeKinds(pipeline.flowDocument);

  const requestCount = nodes.filter((node) => node.type === "request").length;
  const readOnly = unsupportedKinds.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Visual flow editor</p>
          <p className="text-xs text-muted-foreground">
            Graph-native editing with runtime compilation kept in the app layer.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CollectionPipelineDialog
            initialCollectionId={requestedCollectionId}
            onCloseRequestReset={onClearRequestedCollection}
            trigger={
              <Button disabled={readOnly} type="button" variant="outline" className="h-9 gap-2">
                <Braces className="h-3.5 w-3.5" />
                From collection
              </Button>
            }
          />
          <Button
            disabled={readOnly}
            type="button"
            className="h-9 gap-2"
            onClick={() =>
              addBlockFromSuggestion(
                {
                  position: { x: 280 + requestCount * 360, y: 160 },
                  sourceHandleId: "output",
                  sourceNodeId: "flow-start",
                },
                "request",
              )
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add request
          </Button>
        </div>
      </div>

      {unsupportedKinds.length > 0 ? (
        <div className="rounded-2xl border border-amber-300/50 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          This editor is read-only for pipelines that include unsupported node kinds. Unsupported:{" "}
          {unsupportedKinds.join(", ")}.
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden rounded-[1.5rem] border border-border/50 bg-background/80 shadow-sm">
        <FlowBuilder
          blockRegistry={blockRegistry}
          className="h-full w-full"
          edges={edges}
          fitViewOnMount
          nodes={nodes}
          canConnect={canConnect}
          onConnect={onConnect}
          onDuplicateNode={duplicateNode}
          onEdgeSelect={setSelectedEdgeIds}
          onEdgesChange={onEdgesChange}
          onNodeSelect={setSelectedNodeIds}
          onNodesChange={onNodesChange}
          onPaneClick={() => {
            setSelectedEdgeIds([]);
            setSelectedNodeIds([]);
          }}
          readOnly={readOnly}
          renderSuggestionMenu={(params, close) => (
            <SuggestionPanel
              close={close}
              onSelect={(type) => addBlockFromSuggestion(params, type)}
              params={params}
            />
          )}
          suggestionSources={suggestionSources}
        />
      </div>
    </div>
  );
}

function SuggestionPanel({
  close,
  onSelect,
}: {
  close: () => void;
  onSelect: (type: "request" | "evaluate") => void;
  params: SuggestionDropParams;
}) {
  const items: Array<{ label: string; type: "request" | "evaluate" }> = [
    { label: "Request", type: "request" },
    { label: "Condition", type: "evaluate" },
  ];

  return (
    <div className="grid gap-1">
      <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Add block
      </div>
      {items.map((item) => (
        <button
          key={item.type}
          type="button"
          className="rounded-xl px-3 py-2 text-left text-sm transition hover:bg-muted"
          onClick={() => {
            onSelect(item.type);
            close();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
