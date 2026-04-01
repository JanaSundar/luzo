# Luzo

**Design API workflows like a flowchart. Debug them with a live execution timeline.**

Luzo is a developer and QA-centric API workflow builder for designing, running, and debugging multi-step API workflows with deterministic execution and full data ownership.

Luzo treats API calls as steps in a larger execution graph. It gives you a place to chain requests, pass data between them, inspect execution as it happens, and debug failures without losing the state of the workflow.

Recent additions include variable lineage visibility across the builder and debugger, inline dependency diagnostics in request editing, and runtime lineage inspection inside the execution timeline.

---

## Screenshots

<p align="center">
  <img src="public/screenshots/playground.jpeg" width="100%" alt="Playground" />
  <br />
  <em>Modern API Playground with synchronized collections and environments</em>
</p>

<p align="center">
  <img src="public/screenshots/pipeline_builder.jpeg" width="100%" alt="Pipeline Builder" />
  <br />
  <em>Dependency-aware Pipeline Builder with DAG-based execution planning</em>
</p>

<p align="center">
  <img src="public/screenshots/execution_timeline.jpeg" width="100%" alt="Execution Timeline" />
  <br />
  <em>Live Execution Timeline with per-step inspection and state tracking</em>
</p>

<p align="center">
  <img src="public/screenshots/ai_configurator.jpeg" width="100%" alt="AI Configurator" />
  <br />
  <em>AI Report Configurator with tone, depth, and signal selection</em>
</p>

---

## Why Luzo exists

Most API tools are great at sending individual requests.

They are less helpful when you need to:

- Run multiple dependent API calls in sequence
- Pass values from one request into the next
- Understand parallel vs sequential execution
- Inspect state while a workflow is running
- Retry from a failure without starting over
- Keep your data and provider keys in your own infrastructure

Luzo is built for that layer: the workflow layer.

---

## Try this in 30 seconds

```bash
pnpm install
pnpm dev
```

1. Send a request in the Playground and save it into a collection.
2. Convert that collection into a pipeline.
3. Run the pipeline and inspect the live execution timeline step by step.

---

## Core features

### Pipeline orchestration

Build workflows, not just isolated calls.

- Dependency-aware pipeline builder with step references like `{{req1.response.body.token}}`
- Reorder-safe positional aliases so `req1`, `req2`, and related references stay correct when steps move
- Variable lineage analysis that shows which upstream step produced a value and which downstream steps consume it
- Request inspector lineage view with incoming references, downstream consumers, and unresolved dependency warnings
- Inline dependency hints in request editing for headers, auth, and body fields that consume upstream variables
- DAG validation to keep execution order explicit and deterministic
- Stage-aware planning for sequential dependencies and independent parallel work
- Per-request success and failure routing from the pipeline inspector
- Explicit success and failure routes take precedence over fallback sequential control edges
- Mock-mode request editing for response status, latency, and payload testing inside pipelines
- Real-time execution stream tied directly to the selected pipeline

### Live execution timeline

Debug with a timeline instead of a flat log.

- Inspect execution event by event as the workflow runs
- Track active, paused, completed, failed, skipped, and retried states
- Open per-step details for request, response, error, timing, and payload metadata
- Inspect a dedicated lineage tab for each executed request to see referenced variables, resolved runtime values, and passed-through request values
- Reveal sensitive lineage values on demand in the debugger instead of exposing them by default
- Resume debugging with persisted execution artifacts and timeline state
- Retry from the Response Stream page using the run's original mode, including debug-originated runs

### Dependency visibility

Understand data flow without digging through raw payloads.

- Trace a variable reference back to the exact request and response path that produced it
- See unresolved aliases, invalid paths, and forward references before execution
- Surface upstream and downstream dependency counts directly in the builder
- Reuse the same lineage analysis in the builder inspector, request editor, and execution debugger

### Collections to pipelines

Turn saved requests into runnable workflows.

- Import from Postman JSON, Luzo collections, or stored collections
- Infer step names, dependencies, unresolved variables, and execution order
- Preview and adjust the generated flow before opening it in the builder
- Export pipelines and collections to Postman Collection v2.1 or OpenAPI 3.0

### Deterministic debug controller

Step through execution with control.

- Pause and resume a pipeline run
- Retry from failure instead of rerunning the whole workflow
- Preserve the original run mode on retry, so debug runs retry in debug even after Continue
- Async-generator based controller loop for deterministic UI synchronization
- Parallel stage execution without breaking variable dependency flow

### Reuse foundations

Prepare workflows for reusable building blocks without changing execution semantics.

- Workflow types now include subflow nodes and pinned subflow metadata
- The compiler currently guards unexpanded subflow nodes to keep runtime behavior deterministic
- This groundwork keeps the flat execution plan intact while preparing for reusable subflows later

### BYOK and BYODB

Your keys. Your data. Your infrastructure.

- Bring your own AI provider keys (OpenAI, Groq, OpenRouter)
- Persist data in your own PostgreSQL database through Drizzle ORM
- Stay local-first when external services are not configured

### Request scripts and assertions

Add logic around any request.

- Pre-request scripting in a sandboxed Node vm
- Post-request scripting before assertions run
- Assertions with `lz.test()` and `lz.expect()`
- Request and response inspection during execution and debugging
- Environment mutation and response shaping during scripted execution

### Reports and export

Generate reports from real execution data.

- AI-assisted report configurator for tone, depth, prompt, and signal selection
- PDF export powered by Puppeteer
- Request breakdowns and performance-oriented execution summaries

---

## Variable chaining

Access values from earlier steps using:

```
{{stepAlias.path}}
```

Example:

```
{{auth.response.body.token}}
```

Common aliases:

- `req1`, `req2`, … (auto-generated)
- Step IDs
- Named aliases such as `login.response.body.access_token`

---

## Architecture

Luzo uses a high-interaction frontend for orchestration and a thin backend layer for persistence, sensitive execution paths, and server-side operations like PDF generation and AI calls.

### Execution flow

```
[Validation] ──▶ [Execution Planner] ──▶ [Debug Controller] ──▶ [Timeline Store]
 (DAG Check)       (Stage Layout)          (Loop Management)      (UI Sync)
```

### Product model

```
[Playground / Collections]
          ↓
 [Pipeline Builder]
          ↓
 [Execution Planner]
          ↓
 [Debug Controller]
          ↓
 [Live Timeline + Step Inspection]
```

---

## Technical stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 |
| Styling | Tailwind CSS 4 |
| State | Zustand + Immer |
| Data fetching | TanStack Query |
| Database | Drizzle ORM + PostgreSQL |
| Testing | Vitest + Testing Library |
| PDF Engine | Puppeteer |
| Logging | Pino |
| Linting / Formatting | Oxc (Oxlint, Oxfmt) |

---

## Getting started

### Prerequisites

- Node.js v20+
- pnpm v9+

### Local setup

```bash
pnpm install
pnpm dev
```

### Configuration

Luzo works with local storage by default. For persistence and AI features, add these to `.env.local`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/luzo"
OPENAI_API_KEY="..."
GROQ_API_KEY="..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Project structure

```
src/
├── app/
│   ├── actions/          # Server actions (API tests, AI, reports)
│   ├── api/              # API route handlers
│   ├── pipelines/        # Pipeline builder page
│   └── settings/         # Provider / DB configuration page
├── components/
│   ├── collections/      # Collection dialogs, import/export helpers
│   ├── layout/           # Shell, sidebar, theme provider
│   ├── pipelines/        # Builder, debugger, report UI
│   ├── playground/       # Request composer, response viewer
│   └── ui/               # Shared UI primitives (shadcn/ui)
├── features/
│   ├── collection-to-pipeline/  # Collection → pipeline conversion
│   ├── collections/             # Collection management logic
│   ├── exporters/               # Postman / OpenAPI export
│   ├── history/                 # Request history
│   ├── immer/                   # Immer middleware setup
│   ├── json-view/               # JSON viewer feature
│   ├── pipeline/                # Execution planner + DAG controller
│   ├── reports/                 # Report generation logic
│   ├── settings/                # Provider settings logic
│   ├── timeline/                # Timeline index + selectors
│   └── workflow/                # Workflow orchestration
├── hooks/                # Shared React hooks
├── services/
│   ├── db/               # Drizzle ORM persistence layer
│   ├── http/             # HTTP client utilities
│   ├── server/           # Server-side service helpers
│   └── storage/          # Client-side storage adapters
├── stores/               # Zustand stores (playground, pipeline, timeline, …)
├── types/                # Shared TypeScript types
├── utils/                # Pure utility functions
├── workers/              # Web Worker clients (timeline, analysis, JSON processing, …)
└── __tests__/            # Unit and component tests (Vitest)
```

---

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm build:start` | Build and start |
| `pnpm test` | Run Vitest suite |
| `pnpm test:watch` | Watch tests |
| `pnpm test:coverage` | Run coverage report |
| `pnpm lint` | Lint with Oxlint |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm format` | Format with Oxfmt |
