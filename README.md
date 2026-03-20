# Luzo

**Design API workflows like a flowchart. Debug them like a timeline.**

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

### 🛠️ The Debug Controller (Core Engine)

**Debug like a timeline.**

- **Step-by-Step Execution**: Pause at any stage and inspect exactly what’s happening.
- **Retry from failure, not from scratch**: If a step fails, fix it and resume from that specific point. Luzo automatically rewinds the state for you.
- **Real-time Streaming**: Watch your variables resolve and your logs stream in live.

### 🔐 BYOK & BYODB (Ownership)

**Your keys. Your data. Always.**

- **BYOK (AI Providers)**: Connect your own keys (OpenAI, Groq, OpenRouter). They stay local and are used only for generating your execution reports.
- **BYODB (PostgreSQL)**: Connect your own database. Your collections, history, and secrets stay in your infrastructure.

### 🧪 Luzo Interceptors (Scripts)

**Code-level control over every request.**
Execute logic before or after any call in a sandboxed Node `vm` environment. Use `lz.test()` and `lz.expect()` for assertions that actually matter.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (v8+)

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

### Interceptor Examples

```javascript
// Post-request assertion
lz.test("User was created", () => {
  lz.expect(lz.response.status).to.equal(201);
  lz.expect(lz.response.json().user).to.have.property("id");
});
```

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
[Validation] ──▶ [Generator Executor] ──▶ [State Management]
 (DAG Check)       (Step Yielding)         (Rewind/Retry)
```

---

## Technical Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 4
- **State**: Zustand (+ persist)
- **Database**: Drizzle ORM + PostgreSQL
- **Sandbox**: Node `vm` for Interceptors

---

## Project Structure

```
src/
├── app/
│   ├── actions/          # Server Actions
│   └── api/              # Proxy & DB routes
├── lib/
│   ├── pipeline/         # Core Execution Engine
│   └── db/               # BYODB data layer
└── components/           # Orchestration & Layout UI
```

---

## Scripts

| Command      | Description              |
| ------------ | ------------------------ |
| `pnpm dev`   | Start development server |
| `pnpm build` | Production build         |
| `pnpm test`  | Run test suite           |
| `pnpm lint`  | Lint with Oxlint        |
| `pnpm format`| Format with Oxfmt        |

---

## Philosophy: Why Luzo?

Luzo was built for developers who find existing tools too social and not enough "engineering."

1. **Total Autonomy**: Your data lives in your DB. Your keys stay in your environment.
2. **Execution Control**: No black boxes. Step through every byte of your pipeline.
3. **Speed over Bloat**: A minimalist interface that stays out of your way.
