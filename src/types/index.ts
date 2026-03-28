import type { PipelineGenerationMetadata } from "./pipeline-generation";
import type { FlowDocument } from "./workflow";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

export type AiProvider = "openai" | "groq" | "openrouter";

export type AuthType = "none" | "api-key" | "basic" | "bearer" | "oauth2" | "aws-sigv4";

export interface AuthConfig {
  type: AuthType;
  apiKey?: { key: string; value: string; placement: "header" | "query" };
  basic?: { username: string; password: string };
  bearer?: { token: string };
  oauth2?: { accessToken: string };
  awsSigv4?: { accessKey: string; secretKey: string; region: string; service: string };
}

export interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
}

export interface EnvironmentVariable extends KeyValuePair {
  description?: string;
  secret?: boolean;
}

/** Form data field - text or file. File ref is not persisted. */
export interface FormDataField {
  key: string;
  type: "text" | "file";
  value: string;
  enabled: boolean;
  /** Client-only: File object for file type. Not persisted. */
  file?: File;
  /** Persisted: file name for display when file is selected */
  fileName?: string;
}

export interface TestRule {
  id: string;
  target: "status_code" | "json_property" | "response_time" | "header" | "body_contains";
  property?: string; // e.g. "data.user.id" or "Content-Type"
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "less_than"
    | "greater_than"
    | "exists"
    | "not_exists";
  value?: string;
}

export interface PreRequestRule {
  id: string;
  type: "set_env_var" | "set_header" | "delete_header" | "clear_env_var";
  key: string;
  value?: string;
}

export interface PostRequestRule {
  id: string;
  type:
    | "set_env_var"
    | "clear_env_var"
    | "set_response_header"
    | "delete_response_header"
    | "set_response_body";
  key: string;
  value?: string;
}

export interface ApiRequest {
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: string | null;
  bodyType: "none" | "json" | "form-data" | "x-www-form-urlencoded" | "raw";
  /** Form data fields (text + file). Used when bodyType is form-data. */
  formDataFields?: FormDataField[];
  auth: AuthConfig;

  /** Editor types for request scripts (visual or raw) */
  preRequestEditorType?: "visual" | "raw";
  postRequestEditorType?: "visual" | "raw";
  testEditorType?: "visual" | "raw";

  /** Visual rules for pre-request */
  preRequestRules?: PreRequestRule[];
  /** Visual rules for post-request */
  postRequestRules?: PostRequestRule[];
  /** Visual rules for tests */
  testRules?: TestRule[];

  /** Pre-request script (Luzo API). Runs before request. */
  preRequestScript?: string;
  /** Post-request script. Runs after the response and before tests. */
  postRequestScript?: string;
  /** Test script. Runs after response for assertions. */
  testScript?: string;
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export interface PreRequestResult {
  logs: string[];
  error: string | null;
  durationMs: number;
}

export interface PostRequestResult extends PreRequestResult {}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
  /** Test results when testScript is used */
  testResults?: TestResult[];
  /** Pre-request script result when preRequestScript is used */
  preRequestResult?: PreRequestResult;
  /** Post-request script result when postRequestScript is used */
  postRequestResult?: PostRequestResult;
}

export interface EnvironmentSource {
  collectionId?: string;
  kind: "manual" | "openapi" | "postman";
  ref?: string;
}

export interface Environment {
  id: string;
  name: string;
  source?: EnvironmentSource;
  variables: EnvironmentVariable[];
}

export interface SavedRequest {
  id: string;
  name: string;
  request: ApiRequest;
  response?: ApiResponse | null;
  collectionId?: string;
  persistResponse?: boolean;
  autoSave?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  requests: SavedRequest[];
  createdAt: string;
  updatedAt: string;
}

export type PipelineView = "builder" | "stream" | "ai-config" | "report";
export type NarrativeTone = "technical" | "executive" | "compliance";

export interface AINarrativeConfig {
  tone: NarrativeTone;
  prompt: string;
  enabled: boolean;
  length?: "short" | "medium" | "long";
  promptOverrides?: Partial<Record<NarrativeTone, string>>;
}

export interface MockConfig {
  enabled: boolean;
  statusCode: number;
  body: string;
  latencyMs: number;
}

export interface PipelineRequestSource {
  collectionId?: string;
  requestId?: string;
  requestName?: string;
  mode: "detached" | "linked" | "new";
}

export interface PipelineStep extends ApiRequest {
  id: string;
  name: string;
  mockConfig?: MockConfig;
  requestSource?: PipelineRequestSource;
}

export interface Pipeline {
  id: string;
  generationMetadata?: PipelineGenerationMetadata;
  name: string;
  description?: string;
  flowDocument?: FlowDocument;
  steps: PipelineStep[];
  narrativeConfig: AINarrativeConfig;
  createdAt: string;
  updatedAt: string;
}

export interface StepExecutionResult extends ApiResponse {
  stepId: string;
  stepName: string;
  method: string;
  url: string;
}

export interface PipelineExecutionResult {
  pipelineId: string;
  startTime: string;
  endTime?: string;
  results: StepExecutionResult[];
  status: "running" | "completed" | "failed";
  error?: string;
  aiNarrative?: string;
}

export type ResponseLayout = "vertical" | "horizontal";

export * from "./pipeline-generation";
export * from "./code-generation";
export * from "./worker-results";
export * from "./workflow";
export * from "./workers";
