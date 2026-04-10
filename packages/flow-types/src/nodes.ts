export interface FlowPosition {
  x: number;
  y: number;
}

export interface FlowSize {
  width: number;
  height: number;
}

export interface BaseNode {
  id: string;
  type: string;
  position: FlowPosition;
  selected?: boolean;
  dragging?: boolean;
  width?: number;
  height?: number;
}

export interface StartNode extends BaseNode {
  type: "start";
  data: { label?: string };
}

export interface RequestNode extends BaseNode {
  type: "request";
  data: {
    requestId: string;
    label?: string;
    method?: string;
    url?: string;
    authType?: string;
    bodyType?: "none" | "json" | "form-data" | "x-www-form-urlencoded" | "raw";
    headerCount?: number;
    paramCount?: number;
    executionState?: "idle" | "running" | "success" | "error";
  };
}

export interface ListNode extends BaseNode {
  type: "list";
  data: { label?: string; itemCount?: number };
}

export interface DisplayNode extends BaseNode {
  type: "display";
  data: { label?: string; chartType?: "line" | "bar" | "table" };
}

export interface TextNode extends BaseNode {
  type: "text";
  data: { content: string; label?: string };
}

export interface GroupNode extends BaseNode {
  type: "group";
  data: { label?: string; color?: string };
}

export interface AINode extends BaseNode {
  type: "ai";
  data: {
    label?: string;
    provider?: "openai" | "groq" | "openrouter";
    model?: string;
    prompt?: string;
    systemPrompt?: string;
  };
}

export interface IfNode extends BaseNode {
  type: "if";
  data: {
    label?: string;
    expression?: string;
    /** Whether a false-branch edge is present. */
    hasFalseBranch?: boolean;
  };
}

export interface DelayNode extends BaseNode {
  type: "delay";
  data: {
    label?: string;
    /** Duration to wait in milliseconds. */
    durationMs: number;
  };
}

export interface EndNode extends BaseNode {
  type: "end";
  data: { label?: string };
}

// Workflow control and utility nodes

export interface ForEachNode extends BaseNode {
  type: "forEach";
  data: {
    label?: string;
    /** Dot-path to the array variable to iterate, e.g. "req1.response.body.items" */
    collectionPath: string;
    /** Optional JS expression evaluated per item. Receives `item` and `index`. */
    mapExpression?: string;
  };
}

export interface TransformNode extends BaseNode {
  type: "transform";
  data: {
    label?: string;
    /** JS expression that receives runtime variables and returns a value. */
    script: string;
  };
}

export interface LogNode extends BaseNode {
  type: "log";
  data: {
    label?: string;
    /** Message template — supports {{variable}} interpolation. */
    message: string;
  };
}

export interface AssertNode extends BaseNode {
  type: "assert";
  data: {
    label?: string;
    /** JS expression that must evaluate to truthy — halts pipeline on false. */
    expression: string;
    /** Custom failure message shown in the timeline. */
    message?: string;
  };
}

export interface WebhookWaitNode extends BaseNode {
  type: "webhookWait";
  data: {
    label?: string;
    /** Milliseconds to wait before timing out. Default: 300_000 (5 min). */
    timeoutMs?: number;
    /** Optional correlation key for matching incoming webhook events. */
    correlationKey?: string;
  };
}

export interface PollNode extends BaseNode {
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

export interface SwitchCase {
  id: string;
  label: string;
  expression: string;
  isDefault: boolean;
}

export interface SwitchNode extends BaseNode {
  type: "switch";
  data: {
    label?: string;
    cases: SwitchCase[];
  };
}

export type FlowNode =
  | AINode
  | StartNode
  | RequestNode
  | IfNode
  | DelayNode
  | EndNode
  | ForEachNode
  | TransformNode
  | LogNode
  | AssertNode
  | WebhookWaitNode
  | PollNode
  | SwitchNode
  | ListNode
  | DisplayNode
  | TextNode
  | GroupNode;
