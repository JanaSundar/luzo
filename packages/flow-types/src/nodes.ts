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

export interface VariableRow {
  id: string;
  name: string;
  sourceNodeId?: string;
  sourceHandleId?: string;
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

export interface EvaluateNode extends BaseNode {
  type: "evaluate";
  data: {
    label?: string;
    conditionType: "if" | "switch" | "foreach";
    expression?: string;
    variables?: VariableRow[];
    hasFalseBranch?: boolean;
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

export type FlowNode =
  | AINode
  | StartNode
  | RequestNode
  | EvaluateNode
  | ListNode
  | DisplayNode
  | TextNode
  | GroupNode;
