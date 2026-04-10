import { MODEL_REGISTRY } from "@/config/model-registry";
import { createDefaultRequestName } from "@/features/pipeline/request-names";
import type { AiProvider, PipelineStep } from "@/types";
import type { FlowBlock } from "../domain/types";

const DEFAULT_REQUEST: Omit<PipelineStep, "id" | "name" | "upstreamStepIds"> = {
  auth: { type: "none" },
  body: null,
  bodyType: "none",
  headers: [],
  method: "GET",
  params: [],
  url: "",
};

export function createFlowBlock(
  type: FlowBlock["type"],
  position: { x: number; y: number },
  options: { aiModel?: string; aiProvider?: string; existingRequestNames: string[] },
): FlowBlock {
  const id = crypto.randomUUID();
  const provider = getSafeAiProvider(options.aiProvider);
  const model = options.aiModel || MODEL_REGISTRY[provider].defaultModel;

  switch (type) {
    case "request":
      return {
        id,
        type,
        position,
        data: { ...DEFAULT_REQUEST, name: createDefaultRequestName(options.existingRequestNames) },
      };
    case "if":
      return { id, type, position, data: { expression: "", hasFalseBranch: false, label: "If" } };
    case "delay":
      return { id, type, position, data: { durationMs: 1000, label: "Delay" } };
    case "end":
      return { id, type, position, data: { label: "End" } };
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
          model,
          prompt: "Summarize the previous response.",
          provider,
          systemPrompt: "You are a helpful API workflow assistant.",
        },
      };
    case "text":
      return { id, type, position, data: { content: "Notes", label: "Text" } };
    case "group":
      return { id, type, position, data: { color: "#dbeafe", label: "Group" } };
    case "forEach":
      return { id, type, position, data: { collectionPath: "", label: "For Each" } };
    case "transform":
      return { id, type, position, data: { script: "", label: "Transform" } };
    case "log":
      return { id, type, position, data: { message: "", label: "Log" } };
    case "assert":
      return { id, type, position, data: { expression: "", label: "Assert" } };
    case "webhookWait":
      return { id, type, position, data: { label: "Webhook Wait" } };
    case "poll":
      return { id, type, position, data: { stopCondition: "", label: "Poll" } };
    case "switch":
      return {
        id,
        type,
        position,
        data: {
          label: "Switch",
          cases: [
            { id: "case_0", label: "Case 1", expression: "", isDefault: false },
            { id: "default", label: "Default", expression: "", isDefault: true },
          ],
        },
      };
    case "start":
    default:
      return { id, type: "start", position, data: { label: "Start" } };
  }
}

function getSafeAiProvider(value: string | undefined): AiProvider {
  if (value === "openai" || value === "groq" || value === "openrouter") {
    return value;
  }

  return "openrouter";
}
