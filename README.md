# Luzo

**Design API workflows like a flowchart. Debug them step-by-step.**

Luzo is a developer-centric API playground and pipeline orchestrator. It’s built for building and debugging multi-step API workflows with deterministic execution and full data ownership.

### 🧠 How to think about Luzo

> If Postman is for requests, Luzo is for workflows.

Luzo is a workspace where individual API calls are just steps in a larger, state-managed execution loop. It bridges the gap between simple ad-hoc testing and complex system automation.

---

## ⚡ Try this in 30 seconds

1. **Clone & Install**:
   ```bash
   pnpm install && pnpm dev
   ```
2. **Build a Chain**: Create a `GET /user` step, follow it with a `POST /audit-log`, and bridge the `user.id` between them automatically.
3. **Debug**: Click **Execute**, pause at Step 2, and inspect the live environment state before it finishes.

---

## Preview

![Luzo API Playground Placeholder](https://via.placeholder.com/1200x600?text=Luzo+API+Playground+Interface)
_Minimalist interface for API development and orchestration._

---

## Key Features

### 🚀 Advanced Pipeline Orchestration

**Build workflows, not just calls.**
Design complex API chains where data flows seamlessly between steps. Luzo uses a DAG (Directed Acyclic Graph) approach to ensure your execution logic is always sound.

- Pipeline builder with dependency-aware step references like `{{req1.response.body.token}}`
- Stage-aware execution planning that distinguishes sequential dependencies from independent parallel work
- Real-time execution stream that stays coupled to the currently selected pipeline

### 🔄 Collections to Pipelines

**Turn saved requests into runnable workflows.**

- Generate pipelines from Postman JSON, Luzo collections, or stored collections
- Infer step names, dependencies, unresolved variables, and execution order before creation
- **Export to Industry Standards**: Convert your pipelines and collections back to Postman Collection (v2.1) or OpenAPI (3.0.0) format with full metadata preservation.
- Preview and adjust the generated flow before opening it in the pipeline builder
- Convert pipelines back into collections when DB-backed collections are enabled

### 🛠️ The Debug Controller (Core Engine)

**Debug with an execution stream.**

- **Step-by-Step Execution**: Pause at any stage and inspect exactly what’s happening.
- **Retry from failure, not from scratch**: If a step fails, fix it and resume from that specific point. Luzo automatically rewinds the state for you.
- **Deterministic Yielding**: Powered by a robust AsyncGenerator engine that ensures synchronization between UI and execution.
- **Parallel stage execution**: Independent requests in the same stage can execute together without breaking variable dependency flow.

### 🔐 BYOK & BYODB (Ownership)

**Your keys. Your data. Always.**

- **BYOK (AI Providers)**: Connect your own keys (OpenAI, Groq, OpenRouter). They stay local and are used only for generating your execution reports.
- **BYODB (PostgreSQL)**: Connect your own database using Drizzle ORM. Your collections, history, and secrets stay in your infrastructure.

### 🧪 Luzo Interceptors (Scripts)

**Code-level control over every request.**
Execute logic before or after any call in a sandboxed Node `vm` environment. Use `lz.test()` and `lz.expect()` for assertions that actually matter.

### 📄 High-Fidelity PDF Export
**Pixel-perfect reports for your workflows.**
Generate professional AI-powered reports as PDFs with 100% UI fidelity, powered by a server-side Playwright rendering engine.

### 🎨 Polished Playground Experience
**A cleaner request/response workflow without losing power.**

- Shared JSON viewer with syntax highlighting, line numbers, exact-match search, and smoother response navigation
- Refined request composer, URL bar, tabs, and response stream surfaces inspired by modern API tools
- Variable value previews, better truncation tooltips, and tighter editor behavior across playground inputs
- Postman-style cURL import plus collection import from Postman/OpenAPI with bulk writes for faster saves

### 🤖 AI Report Configuration
**Guide report generation with less friction and fewer tokens.**

- Compact configurator flow for tone, depth, prompt, and signal selection
- Modern report preview layout with improved per-request breakdown styling
- **Dynamic Content**: Add, reorder, and delete custom sections to tailor your narrative.
- More reliable PDF pagination for request breakdowns and export tables

### 🌱 Collections and Environments
**Import context once, reuse it everywhere.**

- Save requests and latest responses into DB-backed collections when connected
- Import collection variables from Postman and server variables from OpenAPI as reusable environments
- Auto-save collection-linked requests efficiently with debounced writes and local cache updates

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) (v9+)
- [Playwright Chromium](https://playwright.dev/) (`pnpm exec playwright install chromium`)

### Configuration

Luzo works instantly with local storage. For the full persistence and AI experience, add these to your `.env.local`:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/luzo"
OPENAI_API_KEY="..."
GROQ_API_KEY="..."
```

---

## Advanced Insights

### Variable Chaining

Access any value from a previous step's response using the `{{stepAlias.path}}` syntax.
_Example:_ `{{auth.response.body.token}}`

Common step aliases:
- `req1`, `req2`, ...
- step ids
- unique step-name aliases like `login.response.body.access_token`

---

## Architecture

### System Overview

Luzo uses a dual-layer architecture: a high-interaction frontend for orchestration and a proxy backend to bypass CORS and manage sensitive script execution.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Luzo App Shell                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  Navigation: [ Playground ]  [ Collections ]  [ Pipelines ]  [ Settings ]   │
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

### Execution Flow

```
[Validation] ──▶ [Generator Executor] ──▶ [Debug Controller] ──▶ [Zustand Store]
 (DAG Check)       (Async Generators)      (Loop Management)      (UI Sync)
```

---

## Technical Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Core Strategy**: [React 19 (Server Components)](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **State**: [Zustand](https://github.com/pmndrs/zustand)
- **Database**: [Drizzle ORM](https://orm.drizzle.team/) + [PostgreSQL](https://www.postgresql.org/)
- **PDF Engine**: [Playwright](https://playwright.dev/)
- **Linting/Formatting**: [Oxc](https://oxc.rs/) (Oxlint, Oxfmt)

---

## Project Structure

```
src/
├── app/
│   ├── actions/          # Server Actions (PDF, API proxy)
│   └── api/              # API routes
├── lib/
│   ├── pipeline/         # Core Engine (Controller, Executor)
│   └── db/               # Persistence layer
└── components/           # UI Component System
```

---

## Scripts

| Command       | Description              |
| ------------- | ------------------------ |
| `pnpm dev`    | Start dev server         |
| `pnpm build`  | Build for production     |
| `pnpm test`   | Run Vitest suite         |
| `pnpm lint`   | Fast linting with Oxlint |
| `pnpm format` | Formatting with Oxfmt    |

## Philosophy: Why Luzo?

Luzo was built for developers who find existing tools too social and not enough "engineering."

1. **Total Autonomy**: Your data lives in your DB. Your keys stay in your environment.
2. **Execution Control**: No black boxes. Step through every byte of your pipeline.
3. **Speed over Bloat**: A minimalist interface built on the fastest tooling available (Next.js Turbopack, Oxc).
