"use client";

import type {
  AssertNode,
  BlockDefinition,
  ForEachNode,
  LogNode,
  PollNode,
  TransformNode,
  WebhookWaitNode,
} from "@luzo/flow-types";
import type { VariableSuggestion } from "@/types/pipeline-debug";

import {
  AssertInspector,
  ForEachInspector,
  LogInspector,
  TransformInspector,
  WebhookWaitInspector,
} from "../inspectors/WorkflowInspectors";
import { PollInspector } from "../inspectors/PollInspector";

export function createForEachBlockDef(
  getSuggestions?: (nodeId: string) => VariableSuggestion[],
): BlockDefinition {
  return {
    type: "forEach",
    minWidth: 304,
    handles: [
      { id: "input", position: "left", type: "target" },
      { id: "output", position: "right", type: "source", label: "Exit" },
    ],
    renderInspector: (node, api) => (
      <ForEachInspector
        api={api}
        node={node as ForEachNode}
        suggestions={getSuggestions?.(node.id) ?? []}
      />
    ),
  };
}

export function createTransformBlockDef(
  getSuggestions?: (nodeId: string) => VariableSuggestion[],
  getRuntimeRef?: (nodeId: string) => string | null,
): BlockDefinition {
  return {
    type: "transform",
    minWidth: 280,
    handles: [
      { id: "input", position: "left", type: "target" },
      { id: "output", position: "right", type: "source" },
    ],
    renderInspector: (node, api) => (
      <TransformInspector
        api={api}
        node={node as TransformNode}
        runtimeRef={getRuntimeRef?.(node.id) ?? null}
        suggestions={getSuggestions?.(node.id) ?? []}
      />
    ),
  };
}

export function createLogBlockDef(
  getSuggestions?: (nodeId: string) => VariableSuggestion[],
): BlockDefinition {
  return {
    type: "log",
    minWidth: 240,
    handles: [
      { id: "input", position: "left", type: "target" },
      { id: "output", position: "right", type: "source" },
    ],
    renderInspector: (node, api) => (
      <LogInspector
        api={api}
        node={node as LogNode}
        suggestions={getSuggestions?.(node.id) ?? []}
      />
    ),
  };
}

export function createAssertBlockDef(
  getSuggestions?: (nodeId: string) => VariableSuggestion[],
): BlockDefinition {
  return {
    type: "assert",
    minWidth: 280,
    handles: [
      { id: "input", position: "left", type: "target" },
      { id: "output", position: "right", type: "source" },
    ],
    renderInspector: (node, api) => (
      <AssertInspector
        api={api}
        node={node as AssertNode}
        suggestions={getSuggestions?.(node.id) ?? []}
      />
    ),
  };
}

export function createWebhookWaitBlockDef(
  getRuntimeRef?: (nodeId: string) => string | null,
): BlockDefinition {
  return {
    type: "webhookWait",
    minWidth: 280,
    handles: [
      { id: "input", position: "left", type: "target" },
      { id: "output", position: "right", type: "source" },
    ],
    renderInspector: (node, api) => (
      <WebhookWaitInspector
        api={api}
        node={node as WebhookWaitNode}
        runtimeRef={getRuntimeRef?.(node.id) ?? null}
      />
    ),
  };
}

export function createPollBlockDef(
  getSuggestions?: (nodeId: string) => VariableSuggestion[],
): BlockDefinition {
  return {
    type: "poll",
    minWidth: 280,
    handles: [
      { id: "input", position: "left", type: "target" },
      { id: "output", position: "right", type: "source" },
    ],
    renderInspector: (node, api) => (
      <PollInspector
        api={api}
        node={node as PollNode}
        suggestions={getSuggestions?.(node.id) ?? []}
      />
    ),
  };
}
