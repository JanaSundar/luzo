# Luzo — Architecture

> **AI-readable architecture document.**
> This file describes the full structure, patterns, and design decisions of the Luzo codebase.
> It is intended to be consumed by both humans and AI coding assistants to provide accurate context.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Monorepo Layout](#3-monorepo-layout)
4. [Application Directory Structure](#4-application-directory-structure)
5. [Core Features](#5-core-features)
6. [Data Flow](#6-data-flow)
7. [State Management](#7-state-management)
8. [Database Schema](#8-database-schema)
9. [External Services](#9-external-services)
10. [Build & Deployment](#10-build--deployment)
11. [Key Design Patterns](#11-key-design-patterns)
12. [Security Model](#12-security-model)
13. [Testing](#13-testing)

---

## 1. Project Overview

**Luzo** is a developer-first API workflow orchestration tool — a cross between Postman and a visual DAG executor.

It solves the "workflow layer" problem for developers and QA engineers who need to:

- Chain multiple API requests where each step's output feeds the next
- Execute independent requests in parallel and dependent ones in sequence
- Debug execution step-by-step with a live timeline (not just flat logs)
- Retry from failure without re-running an entire pipeline
- Keep data and API keys in their own infrastructure (**BYOK / BYODB model**)

### Core User Journey

```
Playground → Collections → Pipeline Builder → Execution Planner → Debug Controller → Live Timeline
```

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Turbopack in dev |
| UI | React 19 | Concurrent features |
| Styling | Tailwind CSS 4 | CSS variables, no config file |
| Component Library | shadcn/ui (base-nova) + Base UI | |
| State Management | Zustand 5 + Immer | Slice-based store composition |
| Client Persistence | IndexedDB via `idb-keyval` + Zustand persist | Local-first, no server required |
| Server Persistence | Drizzle ORM + `postgres` driver | Optional PostgreSQL |
| Data Fetching | TanStack Query 5 | Server-side queries |
| Code Editor | CodeMirror 6 + `@uiw/react-codemirror` | JSON / script editing |
| Rich Text | Tiptap 3 | Report editing |
| AI / LLM | Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/groq`) | |
| Script Sandbox | Node.js `vm` module | Server-side pre/post-request scripts |
| HTTP Execution | `undici` | Bypasses CORS via server proxy |
| PDF Generation | Puppeteer Core + `@sparticuz/chromium-min` | Serverless-compatible |
| Logging | Pino | Structured JSON |
| Monorepo | pnpm workspaces | |
| Build | TypeScript project references | Incremental builds |
| Linting / Formatting | Oxlint + Oxfmt (Oxc toolchain) | Replaces ESLint + Prettier |
| Testing | Vitest 4 + Testing Library + happy-dom | |
| Webhooks | `svix` | Webhook verification |
| Animation | Motion (Framer Motion) | |
| cURL Import | `curlconverter` | |
| Utilities | `remeda`, `lodash-es`, `fuse.js`, `nanoid`, `zod` | |
| Worker Communication | `comlink` | Type-safe Web Worker RPC |
| Retry / Polling | `p-retry` | |

---

## 3. Monorepo Layout

```
luzo/                              # Root
├── apps/
│   └── luzo/                      # @luzo/app — Next.js application
├── packages/
│   ├── flow-types/                # @luzo/flow-types — pure TS canvas types
│   ├── flow-core/                 # @luzo/flow-core — framework-agnostic DAG logic
│   └── flow-builder/              # @luzo/flow-builder — React canvas component
├── scripts/
│   └── check-file-length.cjs      # Enforces ≤250 lines on canvas/flow-editor src
├── public/                        # Static assets, WASM binaries
│   ├── tree-sitter.wasm
│   └── tree-sitter-bash.wasm
└── vercel.json                    # Deployment config
```

### Package Responsibilities

| Package | Purpose |
|---|---|
| `@luzo/flow-types` | Low-level canvas primitives: `FlowNode`, `FlowEdge`, `Handle`, `Registry`, `Viewport`. Pure TypeScript, no React. |
| `@luzo/flow-core` | Framework-agnostic DAG engine: topological sort, cycle detection, stage derivation, flow validation and serialization. |
| `@luzo/flow-builder` | React canvas component with pan/zoom, node rendering, edge rendering, inspector panel, context menus, and a Zustand editor store. |
| `@luzo/app` | The full Next.js application: playground, pipeline builder, collections, AI reports, server proxy, database layer. |

---

## 4. Application Directory Structure

```
apps/luzo/src/
├── app/                           # Next.js App Router
│   ├── page.tsx                   # Playground (root route, SSR disabled)
│   ├── layout.tsx                 # Root layout: AppShell + Providers
│   ├── providers.tsx              # QueryClient, ThemeProvider, Toaster
│   ├── actions/                   # Next.js Server Actions
│   │   ├── ai-report.ts           #   generateAIReport, refineReportSection
│   │   ├── api-tests.ts           #   executeRequest (main HTTP proxy action)
│   │   ├── code-generator.ts      #   AI code generation
│   │   └── pipeline.ts            #   generatePipelineNarrative
│   ├── api/                       # Route Handlers
│   │   ├── execute/               #   POST /api/execute — proxies outbound HTTP
│   │   ├── db/                    #   /api/db/{connect,collections,pipelines,query,schema,templates}
│   │   ├── export/pdf/            #   POST /api/export/pdf — Puppeteer PDF
│   │   ├── health/                #   GET /api/health
│   │   ├── providers/             #   /api/providers/[provider]/{models,validate}
│   │   └── webhooks/              #   /api/webhooks/[token], /api/webhooks/waits
│   ├── pipelines/                 # /pipelines page
│   └── settings/                  # /settings page
│
├── components/                    # React UI components, co-located by domain
│   ├── layout/                    #   AppShell wrappers
│   ├── pipelines/                 #   Builder, Debugger, Report, Timeline UI
│   ├── playground/                #   RequestBuilder, ResponseViewer, Sidebar
│   ├── collections/               #   Collection dialogs, import/export
│   ├── settings/                  #   Settings form
│   ├── common/                    #   Shared cross-domain components
│   └── ui/                        #   shadcn/ui primitives
│
├── features/                      # Domain logic (thin React wrappers or pure logic)
│   ├── pipeline/                  #   Execution engine: generator-executor, debug-controller, polling, webhooks
│   ├── pipelines/                 #   Pipeline Zustand store, lineage selectors, hooks
│   ├── workflow/                  #   Compiler, DAG analysis, normalizer, validation
│   ├── flow-editor/               #   FlowBuilder integration, block definitions, domain adapter
│   ├── collection-to-pipeline/    #   Convert collections → pipelines
│   ├── collections/               #   Collection CRUD API
│   ├── exporters/                 #   Postman + OpenAPI export
│   ├── history/                   #   Request history
│   ├── reports/                   #   Report editing, export (JSON/MD/PDF)
│   ├── settings/                  #   Provider API key validation, model fetching
│   ├── shell/                     #   AppShell, ThemeProvider
│   ├── templates/                 #   Workflow templates
│   └── timeline/                  #   Timeline index builders + selectors
│
├── stores/                        # Zustand store definitions and re-exports
│   ├── usePlaygroundStore.ts
│   ├── usePipelineStore.ts
│   ├── usePipelineExecutionStore.ts
│   ├── useTimelineStore.ts
│   ├── useEnvironmentStore.ts
│   ├── useSettingsStore.ts
│   ├── useHistoryStore.ts
│   ├── usePipelineArtifactsStore.ts
│   ├── usePipelineDebugStore.ts
│   └── useReportStore.ts
│
├── server/                        # Server-only modules (never imported on client)
│   ├── db/                        #   Drizzle client, schema, runtime, repositories
│   ├── ai/                        #   AI narrative generation helpers
│   ├── http/                      #   Script execution (vm sandbox), request config
│   └── export/                    #   PDF service helpers
│
├── services/
│   └── storage/                   #   IndexedDB adapters for Zustand persist
│
├── workers/                       # Web Workers (Comlink-based)
│   ├── timeline/                  #   timeline-worker.ts
│   ├── analysis/                  #   analysis-worker.ts
│   ├── graph/                     #   graph-worker.ts
│   ├── json/                      #   json-worker.ts
│   ├── import/                    #   import-worker.ts
│   └── client/                    #   Comlink client wrappers for each worker
│
├── types/                         # App-wide TypeScript types
│   ├── index.ts                   #   Pipeline, ApiRequest, Collection, ...
│   ├── workflow.ts                #   WorkflowDefinition, FlowDocument, CompiledPipelinePlan
│   ├── timeline-event.ts
│   ├── pipeline-runtime.ts
│   └── pipeline-debug.ts
│
├── config/                        # AI provider model registry
├── utils/                         # Pure utility functions
│   ├── variables.ts               #   {{variable}} template interpolation
│   ├── security.ts                #   URL validation, header sanitization
│   ├── rate-limit.ts
│   └── logger.ts                  #   Pino singleton
│
└── __tests__/                     # Vitest test suite
    ├── unit/
    ├── workflow/
    ├── timeline/
    └── components/
```

---

## 5. Core Features

### 5.1 Playground

**Location:** `src/app/page.tsx`, `src/components/playground/`

- Resizable split pane (Request / Response), horizontal or vertical layout
- `RequestBuilder`: method, URL, headers, params, body (JSON / form-data / raw / URL-encoded), auth (none / bearer / basic / API key / OAuth2 / AWS SigV4)
- `ResponseViewer`: status, timing, size, formatted JSON, binary preview (images/PDFs as base64)
- `PlaygroundSidebar`: Collections, Environments, History
- Pre-request, post-request, and test scripting — visual rule-builder and raw JS modes
- State persisted in `usePlaygroundStore` (IndexedDB); auth credentials stripped before write

### 5.2 Collections & Environments

**Location:** `src/features/collections/`, `src/stores/useEnvironmentStore.ts`

- Named collections containing `SavedRequest` objects
- Import formats: Postman Collection v2.1, cURL, OpenAPI 3.0, Luzo JSON
- Export formats: Postman Collection v2.1, OpenAPI 3.0
- Environments with key-value variable pairs; `secret` flag prevents persistence of sensitive values
- Environment variables injected into all `{{variable}}` template slots at runtime

### 5.3 Pipeline Builder

**Location:** `src/app/pipelines/`, `src/components/pipelines/`, `src/features/pipelines/`

- Visual canvas built on `@luzo/flow-builder` (custom pan-zoom canvas, no ReactFlow dependency)
- **Node types:** `start`, `request`, `condition`, `subflow`, `delay`, `transform`
- **Edge semantics:** `control` (sequential), `success`, `failure`, `true`, `false`
- Variable chaining with `{{stepAlias.path}}` syntax (e.g. `{{req1.response.body.token}}`)
- Positional aliases (`req1`, `req2`, ...) auto-generated; slug-based aliases from step names as additional refs
- Inline dependency hints: highlights unresolved refs, forward references, and invalid paths
- Per-step lineage: shows upstream producers and downstream consumers of each variable
- **Mock mode:** override response status, body, and latency per step for offline testing
- Collection→Pipeline converter with inference of step names, dependencies, and order

### 5.4 DAG Execution Engine

**Location:** `src/features/pipeline/`, `src/features/workflow/`

Compilation pipeline:
```
Pipeline (flat steps)
  → buildWorkflowBundleFromPipeline()    [features/workflow/pipeline-adapters.ts]
    → FlowDocument + WorkflowDefinition + RequestRegistry
  → expandSubflows()                      [features/workflow/compiler/expandSubflows.ts]
  → validateWorkflowDag()                 [features/workflow/validation/]
    → buildAdjacency → detectCycle → topoSort → deriveStages
  → compileExecutionPlan()                [features/workflow/compiler/compileExecutionPlan.ts]
    → CompiledPipelinePlan { nodes, stages, aliases, adjacency }
```

Runtime:
- `createPipelineGenerator` — async generator that drives execution step-by-step, yields `PipelineExecutionEvent`s
- Parallel stage execution: independent nodes in the same stage run via `Promise.all`
- Condition nodes: evaluate visual rule sets or raw JS expression; route `true` / `false` branches
- Subflow nodes: must be expanded at compile time (unexpanded = compile error)

### 5.5 Debug Controller

**Location:** `src/features/pipeline/debug-controller.ts`

`createDebugController()` returns `{ start, step, resume, stop, retry }`:

| Method | Behavior |
|---|---|
| `start` | Compiles plan, initializes state, begins async-generator loop |
| `step` | Advances one event until `step_ready`, `step_failed`, or terminal event |
| `resume` | Switches to `auto` mode, runs the full loop uninterrupted |
| `retry` | Re-runs from the last failed step index |
| `stop` | Triggers `masterAbort` AbortController, halts all in-flight requests |

Backed by `usePipelineExecutionStore` and `useTimelineStore`.

### 5.6 Live Timeline

**Location:** `src/stores/useTimelineStore.ts`, `src/features/timeline/`, `src/features/pipeline/timeline/`

- Zustand store holding `Map<eventId, TimelineEvent>` + ordered ID list
- Two population paths:
  1. Via `timeline-worker.ts` — full sync on resume/load from artifacts
  2. Via `applyExecutionEvent` — inline during live execution
- `TimelineIndex` maps events by id, stepId, nodeId, status, branchId, attempt, outcome, lineage path
- Execution artifacts persisted via `usePipelineArtifactsStore` to allow re-opening after page refresh

### 5.7 Variable Lineage Analysis

**Location:** `src/features/workflow/analysis/`

- `analyzeVariables` — scans all steps for `{{ref}}` tokens, maps them to source steps
- `buildLineageIndex` — builds a full directed graph: which steps produce which variables, which consume them
- Runs in `analysis-worker.ts` (Web Worker) to avoid blocking the main thread
- Surfaced in: builder inspector, request editor, execution timeline debugger

### 5.8 Request Scripting

**Location:** `src/server/http/scripts.ts`, `src/server/http/script-helpers.ts`

Scripts run inside `/api/execute` using Node.js `vm.runInNewContext`. Exposes the `lz` API (also aliased as `pm` for Postman compatibility):

| API | Purpose |
|---|---|
| `lz.request` | Mutate URL, headers, body before sending |
| `lz.response` | Inspect/mutate status, headers, body after response |
| `lz.env` / `lz.variables` | Get/set environment variables |
| `lz.test(name, fn)` + `lz.expect` | Test assertions (Chai) |

- `lodash-es` available in test scripts as `_`
- Script console output captured and returned in response metadata

### 5.9 AI Reports

**Location:** `src/app/actions/ai-report.ts`, `src/features/reports/`, `src/server/ai/`

- `generateAIReport` server action: execution context + config → structured JSON report via LLM (streaming)
- `buildFallbackStructuredReport`: offline fallback when no API key is configured
- `refineReportSection` and `editReportSelection`: inline AI editing
- **Report tones:** `technical`, `executive`, `compliance`
- **Report lengths:** `short` (2K tokens), `medium` (4K tokens), `long` (8K tokens)
- PDF export via `puppeteer-core` + `@sparticuz/chromium-min` (serverless-compatible Chromium)

### 5.10 Polling & Webhook Wait

**Location:** `src/features/pipeline/polling-retry-runner.ts`, `src/features/pipeline/webhook-wait-client.ts`

- `PollingPolicy`: retry-based polling with `p-retry`, configurable interval, max attempts, timeout, success/failure rule sets
- `WebhookWaitPolicy`: after a request succeeds, pause execution until a correlated inbound webhook arrives
- Webhook endpoints: `POST /api/webhooks/[token]` receives inbound; `GET /api/webhooks/waits` manages wait records
- Requires PostgreSQL (records stored in `luzo_webhook_waits` + `luzo_webhook_events` tables)

---

## 6. Data Flow

### Request Execution (Playground)

```
User fills RequestBuilder
  → usePlaygroundStore (Zustand + IndexedDB)
  → executeRequest() server action
    → POST /api/execute
      → validateUrl() + checkRateLimit()
      → runPreRequestScript()    [Node vm sandbox]
      → undici.fetch(targetUrl)  [actual outbound HTTP]
      → runPostRequestScript()   [Node vm sandbox]
      → runTestScript()          [Node vm sandbox]
      → returns { status, headers, body, time, size, testResults, ... }
  → useExecutionStore.setActiveResponse()
  → ResponseViewer renders result
```

### Pipeline Execution

```
User clicks Run
  → usePipelinePageController.handleRun()
    → createDebugController().start(pipeline, envVars, options)
      → compileExecutionPlan({ workflow, registry })
          → expandSubflows()
          → validateWorkflowDag()    [topo-sort, cycle-detect, stage-derive]
          → CompiledPipelinePlan { nodes, stages, order, adjacency }
      → createPipelineGenerator(pipeline, envVars, options)  ← async generator
          → for each stage:
              → parallel: executeParallelStage() via Promise.all
              → sequential: executeStepGenerator() one at a time
              → each step: executeRequest() server action
              → processCompletion() → promoteReadyNodes()
              → yields PipelineExecutionEvent
      → for each yielded event:
          → usePipelineExecutionStore.addSnapshot()
          → useTimelineStore.applyExecutionEvent()
          → TimelinePanel re-renders live
```

### Variable Resolution

```
step.url = "https://api.example.com/{{req1.response.body.token}}"
  → resolveTemplate(template, runtimeVariables, envVariables)
    → VARIABLE_REGEX extracts ref: "req1.response.body.token"
    → getByPath(runtimeVariables, "req1.response.body.token")
    → returns resolved string (or keeps original if unresolved)
```

Resolution priority: `variableOverrides → runtimeVariables → envVariables → keep as-is`

### State Persistence

```
Zustand + persist middleware
  → createIndexedDbStorage({ dbName: "luzo-*" })
    → idb-keyval (IndexedDB)     [local-first, always available]

Optional PostgreSQL:
  User provides DATABASE_URL in Settings
    → POST /api/db/connect → testConnection() → initSchema()
    → Collections/Pipelines CRUD via /api/db/{collections,pipelines}
    → Drizzle ORM (luzo_collections, luzo_requests, luzo_pipelines, luzo_templates)
```

---

## 7. State Management

Zustand 5 with Immer middleware. Stores are persisted to IndexedDB via a custom storage adapter.

### Store Map

| Store | Persisted | Purpose |
|---|---|---|
| `usePlaygroundStore` | IndexedDB | Active request state, request/response history |
| `usePipelineStore` | IndexedDB | Pipeline definitions, step configs, graph nodes/edges |
| `usePipelineExecutionStore` | Memory | Live execution snapshots during a run |
| `useTimelineStore` | Memory | Live `TimelineEvent` map during execution |
| `useEnvironmentStore` | IndexedDB | Environment sets and variables (secrets stripped) |
| `useSettingsStore` | IndexedDB | AI provider keys, DB URL, theme, preferences |
| `useHistoryStore` | IndexedDB | Past request executions |
| `usePipelineArtifactsStore` | IndexedDB | Serialized execution artifacts for re-opening |
| `usePipelineDebugStore` | Memory | Debug controller state (breakpoints, current step) |
| `useReportStore` | Memory | Active report content during editing |

### Slice Composition

`usePipelineStore` is composed from 5 slices merged in a single `create()` call:
- `pipelineSlice` — pipeline CRUD
- `stepSlice` — step CRUD within a pipeline
- `nodeSlice` — canvas node positions/metadata
- `subflowSlice` — subflow management
- `executionSlice` — execution configuration

---

## 8. Database Schema

Six PostgreSQL tables. Schema initialized at runtime via `CREATE TABLE IF NOT EXISTS` (no migration files). Without a database, all data is stored in IndexedDB.

```sql
-- Named groupings of API requests
luzo_collections
  id           TEXT PRIMARY KEY
  name         TEXT NOT NULL
  description  TEXT
  created_at   TIMESTAMPTZ
  updated_at   TIMESTAMPTZ

-- Saved API requests (full definition as JSONB)
luzo_requests
  id             TEXT PRIMARY KEY
  name           TEXT NOT NULL
  collection_id  TEXT → luzo_collections(id) ON DELETE CASCADE
  data           JSONB NOT NULL   -- Full ApiRequest object
  created_at     TIMESTAMPTZ
  updated_at     TIMESTAMPTZ

-- Saved pipeline configurations
luzo_pipelines
  id          TEXT PRIMARY KEY
  name        TEXT NOT NULL
  data        JSONB NOT NULL   -- Full Pipeline object
  created_at  TIMESTAMPTZ
  updated_at  TIMESTAMPTZ

-- Pre-built pipeline templates
luzo_templates
  id           TEXT PRIMARY KEY
  name         TEXT NOT NULL
  description  TEXT
  category     TEXT NOT NULL
  tags         JSONB            -- string[]
  complexity   TEXT NOT NULL
  source_type  TEXT NOT NULL
  data         JSONB NOT NULL
  created_at   TIMESTAMPTZ
  updated_at   TIMESTAMPTZ

-- Pending webhook correlation waits
luzo_webhook_waits
  id                  TEXT PRIMARY KEY
  execution_id        TEXT NOT NULL
  step_id             TEXT NOT NULL
  endpoint_id         TEXT NOT NULL
  correlation_key     TEXT NOT NULL
  correlation_source  TEXT NOT NULL   -- "header" | "query" | "body"
  correlation_field   TEXT NOT NULL
  status              TEXT NOT NULL   -- "waiting" | "matched" | "timeout"
  expires_at          TIMESTAMPTZ NOT NULL
  matched_event_id    TEXT
  verification_mode   TEXT NOT NULL
  verification_secret TEXT
  INDEX (endpoint_id, status, correlation_key)

-- Received inbound webhook payloads
luzo_webhook_events
  id               TEXT PRIMARY KEY
  endpoint_id      TEXT NOT NULL
  delivery_id      TEXT
  correlation_key  TEXT
  headers_redacted JSONB NOT NULL
  payload          JSONB NOT NULL
  signature_status TEXT NOT NULL
  matched_wait_id  TEXT
  received_at      TIMESTAMPTZ
  UNIQUE INDEX (endpoint_id, delivery_id)
```

---

## 9. External Services

| Service | Purpose | Configuration |
|---|---|---|
| OpenAI | AI report generation, pipeline narrative | `OPENAI_API_KEY` env or Settings UI |
| Groq | Fast LLM inference | `GROQ_API_KEY` env or Settings UI |
| OpenRouter | Multi-model routing | API key in Settings UI |
| PostgreSQL | Optional persistent storage | `DATABASE_URL` env or Settings UI |
| Vercel | Deployment platform | `vercel.json` |

### Supported AI Models

| Provider | Models |
|---|---|
| OpenRouter | Claude 3.5 Sonnet, GPT-4o, Gemini 2.0 Flash, **Llama 3.3 70B** (default), DeepSeek R1 |
| OpenAI | GPT-4o, **GPT-4o Mini** (default), GPT-4 Turbo, GPT-3.5 Turbo |
| Groq | **Llama 3.3 70B Versatile** (default), Llama 3.1 8B Instant, Mixtral 8x7B, Gemma 2 9B |

---

## 10. Build & Deployment

### Development

```bash
pnpm dev   # → next dev --turbopack (apps/luzo)
```

### Production Build

```bash
pnpm build   # pnpm -r build
             # packages: tsc -b (TypeScript project references)
             # app: next build
```

### Git Hooks

- **Husky** pre-commit → `lint-staged`
- `lint-staged`: on `*.{ts,tsx}` runs `oxlint --fix` then `oxfmt`

### File Length Enforcement

`scripts/check-file-length.cjs` enforces a hard **250-line limit** on:
- `packages/flow-builder/src`
- `packages/flow-types/src`
- `apps/luzo/src/features/flow-editor`

### Vercel Deployment

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": { "NEXT_PUBLIC_APP_URL": "https://luzoapi.vercel.app" },
  "functions": {
    "apps/luzo/src/app/api/export/pdf/route.ts": { "maxDuration": 60 }
  }
}
```

- PDF export extended to 60s (Puppeteer startup + page render)
- `serverExternalPackages`: `curlconverter`, `puppeteer-core`, `@sparticuz/chromium-min` excluded from bundle (native deps)

---

## 11. Key Design Patterns

### Async-Generator Execution Model

The pipeline executor (`createPipelineGenerator`) is an **async generator** that yields `PipelineExecutionEvent` objects. This allows the debug controller to `await` individual events, enabling true step-by-step debugging without polling. The generator handles both sequential (for-loop) and parallel (`Promise.all` via `executeParallelStage`) stages.

### Local-First with Optional DB Sync

All user data defaults to **IndexedDB** via `idb-keyval` wrapped in a custom Zustand `createJSONStorage` adapter. PostgreSQL is opt-in. Sensitive fields (auth tokens, secret env vars) are stripped before any write.

### BYOK / BYODB Architecture

AI provider keys and database URLs are never hardcoded. They are stored per-user in `useSettingsStore` (IndexedDB) and sent to the server only when needed as runtime inputs to server actions. The Settings page provides a UI for configuring providers and testing DB connections.

### Web Worker Offloading via Comlink

Heavy computations run in dedicated Web Workers:

| Worker | Responsibility |
|---|---|
| `timeline-worker` | Timeline event indexing |
| `analysis-worker` | Variable lineage analysis |
| `graph-worker` | DAG validation |
| `json-worker` | JSON processing |
| `import-worker` | Import parsing |

Each worker has a typed Comlink client in `src/workers/client/`. The `callLatest` pattern drops stale in-flight requests when a newer one arrives.

### Two-Layer Type System

| Layer | Package | Types |
|---|---|---|
| Canvas primitives | `@luzo/flow-types` | `FlowNode`, `FlowEdge`, `Handle`, `Viewport` |
| Execution semantics | `apps/luzo/src/types/workflow.ts` | `WorkflowDefinition`, `CompiledPipelinePlan`, `FlowDocument` |
| Application domain | `apps/luzo/src/types/index.ts` | `Pipeline`, `ApiRequest`, `Collection` |

### Variable Reference System

Templates use `{{alias.path}}` syntax. Three tiers of aliases per step:

1. **Positional:** `req1`, `req2`, ... (always present, order-stable)
2. **Identity:** the step's UUID
3. **Named:** slugified step name (only when unique across all steps)

### Slice-Based Zustand Stores

`usePipelineStore` is composed from 5 independent slices merged in a single `create()` call. This keeps individual files small (≤250 lines) and maintainable while sharing one store context.

---

## 12. Security Model

### `/api/execute` Proxy

All outbound HTTP requests are proxied through the server to bypass browser CORS. The route enforces:

| Control | Detail |
|---|---|
| Rate limiting | IP-based, configurable via `LIMITS` |
| Payload size | 50MB server action limit |
| URL validation | Blocks localhost, private IP ranges (RFC 1918, RFC 4193), validates protocol |
| Header sanitization | `sanitizeHeaders()` removes hop-by-hop headers, forwarded auth, host-override headers |
| Script sandbox | `vm.runInNewContext` with no access to Node.js globals |

### Credential Sanitization

Multiple layers:
- `usePlaygroundStore`: strips bearer tokens, basic auth passwords, API key values before IndexedDB write
- `useEnvironmentStore`: strips `secret`-flagged variable values before persistence
- `/api/execute`: sanitizes request headers before outbound dispatch

### Webhook Verification

Inbound webhooks at `/api/webhooks/[token]` are verified via `svix` signature validation before being matched to pending waits.

---

## 13. Testing

```bash
pnpm test            # vitest run src/__tests__
pnpm test:coverage   # vitest run --coverage (v8 provider)
```

- **Environment:** `happy-dom`
- **Path aliases:** `vite-tsconfig-paths` resolves `@/` in tests
- **Coverage provider:** v8

### Test Suites

| Suite | Location | Coverage |
|---|---|---|
| Unit | `src/__tests__/unit/` | 21 files — utilities, stores, helpers |
| Workflow | `src/__tests__/workflow/` | DAG compiler, canvas flow, analysis |
| Timeline | `src/__tests__/timeline/` | Timeline index builders |
| Components | `src/__tests__/components/` | React component tests |

---

*Last updated: automatically generated from source analysis.*
