import type { AiProvider, PipelineStep } from "@/types";

export interface FlowViewportState {
  x: number;
  y: number;
  scale: number;
}

export interface FlowBlockBase {
  id: string;
  position: { x: number; y: number };
}

export interface StartBlock extends FlowBlockBase {
  type: "start";
  data: { label?: string };
}

export interface RequestBlock extends FlowBlockBase {
  type: "request";
  data: Omit<PipelineStep, "id" | "upstreamStepIds">;
}

export interface EvaluateBlock extends FlowBlockBase {
  type: "evaluate";
  data: {
    label?: string;
    conditionType: "if" | "switch" | "foreach";
    expression?: string;
    variables?: Array<{
      id: string;
      name: string;
      sourceBlockId?: string;
      sourceHandleId?: string;
    }>;
    hasFalseBranch?: boolean;
  };
}

export interface ListBlock extends FlowBlockBase {
  type: "list";
  data: { label?: string; itemCount?: number };
}

export interface DisplayBlock extends FlowBlockBase {
  type: "display";
  data: { label?: string; chartType?: "line" | "bar" | "table" };
}

export interface TextBlock extends FlowBlockBase {
  type: "text";
  data: { label?: string; content: string };
}

export interface GroupBlock extends FlowBlockBase {
  type: "group";
  data: { label?: string; color?: string };
}

export interface AIBlock extends FlowBlockBase {
  type: "ai";
  data: {
    label?: string;
    provider?: AiProvider;
    model?: string;
    prompt: string;
    systemPrompt?: string;
  };
}

export type FlowBlock =
  | AIBlock
  | DisplayBlock
  | EvaluateBlock
  | GroupBlock
  | ListBlock
  | RequestBlock
  | StartBlock
  | TextBlock;

export interface FlowConnection {
  id: string;
  sourceBlockId: string;
  targetBlockId: string;
  sourceHandleId?: string;
  targetHandleId?: string;
  kind?: "control" | "variable" | "conditional";
}

export interface FlowDocument {
  version: 1;
  blocks: FlowBlock[];
  connections: FlowConnection[];
  viewport?: FlowViewportState;
}
