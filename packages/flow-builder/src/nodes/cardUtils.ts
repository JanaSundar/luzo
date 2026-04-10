import type { FlowNode } from "@luzo/flow-types";

export function getNodeLabel(node: FlowNode) {
  if ("label" in node.data && typeof node.data.label === "string" && node.data.label.trim()) {
    return node.data.label.trim();
  }

  const type = node.type;
  switch (node.type) {
    case "request":
      return node.data.method ?? "Request";
    case "display":
      return "Display";
    case "group":
      return "Group";
    case "list":
      return "List";
    case "start":
      return "Start";
    case "text":
      return "Text";
    case "forEach":
      return "ForEach";
    case "transform":
      return "Transform";
    case "log":
      return "Log";
    case "assert":
      return "Assert";
    case "webhookWait":
      return "Webhook Wait";
    default:
      return capitalize(type);
  }
}

export function getNodeMinWidth(node: FlowNode, registryMinWidth?: number) {
  if (registryMinWidth) return registryMinWidth;

  switch (node.type) {
    case "start":
      return 164;
    case "end":
      return 220;
    case "group":
      return 228;
    case "delay":
      return 252;
    case "request":
      return 312;
    case "display":
      return 286;
    case "if":
    case "forEach":
    case "assert":
      return 304;
    case "transform":
    case "log":
    case "list":
    case "text":
      return 280;
    case "webhookWait":
      return 280;
    default:
      return 252;
  }
}

export function isBuiltInNodeType(node: FlowNode) {
  return (
    node.type === "display" ||
    node.type === "group" ||
    node.type === "if" ||
    node.type === "delay" ||
    node.type === "end" ||
    node.type === "list" ||
    node.type === "request" ||
    node.type === "start" ||
    node.type === "text" ||
    node.type === "forEach" ||
    node.type === "transform" ||
    node.type === "log" ||
    node.type === "assert" ||
    node.type === "webhookWait" ||
    node.type === "poll" ||
    node.type === "switch"
  );
}

export function getNodeAccent(node: FlowNode) {
  switch (node.type) {
    case "request":
      return "var(--fb-node-accent-request, #f97316)";
    case "if":
      return "var(--fb-node-accent-if, #10b981)";
    case "delay":
      return "var(--fb-node-accent-delay, #0284c7)";
    case "end":
      return "var(--fb-node-accent-end, #94a3b8)";
    case "display":
      return "var(--fb-node-accent-display, #0f766e)";
    case "list":
      return "var(--fb-node-accent-list, #2563eb)";
    case "text":
      return "var(--fb-node-accent-text, #7c3aed)";
    case "group":
      return "var(--fb-node-accent-group, #94a3b8)";
    case "forEach":
      return "var(--fb-node-accent-forEach, #8b5cf6)";
    case "transform":
      return "var(--fb-node-accent-transform, #06b6d4)";
    case "log":
      return "var(--fb-node-accent-log, #6b7280)";
    case "assert":
      return "var(--fb-node-accent-assert, #f59e0b)";
    case "webhookWait":
      return "var(--fb-node-accent-webhookWait, #3b82f6)";
    case "poll":
      return "var(--fb-node-accent-poll, #db2777)";
    case "switch":
      return "var(--fb-node-accent-switch, #10b981)";
    case "start":
    default:
      return "var(--fb-node-accent-start, #ef4444)";
  }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
