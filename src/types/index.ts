export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

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

  /** Editor types for pre-request and tests (visual or raw) */
  preRequestEditorType?: "visual" | "raw";
  testEditorType?: "visual" | "raw";

  /** Visual rules for pre-request */
  preRequestRules?: PreRequestRule[];
  /** Visual rules for tests */
  testRules?: TestRule[];

  /** Pre-request script (Postman/Requestly style). Runs before request. */
  preRequestScript?: string;
  /** Test script. Runs after response for assertions. */
  testScript?: string;
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
  /** Test results when testScript is used */
  testResults?: TestResult[];
}

export interface Environment {
  id: string;
  name: string;
  variables: KeyValuePair[];
}

export interface SavedRequest {
  id: string;
  name: string;
  request: ApiRequest;
  collectionId?: string;
  createdAt: string;
}

export interface Collection {
  id: string;
  name: string;
  requests: SavedRequest[];
  createdAt: string;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  metadata?: {
    model?: string;
    tokens?: number;
    cost?: number;
  };
}

export interface Conversation {
  id: string;
  title?: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

export type AiProvider = "openrouter" | "groq" | "openai";

export interface AiModelConfig {
  provider: AiProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
}

export interface ProviderModel {
  id: string;
  name: string;
  contextWindow?: number;
  capabilities?: string[];
}

export type ResponseLayout = "vertical" | "horizontal";

export interface UserSettings {
  theme: "light" | "dark" | "system";
  aiConfig: AiModelConfig;
  apiKeys: Record<AiProvider, string>;
}

export interface AutomationStep {
  id: string;
  type: "request";
  name: string;
  method: string;
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: string | null;
  bodyType: "none" | "json" | "form-data" | "x-www-form-urlencoded" | "raw";
  testScript?: string;
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
    responseTime: number;
  } | null;
  timestamp: number;
}

export interface AutomationSequence {
  id: string;
  name: string;
  steps: AutomationStep[];
  createdAt: number;
}

export interface CodeGenerationOptions {
  language:
    | "curl"
    | "ansible"
    | "c"
    | "cfml"
    | "clojure"
    | "csharp"
    | "dart"
    | "elixir"
    | "go"
    | "har"
    | "http"
    | "httpie"
    | "java"
    | "java-httpurlconnection"
    | "java-jsoup"
    | "java-okhttp"
    | "javascript"
    | "javascript-jquery"
    | "javascript-xhr"
    | "typescript"
    | "json"
    | "julia"
    | "kotlin"
    | "lua"
    | "matlab"
    | "node"
    | "node-http"
    | "node-axios"
    | "node-got"
    | "node-ky"
    | "node-request"
    | "node-superagent"
    | "objc"
    | "ocaml"
    | "perl"
    | "php"
    | "php-guzzle"
    | "php-requests"
    | "powershell"
    | "powershell-webrequest"
    | "python"
    | "python-http"
    | "r"
    | "r-httr2"
    | "ruby"
    | "ruby-httparty"
    | "rust"
    | "swift"
    | "wget";
}
