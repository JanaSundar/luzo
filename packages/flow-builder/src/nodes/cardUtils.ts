import type { FlowNode } from "@luzo/flow-types";

export function getNodeLabel(node: FlowNode) {
  if ("label" in node.data && typeof node.data.label === "string" && node.data.label.trim()) {
    return node.data.label.trim();
  }

  const type = node.type;
  switch (node.type) {
    case "request":
      return node.data.method ?? "Request";
    case "evaluate":
      return node.data.conditionType === "foreach"
        ? "For each"
        : capitalize(node.data.conditionType);
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
    default:
      return capitalize(type);
  }
}

export function getNodeMinWidth(node: FlowNode, registryMinWidth?: number) {
  if (registryMinWidth) return registryMinWidth;

  switch (node.type) {
    case "start":
      return 164;
    case "group":
      return 228;
    case "request":
      return 312;
    case "display":
      return 286;
    case "evaluate":
      return 304;
    case "list":
    case "text":
      return 280;
    default:
      return 252;
  }
}

export function isBuiltInNodeType(node: FlowNode) {
  return (
    node.type === "display" ||
    node.type === "evaluate" ||
    node.type === "group" ||
    node.type === "list" ||
    node.type === "request" ||
    node.type === "start" ||
    node.type === "text"
  );
}

export function getNodeAccent(node: FlowNode) {
  switch (node.type) {
    case "request":
      return "var(--fb-node-accent-request, #f97316)";
    case "evaluate":
      return "var(--fb-node-accent-evaluate, #64748b)";
    case "display":
      return "var(--fb-node-accent-display, #0f766e)";
    case "list":
      return "var(--fb-node-accent-list, #2563eb)";
    case "text":
      return "var(--fb-node-accent-text, #7c3aed)";
    case "group":
      return "var(--fb-node-accent-group, #94a3b8)";
    case "start":
    default:
      return "var(--fb-node-accent-start, #ef4444)";
  }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
