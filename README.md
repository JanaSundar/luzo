# Luzo – API Playground

An API testing and development playground with pre-request and test scripts, form-data support, code generation, and multi-step pipelines. AI (OpenAI, OpenRouter, Groq) is used only for pipeline report generation—turning execution results into structured documents. Connect your own PostgreSQL for collections.

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to use the API playground.

### Dealing with CORS (how this app avoids it)

Browsers enforce CORS on **frontend → API** calls. This playground avoids those issues by **never calling third‑party APIs directly from the browser**:

- The browser only talks to **your Next.js app origin**:
  - `RequestBuilder` sends non–form-data requests via the `executeRequest` server action.
  - Form-data and file uploads are sent to the local `/api/execute` route.
- The Next.js server then calls your target API using **server-side `fetch` (via `undici`)**:
  - Because these are **server-to-server** requests, browser CORS does not apply.

To make sure you don’t run into CORS problems:

- **Always** send requests through this playground (click **Send** in the UI), instead of calling your API directly from client-side code.
- Point your requests at the real API URL (e.g. `https://api.yourservice.com/...`) in the URL field – the playground will proxy it from the server.
- If your API still blocks the request, check for:
  - IP allowlists that don’t include your dev machine / server.
  - Extra headers like `Origin` or `Referer` that your backend rejects.
  - Authentication (make sure you configure Bearer/API key/Basic Auth in the **Auth** tab).

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm test` | Run tests |
| `pnpm lint` | Lint with Biome |
| `pnpm lint:fix` | Fix lint issues (Biome lint --write) |
| `pnpm format` | Format code (Biome format --write) |
| `pnpm biome check --write .` | Lint, format, and organize imports |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           App Shell (Layout)                              │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Header (nav: Playground, Collections, Pipelines, Settings)          │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Main Content (page.tsx)                                            │  │
│  │  ┌─────────────────────┐  ┌─────────────────────────────────────┐ │  │
│  │  │ Request Panel       │  │ Response Panel                       │ │  │
│  │  │ - RequestBuilder    │  │ - ResponseViewer                     │ │  │
│  │  │ - EnvironmentSelector│  │ - JsonColorized                      │ │  │
│  │  │ - CodeGenerator     │  │ - Test results                       │ │  │
│  │  └─────────────────────┘  └─────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Implementation Flow

### 1. Request Execution Flow

```
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│  RequestBuilder  │────▶│  Execute Request    │────▶│  Response Display    │
│  (User config)   │     │  (Server/API)       │     │  (ResponseViewer)    │
└──────────────────┘     └─────────────────────┘     └──────────────────────┘
```

#### 1.1 Non–Form-Data Requests (JSON, Raw, URL-Encoded)

```
User clicks Send
       │
       ▼
RequestBuilder.send()
       │
       ├── getActiveEnvironmentVariables()  ◀── useEnvironmentStore
       │
       ▼
executeRequest(request, envVars)  ◀── Server Action (api-tests.ts)
       │
       ├── interpolateVariables() on url, headers, params
       ├── applyAuth() → Bearer/Basic/API-Key
       ├── runPreRequestScript() if preRequestScript set
       │      └── lz.request, lz.env (Luzo API)
       │
       ▼
executeWithAxios()  ◀── lib/http/client.ts
       │
       ├── buildAxiosConfig() → method, url, headers, body
       ├── axios(config) → HTTP request
       ├── runTestScript() if testScript set
       │      └── lz.response, lz.test(), lz.expect()
       │
       ▼
ApiResponse { status, headers, body, time, size, testResults? }
       │
       ▼
setPlaygroundResponse() → useExecutionStore
       │
       ▼
ResponseViewer renders (status, headers, body, tests)
```

#### 1.2 Form-Data Requests (with optional files)

```
User clicks Send (bodyType === "form-data")
       │
       ▼
RequestBuilder builds FormData
       │
       ├── __config: { method, url, headers, params, auth, envVariables,
       │               preRequestScript?, testScript? }
       ├── Form fields: key → value (text) or key → File (file)
       │
       ▼
fetch("/api/execute", { method: "POST", body: formData })
       │
       ▼
POST /api/execute  ◀── app/api/execute/route.ts
       │
       ├── Parse FormData, extract __config
       ├── interpolateVariables on url, params, headers
       ├── applyAuth()
       ├── runPreRequestScript() if set
       ├── axios({ method, url, headers, data: bodyFormData })
       ├── runTestScript() if set
       │
       ▼
Response.json({ status, headers, body, time, size, testResults? })
       │
       ▼
setPlaygroundResponse() → useExecutionStore → ResponseViewer
```

### 2. State Management Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     usePlaygroundStore (Zustand + persist)                │
├─────────────────────────────────────────────────────────────────────────┤
│  request: ApiRequest                                                    │
│    - method, url, headers, params, body, bodyType, formDataFields       │
│  responseLayout: ResponseLayout                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                     useExecutionStore (Zustand + persist)                 │
├─────────────────────────────────────────────────────────────────────────┤
│  activeRawResponse: ApiResponse | null                                  │
│  isLoading: boolean                                                     │
│  results: Record<stepId, ExecutionResult> (pipeline execution)           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                     useEnvironmentStore (Zustand + persist)              │
├─────────────────────────────────────────────────────────────────────────┤
│  environments: Environment[]                                            │
│  activeEnvironmentId: string                                            │
│  getActiveEnvironmentVariables(): Record<string, string>                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                     useHistoryStore (Zustand + persist)                  │
├─────────────────────────────────────────────────────────────────────────┤
│  history: SavedRequest[] (Last 100 executions, local IndexedDB)         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                     useSettingsStore (Zustand + persist)                  │
├─────────────────────────────────────────────────────────────────────────┤
│  providers: Record<AiProvider, ProviderConfig> (OpenAI, OpenRouter, Groq)  │
│  dbUrl, dbStatus, dbSchemaReady (BYODB PostgreSQL)                       │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │  Collections & SavedRequests via /api/db/collections
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Database (BYODB – Bring Your Own DB)                  │
├─────────────────────────────────────────────────────────────────────────┤
│  User-provided PostgreSQL URL. Schema: collections, saved_requests     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3. Variable Interpolation Flow

```
Environment variables: { baseUrl: "https://api.example.com" }
       │
       ▼
Request: url = "{{baseUrl}}/users"
       │
       ▼
interpolateVariables(url, envVars)
       │
       ▼
"https://api.example.com/users"
```

Used in: url, headers, params, auth tokens.

### 4. Response Display Flow

```
ApiResponse.body (string)
       │
       ├── isJson? → tryFormatJson() → displayBody (indented)
       │
       ▼
JsonColorized(displayBody, highlight?)
       │
       ├── tokenize() → keys, strings, numbers, booleans, null, punctuation, whitespace
       ├── Sorcerer theme (dark) / readable (light)
       ├── highlightText() if search → <mark> on matches
       │
       ▼
Rendered with syntax highlighting + search highlights
       │
       ▼
Match count shown next to search input
```

### 5. Code Generation Flow

```
RequestBuilder request
       │
       ▼
CodeGenerator (popover)
       │
       ├── Language: curl, JavaScript, TypeScript, Python, Go, Java, C#
       ├── generateCode(request, { language })
       │
       ▼
lib/utils/code-generator.ts
       │
       ├── buildHeaders(), buildUrl()
       ├── Form-data: FormData / multipart per language
       ├── JSON/Raw: body string
       │
       ▼
Copy to clipboard
```

### 6. Pre-Request & Test Scripts (Luzo Interceptors)

```javascript
Pre-Request Script (runs before request)
─────────────────────────────────────────
  lz.request.url = "https://..."
  lz.request.headers.upsert("X-Custom", "value")
  lz.env.set("token", "abc123")
  lz.variables.set("ts", Date.now())

Test Script (runs after response)
─────────────────────────────────
  lz.test("Status is 200", function() {
    lz.expect(lz.response.status).to.equal(200);
  });
  lz.test("Has success", function() {
    const json = lz.response.json();
    lz.expect(json).to.have.property("success");
  });
```

Executed in Node `vm` sandbox. `lz` object exposed per script type.

---

## Project Structure

```
src/
├── app/
│   ├── actions/
│   │   ├── api-tests.ts      # executeRequest server action
│   │   ├── code-generator.ts
│   │   └── ai-report.ts
│   ├── api/
│   │   ├── execute/route.ts  # Form-data proxy (server-side fetch via undici)
│   │   ├── health/route.ts
│   │   ├── db/
│   │   │   ├── connect/route.ts   # Test DB connection, init schema
│   │   │   ├── collections/route.ts
│   │   │   ├── query/route.ts
│   │   │   └── schema/route.ts
│   │   └── providers/
│   │       ├── [provider]/validate/route.ts
│   │       ├── [provider]/models/route.ts
│   │       └── custom/
│   ├── page.tsx              # Playground (Request + Response panels)
│   ├── collections/page.tsx
│   ├── pipelines/page.tsx    # API pipeline builder & execution
│   ├── settings/page.tsx     # AI providers (OpenAI, OpenRouter, Groq), DB config
│   └── layout.tsx
├── components/
│   ├── layout/               # Header
│   ├── playground/           # RequestBuilder, ResponseViewer, FormDataBodyEditor,
│   │                         # JsonColorized, CodeGenerator, EnvironmentSelector
│   ├── collections/          # CollectionsWorkspace, SaveToCollectionDialog
│   ├── pipelines/            # PipelineBuilder, StepCard, PipelineLayout
│   ├── settings/             # ProviderConfigView, DatabaseConfigView, ProviderIcons
│   ├── ui/                   # shadcn components
│   └── common/               # LoadingSpinner, EmptyState, ErrorBoundary
├── lib/
│   ├── http/
│   │   ├── client.ts         # Server-side HTTP client (undici fetch), executeWithAxios
│   │   └── scripts.ts        # Pre-request & test script runners
│   ├── stores/               # usePlaygroundStore, useExecutionStore, useEnvironmentStore,
│   │                         # useHistoryStore, useSettingsStore, usePipelineStore
│   ├── utils/                # variables, code-generator
│   ├── db/                   # Drizzle runtime, BYODB PostgreSQL
│   └── pipeline/             # DAG execution, variable resolution
├── types/index.ts
└── config/                   # model-registry, ai-providers
```

---

## Key Features

| Feature | Implementation |
|---------|----------------|
| **HTTP methods** | GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS |
| **Body types** | None, JSON, Raw, Form Data, x-www-form-urlencoded |
| **Collections** | BYODB PostgreSQL; connect your DB in Settings. Minimalist divider-based UI |
| **Duplicate Prevention** | Automatic validation prevents redundant requests in collections |
| **AI (report generation)** | OpenAI, OpenRouter, Groq for pipeline execution reports only |
| **Auth** | None, Bearer, Basic, API Key |
| **Environments** | Multiple envs with `{{variable}}` interpolation |
| **Pre-request scripts** | Luzo-style `lz` API, runs before request |
| **Test scripts** | `lz.test()`, `lz.expect()`, assertions after response |
| **Code generation** | cURL, JS, TS, Python, Go, Java, C# |
| **Pipelines** | Multi-step API workflows with variable chaining, debug mode |
| **UI Aesthetics** | Premium minimalist design, hidden scrollbars, global pointer cursors |
| **JSON display** | Syntax highlighting (Sorcerer/light theme), auto-prettified JSON |
| **Search** | Highlight matches, show match count |

---

## Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

See [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for details.
