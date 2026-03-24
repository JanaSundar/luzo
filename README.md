# Luzo

**Design API workflows like a flowchart. Debug them with a live execution timeline.**

Luzo is a developer and QA-centric API workflow builder for designing, running, and debugging multi-step API workflows with deterministic execution and full data ownership.

Luzo treats API calls as steps in a larger execution graph. It gives you a place to chain requests, pass data between them, inspect execution as it happens, and debug failures without losing the state of the workflow.

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

- run multiple dependent API calls in sequence
- pass values from one request into the next
- understand parallel vs sequential execution
- inspect state while a workflow is running
- retry from a failure without starting over
- keep your data and provider keys in your own infrastructure

Luzo is built for that layer: the workflow layer.

---

## Try this in 30 seconds

1. Install and run the app:
   ```bash
   pnpm install
   pnpm exec playwright install chromium
   pnpm dev

	2.	Send a request in the Playground and save it into a collection.
	3.	Convert that collection into a pipeline.
	4.	Run the pipeline and inspect the live execution timeline step by step.

⸻

## Core features

### Pipeline orchestration

Build workflows, not just isolated calls.
	•	Dependency-aware pipeline builder with step references like {{req1.response.body.token}}
	•	DAG validation to keep execution order explicit and deterministic
	•	Stage-aware planning for sequential dependencies and independent parallel work
	•	Real-time execution stream tied directly to the selected pipeline

### Live execution timeline

Debug with a timeline instead of a flat log.
	•	Inspect execution event by event as the workflow runs
	•	Track active, paused, completed, failed, skipped, and retried states
	•	Open per-step details for request, response, error, timing, and payload metadata
	•	Resume debugging with persisted execution artifacts and timeline state

### Collections to pipelines

Turn saved requests into runnable workflows.
	•	Import from Postman JSON, Luzo collections, or stored collections
	•	Infer step names, dependencies, unresolved variables, and execution order
	•	Preview and adjust the generated flow before opening it in the builder
	•	Export pipelines and collections to Postman Collection v2.1 or OpenAPI 3.0

### Deterministic debug controller

Step through execution with control.
	•	Pause and resume a pipeline run
	•	Retry from failure instead of rerunning the whole workflow
	•	Async-generator based controller loop for deterministic UI synchronization
	•	Parallel stage execution without breaking variable dependency flow

### BYOK and BYODB

Your keys. Your data. Your infrastructure.
	•	Bring your own AI provider keys, including OpenAI and Groq
	•	Persist data in your own PostgreSQL database through Drizzle ORM
	•	Stay local-first when external services are not configured

### Request scripts and assertions

Add logic around any request.
	•	Pre-request scripting in a sandboxed Node vm
	•	Assertions with lz.test() and lz.expect()
	•	Request and response inspection during execution and debugging

### Reports and export

Generate reports from real execution data.
	•	AI-assisted report configurator for tone, depth, prompt, and signal selection
	•	PDF export powered by **Puppeteer**
	•	Request breakdowns and performance-oriented execution summaries

⸻

## Variable chaining

Access values from earlier steps using:

{{stepAlias.path}}

Example:

{{auth.response.body.token}}

Common aliases:
	•	req1, req2, …
	•	step ids
	•	unique step-name aliases such as login.response.body.access_token

⸻

## Architecture

## System overview

Luzo uses a high-interaction frontend for orchestration and a backend layer for managing persistence, sensitive execution paths, and server-side operations like PDF generation and AI execution.

Execution flow

[Validation] ──▶ [Execution Planner] ──▶ [Debug Controller] ──▶ [Timeline Store]
 (DAG Check)       (Stage Layout)          (Loop Management)      (UI Sync)

Product model

[Playground / Collections]
          ↓
 [Pipeline Builder]
          ↓
 [Execution Planner]
          ↓
 [Debug Controller]
          ↓
 [Live Timeline + Step Inspection]


⸻

## Technical stack
	•	Framework: Next.js 16 (App Router)￼
	•	UI: React 19￼
	•	Styling: Tailwind CSS 4￼
	•	State: Zustand￼ + Immer￼
	•	Data fetching: TanStack Query￼
	•	Database: Drizzle ORM￼ + PostgreSQL￼
	•	Testing: Vitest￼ + Testing Library
	•	PDF Engine: Puppeteer￼
	•	Logging: Pino￼
	•	Linting/Formatting: Oxc￼ (Oxlint, Oxfmt)

⸻

## Getting started

### Prerequisites
	•	Node.js￼ v20+
	•	pnpm￼ v9+

### Local setup

```bash
pnpm install
pnpm dev
```

### Configuration

Luzo works with local storage by default. For persistence and AI features, add these to .env.local:

DATABASE_URL="postgresql://user:password@localhost:5432/luzo"
OPENAI_API_KEY="..."
GROQ_API_KEY="..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"


⸻

### Project structure

src/
├── app/
│   ├── api/              # API routes
│   ├── pipelines/        # Pipeline page + controller hooks
│   └── settings/         # Provider / DB configuration
├── components/
│   ├── collections/      # Collection dialogs, import/export helpers
│   ├── pipelines/        # Builder, debugger, reports
│   ├── playground/       # Request composer, collections tab, response viewer
│   └── ui/               # Shared UI primitives
├── lib/
│   ├── pipeline/         # Execution planner, controller, timeline selectors
│   ├── stores/           # Zustand stores
│   └── db/               # Persistence layer
└── src/__tests__/        # Unit and component tests


⸻

### Scripts

Command	Description
pnpm dev	Start dev server
pnpm build	Build for production
pnpm start	Start production server
pnpm build:start	Build and start
pnpm test	Run Vitest suite
pnpm test:watch	Watch tests
pnpm test:coverage	Run coverage
pnpm lint	Lint with Oxlint
pnpm lint:fix	Auto-fix lint issues
pnpm format	Format with Oxfmt


⸻

