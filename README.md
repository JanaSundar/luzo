# Luzo

**Design API workflows like a flowchart. Debug them with a live execution timeline.**

Luzo is a developer-centric API playground and pipeline orchestrator for building, running, and debugging multi-step API workflows with deterministic execution and full data ownership.

## How to think about Luzo

> If Postman is for requests, Luzo is for workflows.

Luzo is a workspace where individual API calls are just steps in a larger, state-managed execution loop. It bridges the gap between simple ad-hoc testing and complex system automation.

## Try this in 30 seconds

1. **Clone & Install**:
   ```bash
   pnpm install
   pnpm dev
   ```
2. **Save a Request**: Use the Playground to send a request and save it into a collection from the sidebar collections tab.
3. **Build a Pipeline**: Convert that collection into a pipeline, then pass values between steps with variable references.
4. **Run the Debugger**: Open the pipeline stream view, run the flow, and inspect the execution timeline and per-step request/response details.

---

## Key Features

### Pipeline orchestration

Build workflows, not just isolated calls.

- Pipeline builder with dependency-aware step references like `{{req1.response.body.token}}`
- Stage-aware execution planning that distinguishes sequential dependencies from independent parallel work
- DAG validation so execution order stays explicit and deterministic
- Real-time execution stream that stays coupled to the selected pipeline

### Timeline debugger

Debug with a proper execution timeline instead of a flat log.

- Normalized timeline store backed by Zustand + Immer
- Filterable event list with active, paused, completed, failed, and mock-aware execution states
- Per-step detail pane for request, response, error, timing, and payload metadata
- Resume-friendly debugger shell with persisted execution artifacts

### Collections to pipelines

Turn saved requests into runnable workflows.

- Generate pipelines from Postman JSON, Luzo collections, or stored collections
- Infer step names, dependencies, unresolved variables, and execution order before creation
- Export pipelines and collections back to Postman Collection v2.1 or OpenAPI 3.0
- Preview and adjust the generated flow before opening it in the pipeline builder
- Convert pipelines back into collections when DB-backed collections are enabled

### Debug controller

Step through execution with deterministic control.

- Step-by-step execution with pause/resume controls
- Retry from failure instead of restarting the entire pipeline
- Async-generator driven controller loop for deterministic UI sync
- Parallel stage execution without breaking variable dependency flow

### BYOK and BYODB

Your keys. Your data. Your infrastructure.

- BYOK for AI providers including OpenAI and Groq
- BYODB PostgreSQL persistence via Drizzle ORM
- Local-first behavior when you do not configure external services

### Request scripts and assertions

Execute logic before or after any call in a sandboxed Node `vm` environment.

- Pre-request scripting
- Test assertions with `lz.test()` and `lz.expect()`
- Request/response inspection during debugging

### Reporting and export

Generate AI-assisted reports and export polished PDFs.

- Report configurator for tone, depth, prompt, and signal selection
- PDF export powered by Playwright rendering
- Request breakdowns and performance-oriented report views

### Playground and collections

A faster request/response workflow without losing power.

- Shared JSON viewer with syntax highlighting, line numbers, exact-match search, and smoother response navigation
- Refined request composer, URL bar, tabs, and response stream surfaces inspired by modern API tools
- Variable value previews, better truncation tooltips, and tighter editor behavior across playground inputs
- Postman-style cURL import in the request builder plus Postman/OpenAPI collection import directly inside the playground collections tab
- Save requests and latest responses into DB-backed collections when connected
- Import collection variables from Postman and server variables from OpenAPI as reusable environments
- Auto-save collection-linked requests efficiently with debounced writes and local cache updates

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) (v9+)
- [Playwright Chromium](https://playwright.dev/) (`pnpm exec playwright install chromium`)

### Local setup

```bash
pnpm install
pnpm exec playwright install chromium
pnpm dev
```

### Configuration

Luzo works instantly with local storage. For the full persistence and AI experience, add these to your `.env.local`:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/luzo"
OPENAI_API_KEY="..."
GROQ_API_KEY="..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Variable chaining

Access values from previous steps using `{{stepAlias.path}}`.
Example: `{{auth.response.body.token}}`

Common step aliases:
- `req1`, `req2`, ...
- step ids
- unique step-name aliases like `login.response.body.access_token`

---

## Architecture

### System overview

Luzo uses a dual-layer architecture: a high-interaction frontend for orchestration and a proxy backend to bypass CORS and manage sensitive script execution.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Luzo App Shell                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│   Navigation: [ Playground ]  [ Pipelines ]  [ Settings ]                    │
├──────────────────────────────────────┬──────────────────────────────────────┤
│           Request Builder            │           Response Viewer            │
├──────────────────────────────────────┼──────────────────────────────────────┤
│  • Method & URL                      │  • Status & Performance              │
│  • Headers & Params                  │  • Pretty JSON / Raw                 │
│  • Auth & Environments               │  • Headers & Size                    │
│  • Interceptors (Scripts)            │  • Test Assertions                   │
│  • Body (Form-data / JSON)           │  • AI Execution Report               │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

### Execution flow

```
[Validation] ──▶ [Execution Planner] ──▶ [Debug Controller] ──▶ [Timeline Store]
 (DAG Check)       (Stage Layout)          (Loop Management)      (UI Sync)
```

---

## Technical Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **UI**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **State**: [Zustand](https://github.com/pmndrs/zustand) + [Immer](https://immerjs.github.io/immer/)
- **Data fetching**: [TanStack Query](https://tanstack.com/query/latest)
- **Database**: [Drizzle ORM](https://orm.drizzle.team/) + [PostgreSQL](https://www.postgresql.org/)
- **Testing**: [Vitest](https://vitest.dev/) + Testing Library
- **PDF Engine**: [Playwright](https://playwright.dev/)
- **Linting/Formatting**: [Oxc](https://oxc.rs/) (Oxlint, Oxfmt)

---

## Project Structure

```
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
```

---

## Scripts

| Command       | Description              |
| ------------- | ------------------------ |
| `pnpm dev`    | Start dev server         |
| `pnpm build`  | Build for production     |
| `pnpm start`  | Start production server  |
| `pnpm build:start` | Build and start      |
| `pnpm test`   | Run Vitest suite         |
| `pnpm test:watch` | Watch test suite      |
| `pnpm test:coverage` | Coverage run       |
| `pnpm lint`   | Fast linting with Oxlint |
| `pnpm lint:fix` | Auto-fix lint issues   |
| `pnpm format` | Formatting with Oxfmt    |

## Why Luzo?

Luzo was built for developers who want workflow tooling that feels closer to engineering than dashboard automation.

1. **Ownership**: Your data can live in your DB, and your provider keys stay in your environment.
2. **Execution control**: No black boxes. Step through every stage of a pipeline.
3. **Fast iteration**: Modern frontend tooling, focused state management, and a debugger-first UI.
