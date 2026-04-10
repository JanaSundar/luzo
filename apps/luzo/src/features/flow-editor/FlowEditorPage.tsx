"use client";

import { Braces, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/utils";
import type { FlowNode } from "@luzo/flow-types";
import { FlowBuilder } from "@luzo/flow-builder";

import { CollectionPipelineDialog } from "@/components/pipelines/collection-generator/CollectionPipelineDialog";
import { Button } from "@/components/ui/button";
import { getFlowNodeAutocompleteSuggestions } from "@/features/pipelines/autocomplete/suggestions";
import { compileExecutionPlan } from "@/features/workflow/compiler/compileExecutionPlan";
import { toCompilePlanInput } from "@/features/workflow/pipeline-adapters";
import { useEnvironmentStore } from "@/stores/useEnvironmentStore";
import { usePipelineExecutionStore } from "@/stores/usePipelineExecutionStore";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { getUnsupportedWorkflowNodeKinds } from "./domain/flow-document";
import { createLuzoBlockRegistry } from "./blockDefs";
import { useFlowState } from "./hooks/useFlowState";

export const FLOW_EDITOR_SUGGESTION_SOURCES = [
  { id: "requests", label: "Requests", items: [{ label: "Request", type: "request" }] },
  {
    id: "control",
    label: "Control flow",
    items: [
      { label: "If", type: "if" },
      { label: "Switch", type: "switch" },
      { label: "Delay", type: "delay" },
      { label: "End", type: "end" },
      { label: "Poll", type: "poll" },
    ],
  },
  {
    id: "utilities",
    label: "Utilities",
    items: [
      { label: "For Each", type: "forEach" },
      { label: "Transform", type: "transform" },
      { label: "Log", type: "log" },
      { label: "Assert", type: "assert" },
      { label: "Webhook Wait", type: "webhookWait" },
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
  const nodeRuntimeRefById = useMemo(() => {
    if (!pipeline) return new Map<string, string>();
    const { aliases } = compileExecutionPlan(toCompilePlanInput(pipeline));
    return new Map(
      aliases.map((alias) => {
        const runtimeRef =
          alias.refs.find((ref) => ref !== alias.stepId && !/^req\d+$/.test(ref)) ??
          alias.refs.find((ref) => !/^req\d+$/.test(ref)) ??
          alias.alias;
        return [alias.stepId, runtimeRef];
      }),
    );
  }, [pipeline]);
  const blockRegistry = useMemo(
    () =>
      createLuzoBlockRegistry(blockMap, {
        getNodeSuggestions,
        getNodeRuntimeRef: (nodeId) => nodeRuntimeRefById.get(nodeId) ?? null,
        pipeline,
      }),
    [blockMap, getNodeSuggestions, nodeRuntimeRefById, pipeline],
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
          renderNodeContextMenu={(node, close) => (
            <FlowNodeMenu
              node={node}
              close={close}
              onDuplicate={node.type !== "start" ? () => duplicateNode(node.id) : undefined}
              onDelete={() => {
                onNodesChange([{ type: "remove", id: node.id }]);
                close();
              }}
            />
          )}
          renderSuggestionMenu={(params, close) => (
            <SuggestionPanel
              close={close}
              onSelect={(type) => addBlockFromSuggestion(params, type)}
            />
          )}
          suggestionSources={FLOW_EDITOR_SUGGESTION_SOURCES}
        />
      </div>
    </div>
  );
}

type SuggestionBlockType =
  | "request"
  | "if"
  | "switch"
  | "delay"
  | "end"
  | "poll"
  | "forEach"
  | "transform"
  | "log"
  | "assert"
  | "webhookWait";

export const FLOW_EDITOR_SUGGESTION_SECTIONS: Array<{
  label: string;
  items: Array<{ label: string; description: string; type: SuggestionBlockType }>;
}> = [
  {
    label: "Requests",
    items: [{ label: "Request", description: "Make an HTTP call", type: "request" }],
  },
  {
    label: "Control flow",
    items: [
      { label: "If", description: "Branch on a condition", type: "if" },
      { label: "Switch", description: "Multi-way branch on cases", type: "switch" },
      { label: "Delay", description: "Wait before continuing", type: "delay" },
      { label: "End", description: "Terminate this branch", type: "end" },
      { label: "Poll", description: "Repeat until condition", type: "poll" },
    ],
  },
  {
    label: "Utilities",
    items: [
      { label: "For Each", description: "Iterate over a collection", type: "forEach" },
      { label: "Transform", description: "Map or reshape data", type: "transform" },
      { label: "Log", description: "Emit a debug message", type: "log" },
      { label: "Assert", description: "Halt if condition fails", type: "assert" },
      { label: "Webhook Wait", description: "Pause for inbound webhook", type: "webhookWait" },
    ],
  },
];

function SuggestionPanel({
  close,
  onSelect,
}: {
  close: () => void;
  onSelect: (type: SuggestionBlockType) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const h = (e: WheelEvent) => e.stopPropagation();
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const filteredSections = query.trim()
    ? FLOW_EDITOR_SUGGESTION_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.label.toLowerCase().includes(query.toLowerCase()) ||
            item.description.toLowerCase().includes(query.toLowerCase()),
        ),
      })).filter((section) => section.items.length > 0)
    : FLOW_EDITOR_SUGGESTION_SECTIONS;

  const flatItems = filteredSections.flatMap((s) => s.items);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatItems[activeIndex];
      if (item) {
        onSelect(item.type);
        close();
      }
    } else if (e.key === "Escape") {
      close();
    }
  };

  let flatIndex = 0;

  return (
    <div className="flex w-60 flex-col">
      <div className="px-2 pb-1 pt-2">
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search blocks…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
          />
        </div>
      </div>
      <div ref={scrollRef} className="max-h-72 overflow-y-auto pb-1">
        {filteredSections.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">No blocks found</div>
        ) : (
          filteredSections.map((section) => (
            <div key={section.label}>
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                {section.label}
              </div>
              {section.items.map((item) => {
                const index = flatIndex++;
                const isActive = index === activeIndex;
                return (
                  <button
                    key={item.type}
                    type="button"
                    className={cn(
                      "w-full rounded-xl px-3 py-2 text-left transition",
                      isActive ? "bg-muted" : "hover:bg-muted",
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => {
                      onSelect(item.type);
                      close();
                    }}
                  >
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-[11px] text-muted-foreground">{item.description}</div>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FlowNodeMenu({
  close,
  node,
  onDelete,
  onDuplicate,
}: {
  close: () => void;
  node: FlowNode;
  onDelete: () => void;
  onDuplicate?: () => void;
}) {
  return (
    <div className="grid min-w-[160px] gap-0.5 p-1">
      <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {node.type}
      </div>
      {onDuplicate ? (
        <button
          type="button"
          className="w-full rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-muted"
          onClick={() => {
            onDuplicate();
            close();
          }}
        >
          Duplicate
        </button>
      ) : null}
      <button
        type="button"
        className="w-full rounded-lg px-2 py-1.5 text-left text-sm text-destructive transition hover:bg-destructive/10"
        onClick={onDelete}
      >
        Delete
      </button>
    </div>
  );
}
