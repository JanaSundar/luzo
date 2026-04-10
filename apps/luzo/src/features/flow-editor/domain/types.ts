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

export interface IfBlock extends FlowBlockBase {
  type: "if";
  data: {
    label?: string;
    expression?: string;
    hasFalseBranch?: boolean;
  };
}

export interface DelayBlock extends FlowBlockBase {
  type: "delay";
  data: {
    label?: string;
    /** Duration to wait in milliseconds. */
    durationMs: number;
  };
}

export interface EndBlock extends FlowBlockBase {
  type: "end";
  data: { label?: string };
}

export interface ForEachBlock extends FlowBlockBase {
  type: "forEach";
  data: {
    label?: string;
    collectionPath: string;
    mapExpression?: string;
  };
}

export interface TransformBlock extends FlowBlockBase {
  type: "transform";
  data: { label?: string; script: string };
}

export interface LogBlock extends FlowBlockBase {
  type: "log";
  data: { label?: string; message: string };
}

export interface AssertBlock extends FlowBlockBase {
  type: "assert";
  data: { label?: string; expression: string; message?: string };
}

export interface WebhookWaitBlock extends FlowBlockBase {
  type: "webhookWait";
  data: { label?: string; timeoutMs?: number; correlationKey?: string };
}

export interface PollBlock extends FlowBlockBase {
  type: "poll";
  data: {
    label?: string;
    /** JS expression evaluated against runtime variables — must return truthy to stop. */
    stopCondition: string;
    /** Milliseconds between poll attempts. Default: 2000. */
    intervalMs?: number;
    /** Maximum number of attempts before failing. Default: 10. */
    maxAttempts?: number;
  };
}

export interface SwitchCaseData {
  id: string;
  label: string;
  expression: string;
  isDefault: boolean;
}

export interface SwitchBlock extends FlowBlockBase {
  type: "switch";
  data: {
    label?: string;
    cases: SwitchCaseData[];
  };
}

export type FlowBlock =
  | AIBlock
  | DelayBlock
  | DisplayBlock
  | EndBlock
  | ForEachBlock
  | TransformBlock
  | LogBlock
  | AssertBlock
  | WebhookWaitBlock
  | PollBlock
  | SwitchBlock
  | GroupBlock
  | IfBlock
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
