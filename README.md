# AI API Playground

An AI-powered API testing and development playground with Postman/Requestly-style interceptors, form-data support, and code generation.

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
| `pnpm db:push` | Push Prisma schema to database |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           App Shell (Layout)                              │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Header (nav: Playground, Collections, QA, Settings)                 │  │
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
       ├── getActiveEnvironmentVariables()  ◀── usePlaygroundStore
       │
       ▼
executeRequest(request, envVars)  ◀── Server Action (api-tests.ts)
       │
       ├── interpolateVariables() on url, headers, params
       ├── applyAuth() → Bearer/Basic/API-Key
       ├── runPreRequestScript() if preRequestScript set
       │      └── pm.request, pm.env, pm.variables (Postman-style)
       │
       ▼
executeWithAxios()  ◀── lib/http/client.ts
       │
       ├── buildAxiosConfig() → method, url, headers, body
       ├── axios(config) → HTTP request
       ├── runTestScript() if testScript set
       │      └── pm.response, pm.test(), pm.expect()
       │
       ▼
ApiResponse { status, headers, body, time, size, testResults? }
       │
       ▼
setResponse() → usePlaygroundStore
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
setResponse() → ResponseViewer
```

### 2. State Management Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     usePlaygroundStore (Zustand + persist)                │
├─────────────────────────────────────────────────────────────────────────┤
│  request: ApiRequest                                                    │
│    - method, url, headers, params, body, bodyType, formDataFields       │
│    - auth, preRequestScript, testScript                                │
│  response: ApiResponse | null                                           │
│  isLoading: boolean                                                     │
│  environments: Environment[]                                            │
│  activeEnvironmentId: string                                            │
│  responseLayout: "horizontal" | "vertical"                               │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │  Persisted to localStorage (formDataFields.file stripped)
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     useCollectionStore                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  collections: Collection[]                                              │
│  history: SavedRequest[] (max 100)                                      │
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

### 6. Pre-Request & Test Scripts (Interceptors)

```
Pre-Request Script (runs before request)
─────────────────────────────────────────
  pm.request.url = "https://..."
  pm.request.headers.upsert("X-Custom", "value")
  pm.env.set("token", "abc123")
  pm.variables.set("ts", Date.now())

Test Script (runs after response)
─────────────────────────────────
  pm.test("Status is 200", function() {
    pm.expect(pm.response.status).to.equal(200);
  });
  pm.test("Has success", function() {
    const json = pm.response.json();
    pm.expect(json).to.have.property("success");
  });
```

Executed in Node `vm` sandbox. `pm` object exposed per script type.

---

## Project Structure

```
src/
├── app/
│   ├── actions/
│   │   ├── api-tests.ts      # executeRequest server action
│   │   ├── chat.ts
│   │   └── conversations.ts
│   ├── api/
│   │   ├── execute/route.ts  # Form-data proxy (server-side fetch via undici)
│   │   ├── health/route.ts
│   │   └── models/route.ts
│   ├── page.tsx              # Playground (Request + Response panels)
│   ├── collections/page.tsx
│   ├── qa/page.tsx
│   ├── settings/page.tsx
│   └── layout.tsx
├── components/
│   ├── layout/               # AppShell, Header, Sidebar
│   ├── playground/           # RequestBuilder, ResponseViewer, FormDataBodyEditor,
│   │                         # JsonColorized, CodeGenerator, EnvironmentSelector
│   ├── ui/                   # shadcn components
│   └── common/               # LoadingSpinner, EmptyState, ErrorBoundary
├── lib/
│   ├── http/
│   │   ├── client.ts         # Server-side HTTP client (undici fetch), executeWithAxios
│   │   └── scripts.ts        # Pre-request & test script runners
│   ├── stores/               # usePlaygroundStore, useCollectionStore, useSettingsStore
│   ├── utils/                # variables, code-generator
│   ├── db/                   # Prisma, conversations, messages
│   └── ai/                   # LangChain, agents, chains
├── types/index.ts
└── config/ai-providers.ts
```

---

## Key Features

| Feature | Implementation |
|---------|----------------|
| **HTTP methods** | GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS |
| **Body types** | None, JSON, Raw, Form Data, x-www-form-urlencoded |
| **Form Data** | Text + file fields via react-dropzone |
| **Auth** | None, Bearer, Basic, API Key |
| **Environments** | Multiple envs with `{{variable}}` interpolation |
| **Pre-request scripts** | Postman-style `pm` API, runs before request |
| **Test scripts** | `pm.test()`, `pm.expect()`, assertions after response |
| **Code generation** | cURL, JS, TS, Python, Go, Java, C# |
| **Response** | Status, headers, body, timing, size |
| **JSON display** | Syntax highlighting (Sorcerer/light theme), auto-prettified JSON |
| **Search** | Highlight matches, show match count |

---

## Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

See [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for details.
