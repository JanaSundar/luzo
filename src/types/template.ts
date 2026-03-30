import type { Pipeline } from "./index";

export type TemplateSourceType = "builtin" | "user";
export type TemplateComplexity = "starter" | "intermediate" | "advanced";

export interface TemplateInputField {
  key: string;
  label: string;
  description?: string;
  defaultValue?: string;
  placeholder?: string;
  required: boolean;
  secret?: boolean;
}

export interface TemplateAssumption {
  label: string;
  value: string;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  complexity: TemplateComplexity;
  sourceType: TemplateSourceType;
  pipelineDefinition: Pipeline;
  inputSchema: TemplateInputField[];
  sampleOutputs?: string[];
  assumptions?: TemplateAssumption[];
  createdAt: string;
  updatedAt: string;
}

export type UserTemplateRecord = TemplateDefinition & {
  sourceType: "user";
};
