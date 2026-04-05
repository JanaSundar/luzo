# Luzo

**Design API workflows like a flowchart. Debug them with a live execution timeline.**

Luzo is a developer and QA-centric API workflow builder for designing, running, and debugging multi-step API workflows with deterministic execution and full data ownership.

> If Postman is for requests, Luzo is for workflows.

---

## Screenshots

<div align="center">
  <img src="apps/luzo/public/screenshots/playground.jpg" width="100%" alt="Playground" />
  <p><em>API Playground with synchronized collections and environments</em></p>

  <br />

  <img src="apps/luzo/public/screenshots/pipeline_builder.jpg" width="100%" alt="Pipeline Builder" />
  <p><em>Dependency-aware Pipeline Builder with DAG and flow graph layout</em></p>

  <br />

  <img src="apps/luzo/public/screenshots/execution_timeline.jpg" width="100%" alt="Execution Timeline" />
  <p><em>Real-time Execution Timeline with per-step inspection and state tracking</em></p>

  <br />

  <img src="apps/luzo/public/screenshots/ai_configurator.jpg" width="100%" alt="AI Configurator" />
  <p><em>AI-driven Report Configurator with tone, depth, and signal selection</em></p>
</div>

---

## Features

### Pipeline orchestration

- Pipeline builder with dependency-aware step references — `{{req1.response.body.token}}`
- Stage-aware execution planning that distinguishes sequential dependencies from independent parallel work
- DAG validation so execution order stays explicit and deterministic
- Flow graph mode with conditional branching and edge-state routing
- Real-time execution stream that stays coupled to the selected pipeline

### Live execution timeline

- Step-by-step execution with pause/resume controls
- Retry from failure instead of restarting the entire pipeline
- Async-generator driven controller for deterministic UI sync
- Filterable event list with active, paused, completed, failed, and mock-aware states
- Per-step detail pane for request, response, error, timing, and payload metadata

### Collections to pipelines

- Generate pipelines from Postman JSON, Luzo collections, or stored collections
- Infer step names, dependencies, unresolved variables, and execution order before creation
- Preview and adjust the generated flow before opening it in the pipeline builder
- Export pipelines and collections to Postman Collection v2.1 or OpenAPI 3.0
- Convert pipelines back into collections when DB-backed persistence is enabled

### Request scripts and assertions

- Pre-request scripting in a sandboxed Node `vm` environment
- Test assertions with `lz.test()` and `lz.expect()`
- Per-step request/response inspection during debugging

### Reports and export

- AI report configurator for tone, depth, prompt, and signal selection
- PDF export powered by Playwright rendering
- Request breakdown and performance-oriented report views

### Playground and collections

- JSON viewer with syntax highlighting, line numbers, and exact-match search
- cURL import in the request builder; Postman/OpenAPI import in the collections tab
- Import collection variables from Postman and server variables from OpenAPI as reusable environments
- Auto-save collection-linked requests with debounced writes and local cache updates
- Save requests and latest responses into DB-backed collections when connected

### BYOK and BYODB

- BYOK for AI providers: OpenAI and Groq
- BYODB PostgreSQL persistence via Drizzle ORM
- Local-first fallback when external services are not configured

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) v9+
- [Playwright Chromium](https://playwright.dev/) (required for PDF export)

### Install and run

```bash
git clone https://github.com/your-username/luzo.git
cd luzo
pnpm install
pnpm exec playwright install chromium
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Luzo runs fully local out of the box. For PostgreSQL persistence and AI features, create `apps/luzo/.env.local`:

```bash
# Optional — enables DB-backed collections and pipelines
DATABASE_URL="postgresql://user:password@localhost:5432/luzo"

# Optional — enables AI report generation
OPENAI_API_KEY="sk-..."
GROQ_API_KEY="gsk_..."

NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Variable chaining

Reference output from earlier steps in any request field using `{{alias.path}}`:

```
{{auth.response.body.access_token}}
{{req1.response.headers.x-request-id}}
{{login.response.status}}
```

Step aliases are auto-generated from step names (`req1`, `req2`, …) or can be customized per step.

---

## Architecture

### Execution model

Luzo uses an **async-generator pipeline executor** with **topological queue scheduling**:

```
[DAG Validation] ──▶ [Stage Planner] ──▶ [Debug Controller] ──▶ [Timeline Store]
  (cycle check)       (Kahn's algo)       (generator loop)        (Zustand/Immer)
```

- The generator yields typed events (`step_ready`, `stream_chunk`, `step_complete`, `error`)
- The debug controller iterates the generator and applies a pure reducer on each yield
- Parallel stages are executed with `Promise.all` via a server-side batch API route (bypasses CORS)
- Flow graphs use an edge-state machine (`pending → activated | skipped`) for conditional routing

### App shell

```
┌──────────────────────────────────────────────────────────────────────┐
│  Navigation: [ Playground ]  [ Pipelines ]  [ Settings ]             │
├─────────────────────────────┬────────────────────────────────────────┤
│       Request Builder       │           Response Viewer              │
├─────────────────────────────┼────────────────────────────────────────┤
│  • Method & URL             │  • Status & Timing                     │
│  • Headers, Params, Auth    │  • Pretty JSON / Raw                   │
│  • Body (JSON / Form-data)  │  • Test Assertions                     │
│  • Scripts & Environments   │  • AI Execution Report                 │
└─────────────────────────────┴────────────────────────────────────────┘
```

### Product model

## Monorepo structure

```
luzo/
├── apps/
│   └── luzo/                  # Next.js application
│       ├── src/
│       │   ├── app/           # App Router pages and API routes
│       │   ├── components/    # Feature components
│       │   ├── lib/
│       │   │   ├── pipeline/  # Execution engine, DAG planner, timeline
│       │   │   ├── stores/    # Zustand stores
│       │   │   └── db/        # Drizzle ORM + PostgreSQL
│       │   └── types/         # Shared TypeScript types
│       └── prisma/            # Prisma schema
└── packages/
    ├── flow-builder/          # React flow graph editor (canvas, nodes, inspector)
    ├── flow-core/             # Graph algorithms, serialization, validation
    └── flow-types/            # Shared TypeScript types for flow graphs
```

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| UI | [React 19](https://react.dev/) + [Tailwind CSS 4](https://tailwindcss.com/) |
| Components | [shadcn/ui](https://ui.shadcn.com/) + [Base UI](https://base-ui.com/) |
| State | [Zustand 5](https://github.com/pmndrs/zustand) + [Immer](https://immerjs.github.io/immer/) |
| Data fetching | [TanStack Query v5](https://tanstack.com/query/latest) |
| Database | [Drizzle ORM](https://orm.drizzle.team/) + [PostgreSQL](https://www.postgresql.org/) |
| AI | [Vercel AI SDK](https://sdk.vercel.ai/) (OpenAI, Groq) |
| Editor | [CodeMirror 6](https://codemirror.net/) |
| PDF | [Playwright](https://playwright.dev/) (Chromium headless) |
| Testing | [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) |
| Linting | [Oxlint](https://oxc.rs/) + [Oxfmt](https://oxc.rs/) |

---

## Scripts

Run all commands from the workspace root:

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server with Turbopack |
| `pnpm build` | Build all packages and the app |
| `pnpm start` | Start the production server |
| `pnpm build:start` | Build then start |
| `pnpm test` | Run the Vitest suite |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm lint` | Lint with Oxlint |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm format` | Format with Oxfmt |
| `pnpm check:file-length` | Check for oversized files |

---

## Why Luzo?

1. **Ownership** — Your data lives in your own DB; your API keys stay in your environment.
2. **Execution control** — No black boxes. Step through every stage with a proper debugger.
3. **Fast iteration** — Modern tooling, focused state management, and a debugger-first UI.

---

## License

[MIT](LICENSE) © Janarthanan
