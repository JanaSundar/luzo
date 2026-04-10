import type { FlowEdge, FlowNode } from "@luzo/flow-types";

import type { FlowBlock, FlowConnection } from "./domain/types";

export function toFlowNode(block: FlowBlock, selected = false): FlowNode {
  switch (block.type) {
    case "start":
      return { id: block.id, type: "start", position: block.position, selected, data: block.data };
    case "request":
      return {
        id: block.id,
        type: "request",
        position: block.position,
        selected,
        data: {
          authType: block.data.auth.type,
          bodyType: block.data.bodyType,
          headerCount: block.data.headers.filter((header) => header.enabled && header.key).length,
          label: block.data.name,
          method: block.data.method,
          paramCount: block.data.params.filter((param) => param.enabled && param.key).length,
          requestId: block.id,
          url: block.data.url,
        },
      };
    case "if":
      return {
        id: block.id,
        type: "if",
        position: block.position,
        selected,
        data: block.data,
      };
    case "delay":
      return {
        id: block.id,
        type: "delay",
        position: block.position,
        selected,
        data: block.data,
      };
    case "end":
      return {
        id: block.id,
        type: "end",
        position: block.position,
        selected,
        data: block.data,
      };
    case "ai":
      return {
        id: block.id,
        type: "ai",
        position: block.position,
        selected,
        data: {
          label: block.data.label,
          model: block.data.model,
          prompt: block.data.prompt,
          provider: block.data.provider,
          systemPrompt: block.data.systemPrompt,
        },
      };
    case "list":
      return { id: block.id, type: "list", position: block.position, selected, data: block.data };
    case "display":
      return {
        id: block.id,
        type: "display",
        position: block.position,
        selected,
        data: block.data,
      };
    case "text":
      return { id: block.id, type: "text", position: block.position, selected, data: block.data };
    case "group":
      return { id: block.id, type: "group", position: block.position, selected, data: block.data };
    case "forEach":
      return {
        id: block.id,
        type: "forEach",
        position: block.position,
        selected,
        data: block.data,
      };
    case "transform":
      return {
        id: block.id,
        type: "transform",
        position: block.position,
        selected,
        data: block.data,
      };
    case "log":
      return { id: block.id, type: "log", position: block.position, selected, data: block.data };
    case "assert":
      return {
        id: block.id,
        type: "assert",
        position: block.position,
        selected,
        data: block.data,
      };
    case "webhookWait":
      return {
        id: block.id,
        type: "webhookWait",
        position: block.position,
        selected,
        data: block.data,
      };
    case "poll":
      return {
        id: block.id,
        type: "poll",
        position: block.position,
        selected,
        data: block.data,
      };
    case "switch":
      return {
        id: block.id,
        type: "switch",
        position: block.position,
        selected,
        data: block.data,
      };
  }
}

export function toFlowEdge(connection: FlowConnection, selected = false): FlowEdge {
  return {
    id: connection.id,
    source: connection.sourceBlockId,
    sourceHandle: connection.sourceHandleId,
    target: connection.targetBlockId,
    targetHandle: connection.targetHandleId,
    selected,
    type:
      connection.kind === "variable"
        ? "variable"
        : connection.kind === "conditional"
          ? "conditional"
          : "default",
  };
}
