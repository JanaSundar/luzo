# Luzo — Phased Product & Engineering Roadmap

> **Implementation-oriented roadmap grounded in the actual codebase.**
> Current state: Next.js 16, React 19, Tailwind CSS 4, pnpm monorepo, 3 packages + 1 app,
> ~40 test files, Comlink workers, Drizzle ORM, full DAG execution engine.
>
> The most impactful work ahead is **not** inventing new infrastructure. It is surfacing
> existing infrastructure through correct dedicated node types and honest debugging UI.

---

## Table of Contents

1. [Product Vision Summary](#1-product-vision-summary)
2. [Phase 1 — Foundation and Correctness](#2-phase-1--foundation-and-correctness)
3. [Phase 2 — Workflow Power and Orchestration Depth](#3-phase-2--workflow-power-and-orchestration-depth)
4. [Phase 3 — Reuse, Scale, and Platform Maturity](#4-phase-3--reuse-scale-and-platform-maturity)
5. [Phase 4 — AI-Assisted Workflow Acceleration](#5-phase-4--ai-assisted-workflow-acceleration)
6. [Feature-by-Feature Phase Mapping](#6-feature-by-feature-phase-mapping)
7. [Architecture-by-Phase Mapping](#7-architecture-by-phase-mapping)
8. [Best Sequencing Rationale](#8-best-sequencing-rationale)
9. [What Not to Build Too Early](#9-what-not-to-build-too-early)
10. [Final Prioritized Roadmap](#10-final-prioritized-roadmap)
11. [Implementation Checklist](#11-implementation-checklist)

---

## 1. Product Vision Summary

### What Luzo should become

**The definitive execution-aware API orchestration platform for developers and QA engineers —
the tool you reach for when Postman gets too flat, n8n gets too abstract, and writing a test
harness by hand takes too long.**

Luzo should make multi-step API workflows:
- **designable** — a canvas with honest semantics, not a visual toy
- **runnable** — deterministic, DAG-ordered, server-proxied, fully observable
- **debuggable** — the canvas IS the debugger; not a separate tab, not flat logs
- **reusable** — templates, subflows, and parameterized patterns that teams actually share

### What makes Luzo different

The runtime infrastructure already in the codebase — the compile → plan → execute pipeline,
the async generator yielding `PipelineExecutionEvent`s, the `TimelineIndex` with `byBranchId`
and `byOutcome` lookup maps, `markSkippedSubgraph`, the Comlink workers, the webhook and
polling runtimes — is stronger than the current canvas-level node vocabulary suggests.

Most competing tools either lack real debugging or treat the debugger as a separate concern.
Luzo's core differentiation is that execution, observation, and editing share the same surface.
This must deepen with every phase, never weaken.

Specific differentiators:

| Differentiator | What it means |
|---|---|
| Deterministic DAG execution | Compile → plan → execute pipeline is never bypassed. Every run is reproducible by design. |
| Canvas is the debugger | Chosen paths, skipped branches, variable state, and step timing are visible on the same canvas used to build the workflow. |
| Traceable variable lineage | `{{alias.path}}` references are analyzed statically. Forward references, unresolved paths, and producer/consumer relationships surface before a run starts. |
| Honest control-flow semantics | An `If` is not a `ForEach`. A `Delay` is not a `Poll`. Each node has one clear purpose, one clear runtime meaning, one clear timeline meaning. |
| Server-side execution | Sandboxed pre/post/test scripts, real header control, binary/streaming support. Not a browser toy. |

### What categories of features matter most, in order

1. **Runtime correctness and execution fidelity** — what exists must be correct before it is extended
2. **Control-flow expressiveness** — `If`, `ForEach`, `Delay`, `Poll` as dedicated, honest types
3. **Debugging clarity and observability** — timeline, branch paths, variable state, iteration visibility
4. **Reuse and templates** — subflows, parameterized patterns
5. **AI-assisted authoring** — augment experienced users; constrained, never autonomous

### What must stay true across all phases

#### Node semantics rule

Every user-facing node must have:
- one clear purpose
- one clear runtime meaning
- one clear timeline/debug meaning

This rule is not style. It is the mechanism that keeps the canvas readable, the timeline
interpretable, and the AI features eventually trustworthy. It is the justification for:
- splitting the generic `evaluate` node into `If` and `ForEach`
- `If` before `ForEach` (simpler semantics unlock the harder ones)
- not shipping a giant generic AI node
- delaying `Switch` until `If` and `ForEach` are proven stable
- keeping `Join` separate from `If`

#### Compile/runtime integrity rules

These must never be violated:
- The compile → plan → execute pipeline is never bypassed
- Every new node type ships with both a canvas block definition **and** a runtime executor — never one without the other
- The worker boundary (`graph-worker`, `timeline-worker`) must not leak runtime concerns into the UI
- Variable lineage must be preserved through every new node type
- The 250-line file limit is a hard constraint enforced by pre-commit

---

## 2. Phase 1 — Foundation and Correctness

**Theme:** Make what exists correct, observable, and ergonomic. Close the gap between typed
stubs and working nodes. Set the semantic foundation that everything else builds on.

### The evaluate node direction

The generic `evaluate` node is the most pressing semantic debt in the codebase. It conflates:
- conditional branching (`If`) — one condition, two paths, one is skipped
- iteration (`ForEach`) — a collection input, N executions of a sub-graph

These are different runtime behaviors, different timeline representations, different inspector
UX needs, and different handle vocabularies. Shipping new features into a node that means
"evaluate... something" compounds every problem downstream.

**Phase 1 decision: `evaluate` is frozen, not removed.**

Existing workflows must continue to work. `evaluate` stays in the registry with a deprecation
flag and a visible "upgrade to If" affordance in the inspector. No new product capabilities
are added to `evaluate` after Phase 1 begins. It is a migration target, not a feature surface.

#### If vs Condition

The codebase currently shows both `condition` (in `ARCHITECTURE.md`) and `evaluate` (in the
actual canvas block registry). The long-term direction is unambiguous:

- **`If` replaces both as the user-facing branching node**
- Condition evaluation logic remains an internal shared runtime utility (used by `If`, `Assert`, `Poll` stop conditions)
- `Condition` as a separate first-class node type should not exist alongside `If` — it creates ambiguity about which to use
- Migration compatibility can preserve existing `condition` step data, but the product must present `If` as the canonical branching primitive

### What belongs in Phase 1

#### If node — dedicated canvas block + executor

`If` belongs in Phase 1 because it is the simplest possible decomposition of the `evaluate`
node, and because all Phase 2 control-flow work depends on the handle vocabulary it establishes.

The runtime already has everything needed:
- `markSkippedSubgraph` — marks non-taken branches correctly
- The condition evaluator using `new Function(...)` sandbox
- `byBranchId` and `byOutcome` indexes in `buildTimelineIndex`

What is missing is the dedicated canvas block, the registry entry, and the true/false handle
routing separated from the `evaluate` path.

**`If` node spec for Phase 1:**
- One condition expression input (visual rule builder + raw JS expression, matching existing evaluator)
- Two output handles: `true`, `false` (explicit, canonical handle kinds)
- No `else if` chains, no multi-branch nesting — that is `Switch` (Phase 3)
- Dedicated `IfNodeInspector`: condition expression, true/false branch labels, chosen/skipped indicator after execution

#### Delay node — canvas block + executor using `tinyqueue`

`Delay` is typed as a `WorkflowNodeKind` but has no canvas block and no executor. It belongs
in Phase 1 because it is low-cost to implement and unlocks real QA workflows like "authenticate,
wait 2 seconds, then poll status."

**Scheduling primitive recommendation: `tinyqueue`**

Delay needs a wake-up mechanism that respects ordered `wakeAt` timestamps across potentially
multiple pending delays in a workflow. The correct primitive is a **priority queue / min-heap**,
not a promise concurrency pool.

- `tinyqueue` is a minimal, dependency-free min-heap (< 1KB)
- It sorts pending delays by `wakeAt` ascending, waking the earliest first
- `p-queue` is the wrong choice here: it controls how many promises run concurrently, not when they wake up
- `tinyqueue` also aligns well with Poll wake-up scheduling in Phase 2, keeping the timing model consistent

This does not require a broad infrastructure rewrite. It is a focused primitive used by the
`delay` and (later) `poll` executors to manage scheduled wake-ups inside the pipeline generator.

#### End node — canvas block

`end` is typed but has no canvas block. It belongs in Phase 1 as a **UX clarity node**, not a
strategic centerpiece. Every workflow with multiple terminal paths needs a visual anchor to
make the graph readable. The executor is a no-op that marks the step as terminal.

It is low-cost, high-legibility, and a prerequisite for the timeline to correctly identify
all terminal states in complex branching graphs.

#### Poll node — Phase 1 conditional

The polling runtime is fully implemented (`polling-retry-runner.ts`, `async-step-executor.ts`).
The only missing piece is a dedicated canvas block.

**Phase 1 if:** the polling runtime's observability is already correct and reliable — timeline
events for `poll_attempt`, `poll_wait`, and `poll_terminal` are already emitted and indexed.
In that case, wiring the canvas block to the existing runtime is a UI task and belongs in Phase 1.

**Move to early Phase 2 if:** polling timeline visibility or retry correctness needs rework
before it should be presented as a working feature. Do not ship a canvas block that surfaces
a broken or unobservable runtime.

Audit the polling execution path against the timeline before committing to Phase 1 scope.

#### Branch-aware timeline visualization

The timeline infrastructure for this is already built:
- `byOutcome` lookup map in `buildTimelineIndex`
- `markSkippedSubgraph` in the runtime
- `byBranchId` and `byStatus` indexes

Phase 1 wires these together visually in `TimelinePanel` and `TimelineEventRow`:
- Skipped paths shown dimmed with a `skipped` label
- Chosen path highlighted with a `taken` indicator
- True/false branch labels visible on `If` node timeline entries

This is UI work against existing infrastructure. No new indexes or runtime changes required.

#### Handle vocabulary cleanup

Phase 1 must lock the canonical handle kind vocabulary before `ForEach` lands in Phase 2.

Canonical handle kinds:
- `success` / `failure` — request routing
- `true` / `false` — `If` branching
- `default` — unconditional control flow
- `loop_body` / `loop_exit` — reserved for `ForEach` (Phase 2)

This must be defined in `@luzo/flow-types` as a discriminated type, not string literals
scattered across node definitions.

#### Editor UX: edge delete + route labels

Edge delete and route labels are small but high-leverage changes that have wide impact:

- **Edge delete button:** hover affordance on bezier path SVG; currently missing, repeatedly painful
- **Route labels:** render handle kind as a label on edges — essential for `If` true/false branches to be legible without opening the inspector

Both belong in Phase 1 because `If` branching is unreadable in the canvas without them.

#### If node inspector

The existing `ConditionNodeInspector` should be extended/replaced for `If`:
- Explicit `true` branch / `false` branch section labels
- Post-execution: visual indicator of which branch was taken
- Condition expression with variable autocomplete (leverages existing `getAutocompleteSuggestions`)

#### Variable forward-reference warnings

`buildLineageIndex` already classifies references as `resolved`, `unresolved_alias`,
`unresolved_path`, `forward_reference`, and `runtime_only`. Phase 1 should surface
`forward_reference` and `unresolved_path` as visible warnings in the inspector, not
silent resolution failures. The analysis infrastructure exists; the UI surface does not.

### What should NOT be in Phase 1

- `ForEach / Loop` — depends on settled handle vocabulary and `If` semantics
- `Transform / Mapper` — Phase 2; more complex data shaping
- `Log` / `Assert` — Phase 2
- `Join / Gate` — Phase 2
- `Switch` — Phase 3
- Subflow canvas UX improvements — Phase 3 (expansion logic exists; canvas UX is separate)
- `@luzo/ui` design system extraction — Phase 3; patterns are still evolving
- Any AI features — Phase 4
- Webhook Wait canvas UX completion — early Phase 2

### What Phase 1 unlocks

- `ForEach` in Phase 2 can be built on a settled, canonical handle vocabulary
- Branch-aware timeline in Phase 2 is coherent because `If` paths are clean and correctly marked
- `Assert` in Phase 2 reuses the same condition evaluator established for `If`
- AI suggestions in Phase 4 have well-defined node type semantics to reason about
- Every workflow written against `If` is compatible forward through all subsequent phases

---

## 3. Phase 2 — Workflow Power and Orchestration Depth

**Theme:** Extend control-flow expressiveness with the harder nodes. Make data shaping between
steps possible. Complete the async execution patterns that the runtime already supports.

### ForEach / Loop node — dedicated canvas block + executor

`ForEach` belongs in Phase 2, not Phase 1. It is fundamentally more complex than `If` in
every dimension:

| Dimension | `If` | `ForEach` |
|---|---|---|
| Condition | Single boolean expression | Collection input variable |
| Runtime behavior | Skip one branch | Execute sub-graph N times |
| Variable scope | None beyond routing | Loop index, current item, accumulated results per iteration |
| Timeline representation | Two events (one skipped) | N×M events, grouped by iteration |
| Handle kinds | `true`, `false` (Phase 1) | `loop_body`, `loop_exit` (Phase 2) |
| Sub-graph execution | None | Sub-DAG within the outer DAG |
| Executor complexity | ~40 lines | Full iteration state machine |

The existing `EvaluateNode` type has a `foreach` case — this must be extracted into a proper
`ForEachNode` type with its own schema. The loop body is a sub-graph: the compiler must plan
iterations as a nested execution context within the outer DAG.

**`ForEach` executor requirements:**
- Accepts a collection variable (array) resolved from `{{alias.path}}`
- Exposes `{{loop.index}}`, `{{loop.item}}`, `{{loop.results}}` as iteration-scoped variables
- Emits `iteration_start`, `iteration_end`, `iteration_skip` event kinds
- The timeline must render iteration groups: expandable rows under the `ForEach` node
- `byAttempt` and `byLineagePath` maps in `buildTimelineIndex` already support this structure

#### Iteration visibility in the timeline

When `ForEach` lands, the `TimelinePanel` must show per-iteration events grouped under the
parent `ForEach` node. The indexes are already there (`byAttempt`, `byLineagePath`). Phase 2
wires these into expandable iteration groups in the timeline UI with per-iteration pass/fail status.

### Transform / Mapper node

Data shaping between API calls is a constant friction point. A `Transform` node accepts one or
more input variables and produces a new mapped output variable. It does not need to be a
general-purpose scripting environment — a focused mapper (pick fields, rename keys, coerce
types, compose values) covers 80% of use cases.

The `transform` `WorkflowNodeKind` is already typed. Phase 2 provides the canvas block, a
field-mapping inspector UI, and the executor (expression evaluation using the existing variable
resolution pipeline).

### Webhook Wait node — canvas UX completion

The webhook-wait runtime is fully implemented: `async-step-executor.ts`, `luzo_webhook_waits`
and `luzo_webhook_events` tables, the `/api/webhooks/[token]` and `/api/webhooks/waits` routes.

Phase 2 is **not inventing new backend infrastructure**. It is providing the canvas block that
surfaces the working runtime:
- Webhook URL displayed inline in the canvas block
- Correlation key configuration in the inspector
- Timeout configuration
- Clear "waiting for webhook" state in the timeline

### Log node

A `Log` node emits a named message to the execution timeline. The executor is simple (no HTTP
call, no async wait — just a timeline event). The value is significant: complex workflows
become debuggable without adding `Assert` nodes that might halt execution. Log supports
variable interpolation: `"Auth token received: {{login.response.body.token}}"`.

The timeline receives a new `log` event kind. Log entries are distinct from step results in
the timeline UI.

### Assert / Validation node

An `Assert` node evaluates a condition and fails the pipeline with a structured error if the
condition is false. It is the QA primitive that turns Luzo workflows into automated test suites.

- Uses the same condition evaluator as `If` (one canonical implementation)
- One output handle: pass-through on success
- On failure: emits a structured failure event to the timeline with the condition expression and resolved variable values at time of failure
- Does not branch — halts or passes, nothing else

`Assert` is more central to Luzo's QA/dev identity than Templates. Templates matter for reuse
and discovery. Assert matters for whether Luzo can be used as a testing tool, not just an
orchestration tool. That distinction is core differentiation.

### Pipeline-scoped config / local environment

`useEnvironmentStore` manages global environments. Phase 2 surfaces a pipeline-scoped config
panel where variables are scoped to a single pipeline (not global). These participate in
variable resolution and autocomplete. This is prerequisite for Templates to be meaningfully
parameterized in Phase 3.

### Better inspector structure

Phase 2 establishes the pattern for node-specific inspector panels with dedicated sections:
- `ForEachNodeInspector`: collection binding, loop variable names, iteration limit
- `TransformNodeInspector`: field mapping editor with source/target variable selectors
- Consistent inspector layout: header (node name/type), configuration sections, execution state section (post-run)

This pattern becomes the template for all future node inspectors.

### Join / Gate node

A `Join` node waits for all incoming branches to complete before proceeding. This is the
re-convergence point for `If` true/false branches that should both complete before the
workflow continues.

**Phase 2 by default.** The DAG engine supports parallel stages and `Promise.all` execution —
`Join` is the downstream convergence primitive for multi-branch workflows.

**Pull earlier if:** after `If` lands in Phase 1, branch recombination pain appears quickly
in real workflows. If users consistently ask "how do I merge back after an If?" within Phase 1,
pull `Join` forward into Phase 1 as a late addition. Watch for this signal actively.

### What should NOT be in Phase 2

- `Switch` node — Phase 3; `If` and `ForEach` must be proven stable first
- Subflow canvas creation UX — Phase 3
- Templates library — Phase 3
- `@luzo/ui` extraction — Phase 3
- Any AI features — Phase 4

### What Phase 2 unlocks

- Phase 3 subflows become worth building — workflows are now expressive enough to extract
- Phase 4 AI features have real, typed node semantics to generate and reason about
- `Assert` nodes make QA workflows genuinely verifiable
- The `Transform` node makes complex data pipelines practical without custom scripts for every mapping

---

## 4. Phase 3 — Reuse, Scale, and Platform Maturity

**Theme:** Make complex workflows composable, portable, and maintainable. Harden the platform
foundations that will carry AI features safely.

### Subflow canvas creation UX

`expandSubflows.ts` fully implements subflow expansion: `inputBindings`, `ExpandedNodeOrigin`
lineage tracking, `nodeId::internalId` namespacing, edge rewiring, nested subflow warnings.

Phase 3 provides the missing canvas UX:
- Create a subflow from a selection of nodes
- Browse and reference saved subflows in the canvas
- Configure `inputBindings` in the inspector
- Timeline shows expanded sub-steps grouped under the parent subflow node (using existing `ExpandedNodeOrigin` lineage)

**Why Phase 3 and not earlier:** subflows are only worth building when the workflows they
contain are expressive enough to be reusable. A workflow without `If`, `ForEach`, `Assert`,
`Log`, and `Transform` is rarely complex enough to warrant extraction. Build the vocabulary
first.

### Templates system

`luzo_templates` table already exists in the Drizzle schema with `category`, `tags`,
`complexity`, and `source_type` fields. Phase 3 wires this to:
- A templates library UI: browsable by category, complexity, and tag
- Instantiable with parameter overrides (leveraging pipeline-scoped config from Phase 2)
- Community-style sharing pattern (export/import via the existing JSON export infrastructure)

Templates must be parameterized, not static snapshots. A "Auth + Rate Limited Polling" template
that you can't configure is not a template — it is an example.

### `@luzo/ui` design system extraction

**Why Phase 3 and not earlier:** component patterns are still evolving in Phases 1 and 2.
Premature extraction freezes APIs, creates constant churn in a shared package, and makes
feature work more expensive. By Phase 3, the node inspector pattern, the timeline component
pattern, and the canvas primitive pattern are all stable.

**What belongs in `@luzo/ui`:**
- Design tokens (colors, spacing, typography, radius)
- Primitive components: `Button`, `Input`, `Select`, `Badge`, `Tooltip`, `Panel`, `Separator`
- These must be domain-agnostic — no canvas concepts, no timeline concepts, no pipeline concepts

**What does NOT belong in `@luzo/ui`:**
- Node blocks (stay in `@luzo/flow-builder`)
- Inspector panels (stay in `apps/luzo` or `@luzo/flow-builder`)
- Timeline components (stay in `apps/luzo`)
- Any component that imports from `@luzo/flow-types` or pipeline stores

### Switch node

`Switch` routes based on a value matching multiple cases. It is additive over `If` — a
convenience for multi-branch scenarios that would otherwise chain three `If` nodes.

**Why Phase 3 and not earlier:** `Switch` must be built on settled `If` semantics and a
proven handle vocabulary. Shipping it before `If` and `ForEach` are stable creates an
untested interaction between three branching primitives. The value of `Switch` depends on
whether users actually chain `If` nodes — observe this in Phases 1 and 2 before building.

### Package boundary cleanup

- `@luzo/flow-core` confirmed tree-shakeable: audit for DOM/browser globals, ensure worker-safe
- Remove any duplicate logic (variable resolver copies, condition evaluator copies)
- ESLint/Oxlint rules that enforce cross-package import constraints
- Canonical imports enforced at the linting layer, not by convention

### Large-file splitting

The audit identified violations of the 250-line limit: `Canvas.tsx`, `useFlowState.ts`,
`flow-document.ts`, `BodyEditor.tsx`. Phase 3 is the right time to split these — after
Phase 1 and 2 feature work has stabilized their structure. Splitting unstable files too early
creates merge conflicts and adds rework. Wait until the shape is settled.

### Worker hardening

`graph-worker.ts` exposes `compileExecutionPlan` and `validateWorkflowDag`. Phase 3 should
verify that all heavy graph computation genuinely goes through workers and profile any cases
where the main thread blocks on plan compilation. This is a quality pass, not a redesign.

### What should NOT be in Phase 3

- AI features — Phase 4
- New node types (the vocabulary established in Phases 1 and 2 should cover real needs)
- Major runtime changes (stabilize first, optimize second)

---

## 5. Phase 4 — AI-Assisted Workflow Acceleration

**Theme:** Augment experienced users without replacing human intent.

### The constraint that governs all of Phase 4

Every AI feature must produce valid Luzo workflow primitives. AI cannot:
- invent node types that don't exist in the registry
- bypass `validateWorkflowDag` validation
- silently mutate the canvas without user review
- autofill API credentials, endpoint URLs, or authentication headers

AI is a workflow authoring assistant. It is not a runtime. It is not autonomous. The existing
`generateAIReport` server action pattern (structured output, user review, fallback when no key
configured) is the model to follow.

### AI features in priority order

#### 1. Mapping / binding assistance (first)

Given a source node's response shape and a target node's expected inputs, suggest variable
bindings. The grounding is `getAutocompleteSuggestions` + `buildLineageIndex` — both already
exist. The AI is filling in a structured mapping, not generating free text. This is the
highest-value, lowest-risk AI feature because there is a clear correctness signal: does the
suggested binding resolve to a real variable in the lineage graph?

#### 2. Failure explanation

When a pipeline execution fails, AI explains in plain language: which step failed, what the
likely cause is (based on status code, response body, variable resolution state at time of
failure), and what to try next. Uses timeline event data and resolved variable snapshots as
context. Bounded and trustworthy: it explains what happened, it does not attempt to fix the
workflow autonomously.

#### 3. Path / branch explanation

Explains why an `If` node took the `true` branch (or `false`) in plain language:
"The condition `response.status === 200` evaluated to true because the login request returned
status 200." Uses `byOutcome` lookup and variable resolution state. Read-only, bounded by
actual execution data.

#### 4. Next-step suggestions

After adding a `Request` node, AI suggests likely next nodes based on the response shape and
common patterns. Constrained to canonical node types only. No hallucinated node types. The
suggestion is an affordance — the user accepts or ignores it.

#### 5. Template matching / instantiation

Given a description, find the closest template from the Phase 3 templates library and
instantiate it with suggested bindings. **Depends on Phase 3 templates.** This feature cannot
ship before the templates library exists.

#### 6. Multi-step flow generation skeleton (lower-trust)

Given a plain-language description, generate a flow skeleton (nodes + edges, no filled-in
request details). The generated flow must pass `validateWorkflowDag` before being presented.
User fills in all request-specific details. **This feature should be treated more cautiously**
than the features above — the output is structural (a whole graph), not bounded (a single
variable binding or a single explanation). Ship it behind a clear "AI generated, review
carefully" affordance.

#### 7. AI task nodes (typed and bounded)

First-class `WorkflowNodeKind` nodes that call an LLM as a step in the workflow:

| Node | Purpose | Trust level |
|---|---|---|
| `Extract` | Extract structured data from a response body into variables | High — output schema is declared |
| `Classify` | Classify a string into one of N declared categories | High — categories are bounded |
| `Summarize` | Summarize a long response for a log or report output | Medium — summary quality varies |
| `Transform` (AI) | AI-powered field mapping when the deterministic Transform is insufficient | **Lower** — treat cautiously; output is structural |

**Do not ship:**
- `Decide` — AI makes routing decisions at runtime, breaking determinism guarantees
- `Generate` — open-ended content generation is not a QA/dev orchestration primitive
- A single giant AI node that does "anything" — violates the node semantics rule

### What AI features to avoid early

- **Giant generic AI node:** violates the node semantics rule; makes execution unpredictable; makes the timeline unreadable; makes debugging impossible
- **AI-modified workflow graphs without user review:** silently mutating the canvas is a trust violation; always require explicit acceptance
- **Autonomous retry/recovery:** AI deciding to re-route a failed pipeline is a runtime autonomy problem that Luzo is not positioned to handle safely in Phase 4

---

## 6. Feature-by-Feature Phase Mapping

| Feature | Phase | Category | Reason |
|---|---|---|---|
| `If` node (canvas block + executor + inspector) | 1 | Core control-flow | Closes semantic debt in `evaluate`; simplest correct decomposition |
| `evaluate` node deprecation + migration path | 1 | Migration | Frozen in Phase 1; no new capabilities; upgrade affordance added |
| `Delay` node with `tinyqueue` scheduling | 1 | Orchestration | Typed, unimplemented; low-cost; unlocks time-based QA workflows |
| `End` node (canvas block) | 1 | UX clarity | Typed, no canvas block; visual terminal anchor for branching graphs |
| Branch-aware timeline (chosen/skipped path visualization) | 1 | Debugging | Infrastructure exists; UI wiring only |
| `If` node inspector (true/false labels, chosen branch) | 1 | Inspector UX | Required for branch-aware debugging to be legible |
| Edge delete button | 1 | Builder UX | High pain, trivial to implement |
| Route labels on edges | 1 | Builder UX | Required for `If` branch legibility without opening inspector |
| Handle vocabulary cleanup (canonical handle kinds) | 1 | Architecture | Must be locked before `ForEach` handle kinds are added |
| Variable forward-reference warnings in inspector | 1 | Debugging | `buildLineageIndex` classifies these; surfacing is UI-only work |
| `Poll` node (canvas block) | 1 or early 2 | Orchestration | Runtime exists; ship in Phase 1 only if runtime observability is confirmed correct |
| `ForEach / Loop` node (canvas block + executor) | 2 | Core control-flow | More complex than `If`; sub-graph execution, iteration state, new handle kinds |
| Iteration visibility in timeline for `ForEach` | 2 | Debugging | Depends on `ForEach` landing; `byAttempt` index already exists |
| `Transform / Mapper` node | 2 | Data shaping | Typed but unimplemented; unlocks practical data pipelines |
| `Webhook Wait` node (canvas UX completion) | 2 | Async orchestration | Runtime complete; canvas block and inspector UX is the missing piece |
| `Log` node | 2 | Debugging | Simple timeline event; high QA value |
| `Assert / Validation` node | 2 | QA primitive | Core differentiation; condition evaluator already exists |
| `Join / Gate` node | 2 (or late 1) | Control-flow | Re-convergence after `If`; pull earlier if pain appears quickly |
| `ForEach` node inspector (dedicated) | 2 | Inspector UX | Collection binding, loop variable config, iteration limit |
| Pipeline-scoped config / local environment | 2 | Workflow config | Builds on `useEnvironmentStore`; prerequisite for parameterized templates |
| Better inspector structure (node-specific sections) | 2 | UX | Establishes pattern for all future node inspectors |
| Subflow canvas creation UX | 3 | Reuse | `expandSubflows.ts` exists; canvas UX is the missing piece |
| Templates system (browsable, instantiable) | 3 | Reuse | `luzo_templates` table exists; wiring + parameterization needed |
| `@luzo/ui` design system extraction | 3 | Architecture | Extract only after patterns are stable (not before) |
| `Switch` node | 3 | Control-flow | Additive over `If`; justified only after `If`/`ForEach` are proven stable |
| Package boundary cleanup + canonical imports | 3 | Architecture | Duplicate removal, ESLint rules, tree-shakeability audit |
| Large-file splitting (`Canvas.tsx`, etc.) | 3 | Architecture | Split after Phase 2 stabilizes their structure |
| Worker hardening (main-thread blocking audit) | 3 | Performance | Quality pass on existing worker architecture |
| Subflow timeline introspection | 3 | Debugging | Depends on subflow canvas UX |
| AI mapping / binding assistance | 4 | AI | Highest-value, lowest-risk; grounded in `buildLineageIndex` |
| AI failure explanation | 4 | AI | Bounded to timeline data; read-only |
| AI path / branch explanation | 4 | AI | Read-only; uses `byOutcome` and variable state |
| AI next-step suggestions | 4 | AI | Constrained to canonical node types |
| AI template matching / instantiation | 4 | AI | Depends on Phase 3 templates |
| AI multi-step flow generation (skeleton, lower-trust) | 4 | AI | Validated by `validateWorkflowDag`; user reviews before applying |
| AI task node: `Extract` | 4 | AI node type | Structured output; declared schema; high trust |
| AI task node: `Classify` | 4 | AI node type | Bounded categories; high trust |
| AI task node: `Summarize` | 4 | AI node type | Medium trust; quality varies |
| AI task node: `Transform` (AI) | 4 | AI node type | Lower trust; treat cautiously |
| `evaluate` node full retirement | 4+ | Migration | Remove after AI-assisted migration; only when usage reaches zero |

---

## 7. Architecture-by-Phase Mapping

### Phase 1

#### `@luzo/flow-types`

- Add `IfNode` canvas type with `true` and `false` output handle definitions
- Add `DelayNode`, `EndNode` canvas types
- Define canonical handle kind vocabulary as a discriminated type:
  ```typescript
  type HandleKind = 'success' | 'failure' | 'true' | 'false' | 'default' | 'loop_body' | 'loop_exit'
  ```
  `loop_body` and `loop_exit` are reserved for Phase 2 but must be declared here
- Mark `EvaluateNode` with a `deprecated: true` flag in the registry type

#### `@luzo/flow-core`

- No changes to DAG engine (Kahn topo-sort, cycle detection, stage derivation are correct)
- Ensure `compileExecutionPlan` handles `if`, `delay`, `end` node kinds cleanly
- Ensure `validateWorkflowDag` emits a deprecation warning for `evaluate` nodes

#### `@luzo/flow-builder`

- Add canvas block components: `IfBlock`, `DelayBlock`, `EndBlock`
- Add edge delete button (hover affordance on bezier path element)
- Add route label rendering (sourced from edge's handle kind field)
- Extend `DockedInspector` dispatch: `if` → `IfNodeInspector`, `delay` → `DelayNodeInspector`
- No runtime execution logic enters this package

#### `apps/luzo` runtime

- Add `if` executor: routes via condition evaluator, calls `markSkippedSubgraph` on non-taken branch
- Add `delay` executor: uses `tinyqueue` min-heap to schedule `wakeAt`-ordered wake-ups
- Add `end` executor: no-op, marks step as terminal
- Wire `poll` canvas block to existing `polling-retry-runner.ts` (if runtime observability confirmed)
- Extend `TimelinePanel` / `TimelineEventRow` for chosen/skipped path rendering
- Surface forward-reference warnings from `buildLineageIndex` in inspector

#### Workers

- `graph-worker.ts`: `compileExecutionPlan` must handle `if`, `delay`, `end`, `poll` node kinds
- No structural worker changes in Phase 1

---

### Phase 2

#### `@luzo/flow-types`

- Add `ForEachNode` canvas type with `loop_body` and `loop_exit` handle kinds (reserved in Phase 1, implemented here)
- Add `TransformNode`, `WebhookWaitNode`, `LogNode`, `AssertNode`, `JoinNode` canvas types
- Remove `foreach` from `EvaluateNode` union — it now has its own type
- Remove `switch` from `EvaluateNode` union — deferred to Phase 3 `SwitchNode`

#### `@luzo/flow-core`

- `ForEach` requires sub-graph execution planning: the compiler must recognize loop body as a nested execution context
- Add `iteration_start`, `iteration_end`, `iteration_skip` to the event kind union
- The `applyNodeChanges` and stage derivation must handle `ForEach` loop body as a sub-DAG scope

#### `@luzo/flow-builder`

- Canvas blocks: `ForEachBlock`, `TransformBlock`, `WebhookWaitBlock`, `LogBlock`, `AssertBlock`, `JoinBlock`
- `ForEach` canvas block should visually suggest containment of its loop body (group-like visual cue, not a full group node)
- Dedicated inspectors: `ForEachNodeInspector`, `TransformNodeInspector`, `WebhookWaitNodeInspector`

#### `apps/luzo` runtime

- `ForEach` executor: iteration state machine, per-iteration variable scope, loop break on error or condition
- `Transform` executor: field mapping expression evaluation using existing variable resolution
- `Log` executor: emits `log` timeline event with interpolated message
- `Assert` executor: condition check using shared evaluator; emits structured failure on false
- `Join` executor: waits for all upstream branches to complete
- Timeline: `ForEach` iteration groups (expandable rows, per-iteration pass/fail)
- Pipeline config panel: pipeline-scoped environment variables

#### Workers

- `timeline-worker.ts`: `syncTimeline` extended to handle `iteration_start`/`iteration_end`/`iteration_skip` events from `ForEach`
- `analysis-worker.ts`: `analyzeVariables` must handle loop-scoped variable references (`loop.index`, `loop.item`, `loop.results`)

---

### Phase 3

#### `@luzo/flow-types`

- Add `SwitchNode` canvas type with N named case output handles
- Freeze the node type registry — no more ad-hoc additions without a spec

#### `@luzo/flow-core`

- Confirm tree-shakeability: audit all imports, remove any `window` / `document` references
- Confirm worker-safety: no browser globals
- Pin the public API for potential external consumption

#### `@luzo/flow-builder`

- Move stable, domain-agnostic UI primitives to `@luzo/ui`
- Keep flow-specific components (canvas, edge, node blocks, inspector panels) in `@luzo/flow-builder`
- Nothing that imports from pipeline stores or timeline stores enters `@luzo/ui`

#### `@luzo/ui` (new package)

- Design tokens: color, spacing, typography, radius (CSS custom properties)
- Primitive components: `Button`, `Input`, `Select`, `Badge`, `Tooltip`, `Panel`, `Separator`, `Icon`
- No canvas concepts, no node types, no timeline concepts

#### `apps/luzo` runtime

- Subflow canvas creation: select nodes → extract to named subflow document
- Templates library: browse, filter, instantiate with pipeline-scoped config bindings
- `Switch` node executor
- Large-file splits: `Canvas.tsx`, `useFlowState.ts`, `flow-document.ts`, `BodyEditor.tsx`
- Oxlint rules for canonical cross-package import constraints

---

### Phase 4

#### `apps/luzo` AI

- AI features as server actions following the `generateAIReport` pattern
- AI task nodes (`Extract`, `Classify`, `Summarize`, optionally `Transform`) registered as `WorkflowNodeKind` members
- AI task node executors: call configured LLM provider (OpenAI / Groq / OpenRouter), return structured output into the variable scope
- AI workflow generation: calls `graph-worker` `validateWorkflowDag` before presenting result; user reviews before applying
- All canvas mutations from AI require explicit user acceptance — no silent application

---

## 8. Best Sequencing Rationale

### Why `If` comes before `ForEach`

`If` is the minimal branching primitive. One condition, two output handles, one is skipped.
The executor is ~40 lines. The timeline representation is two events, one marked skipped.

`ForEach` requires a sub-graph execution model, per-iteration variable scope, new event kinds,
new handle kinds, and a dedicated timeline group renderer. Building `ForEach` on a settled
`If` implementation means the handle vocabulary, the skipped-path marking, and the branch-
aware timeline visualization are all proven before the more complex iteration model arrives.

### Why both come before AI

AI-assisted flow generation and next-step suggestions must reason about canonical node types.
If `If` and `ForEach` are still backed by a generic `evaluate` node when AI lands, the AI
will generate ambiguous or wrong node types. Clean, explicit semantics are a prerequisite
for correct AI assistance. This is not a soft preference — it is a hard dependency.

### Why `Assert` and `Log` come before subflows

Subflows are only worth extracting when the workflows they contain are expressive enough to
reuse. A workflow that cannot assert, cannot log, and cannot loop is not complex enough to
extract. Build the vocabulary in Phase 2 so that Phase 3 subflows have real value.

### Why `@luzo/ui` extraction comes before AI but after Phase 2

AI features in Phase 4 will need consistent UI components for node inspectors, suggestion
panels, and output displays. Extracting `@luzo/ui` in Phase 3 means Phase 4 AI UI is built
on a stable design system. But extracting it in Phase 1 or 2, while component patterns are
still evolving, creates constant churn and freezes APIs prematurely.

### Why templates come before AI template matching

AI template matching in Phase 4 requires a templates library to match against. Phase 3 builds
that library. This is the clearest dependency chain in the roadmap.

### Why polling and webhook maturity are early

The polling runtime (`polling-retry-runner.ts`) and webhook-wait runtime (`async-step-executor.ts`,
database tables, webhook route handlers) are fully implemented. The cost of surfacing these
as first-class canvas nodes is primarily UI work — not infrastructure. Delaying canvas
representations of working infrastructure means users cannot access capabilities that already
exist. This is a discoverability failure, not a complexity tradeoff.

### Why aggressive package extraction should wait

`@luzo/flow-core` and `@luzo/flow-builder` are in a monorepo with fast iteration cycles. The
node type vocabulary is still being established in Phases 1 and 2. Premature extraction freezes
APIs, makes type changes expensive, and adds inter-package coordination overhead before the
interface contracts are stable. Phase 3 is the right time: the vocabulary is settled, the
patterns are clear.

### Why durable execution infrastructure should wait

The current webhook-wait implementation uses long-polling against a PostgreSQL-backed wait
table. It works. Building a proper durable execution system (job queues, persistent worker
state, resumption after server restart) is a significant platform undertaking that should
only happen after validating that users actually need long-running durable workflows. Solve
for correctness first, durability second.

### Why `Delay` comes before broader waiting/orchestration maturity

`Delay` is the simplest time-based primitive. Using `tinyqueue` for `wakeAt`-ordered scheduling
establishes the correct timing model early — one that `Poll` wake-up scheduling will later
reuse. Getting the timing primitive right in Phase 1 means polling and webhook timeouts
in Phase 2 build on a proven model.

---

## 9. What Not to Build Too Early

### Giant generic AI node

The temptation is to ship one "AI" node that does anything. This violates the node semantics
rule, makes the execution model unpredictable, breaks compile → plan determinism, and produces
workflows that cannot be debugged. The timeline cannot represent "AI did something" in a way
that is debuggable. Constrain AI to typed task nodes with declared input/output schemas.

### Overbuilt `@luzo/ui` extraction in Phase 1 or 2

Component patterns are still evolving. Extracting a design system before the component API
is stable means constant churn in the shared package, which is more painful in a monorepo
than in a standalone project. Every change to a shared primitive ripples into `flow-builder`
and `apps/luzo`. Wait until Phase 3 when patterns are stable.

### Premature durable execution infrastructure

The current polling and webhook-wait implementation is correct for the current scale. Building
a queue-backed durable execution system before validating that users need long-running durable
workflows is speculative over-engineering. Solve the immediate problems with proven infrastructure.

### Too many node types in Phase 1

Phase 1 adds `If`, `Delay`, `End`, and conditionally `Poll` — four nodes. Adding `Transform`,
`Log`, `Assert`, `Join`, `ForEach`, and `Switch` simultaneously produces an unstable node
vocabulary, an unmanageable migration away from `evaluate`, and a test suite that cannot keep
up with the scope.

### Moving feature-specific UI into the design system

`ConditionNodeInspector`, `TimelinePanel`, `PipelineSideInspector` are flow-specific. They
must not enter `@luzo/ui`. A design system that contains domain concepts from the application
is not a design system — it is a shared component library with coupling problems. Only
domain-agnostic primitives belong there.

### Overloading `evaluate` instead of splitting it

Every new feature added to `evaluate` makes the migration to `If` and `ForEach` more expensive
and the semantics more opaque. The moment Phase 1 begins, `evaluate` is frozen. No exceptions.
The short-term convenience of extending an existing node is not worth the long-term cost of
an undifferentiated god-node.

### Shipping `Switch` before `If`/`ForEach` are stable

`Switch` is a convenience over `If`. It is not more expressive. It should be built only after
`If` is in production and users are demonstrably chaining three or more `If` nodes in ways
that `Switch` would simplify. Ship `If` first, observe real usage, then decide whether `Switch`
earns its implementation cost.

### Excessive runtime abstraction layers

The current executor dispatch (switch on node kind, one function per kind) is readable,
testable, and fast. Do not introduce abstract "node runner" registries, dynamic executor
discovery, or plugin systems before there is a demonstrated need. The current pattern handles
10 node types cleanly. Add abstraction when the pattern genuinely breaks, not speculatively.

---

## 10. Final Prioritized Roadmap

### Top 5 most important features overall

1. **`If` node** — closes the most pressing semantic debt; establishes the handle vocabulary that all Phase 2 control-flow builds on; sets the pattern for dedicated, honest node semantics across the entire product
2. **Branch-aware timeline visualization** — this is the "canvas is the debugger" thesis made real; without visible chosen/skipped paths, Luzo is a runner, not a debugger
3. **`Delay` node** — simplest time-based primitive; establishes `tinyqueue`-based scheduling; unlocks time-sensitive QA workflows immediately
4. **`ForEach / Loop` node** — makes Luzo genuinely useful for collection-based QA workflows; unlocks the most impactful real-world use cases
5. **`Assert / Validation` node** — the QA primitive; the feature that makes Luzo a testing tool, not just an orchestration tool; more central to the product's core identity than Templates

`Assert` ranks above Templates because Templates matter for reuse and discoverability, but
`Assert` matters for whether Luzo can be used as an automated testing platform. That
distinction is the product's most direct claim against tools like Postman and k6.

### Top 5 most important features for Phase 1

1. `If` node with dedicated canvas block, executor, and `IfNodeInspector`
2. Branch-aware timeline visualization (chosen/skipped path rendering using existing `byOutcome` + `markSkippedSubgraph`)
3. `Delay` node with `tinyqueue` wake-up scheduling
4. `evaluate` node deprecation: frozen, migration affordance in inspector, no new capabilities
5. Edge delete button + route labels on edges (required for `If` branches to be legible)

### Where `If` and `ForEach` fit

- **`If` → Phase 1.** The semantic foundation. Simplest correct decomposition of `evaluate`. Required before `ForEach`.
- **`ForEach` → Phase 2.** Sub-graph execution model, iteration state, new handle kinds, timeline iteration groups. Builds on the handle vocabulary and skipped-path infrastructure from Phase 1.

### Should the generic `evaluate` node be retired long-term?

**Yes. Unconditionally.**

It is not the correct long-term UX model. It conflates conditional branching and iteration
under a single opaque type. Users cannot determine from a canvas whether an `evaluate` node
will branch or loop without opening the inspector. Phase 1 freezes it. Phase 4 removes it
with AI-assisted migration where needed. No new features after Phase 1 begins.

### What is the best long-term differentiator for Luzo?

**Execution-native debugging on a deterministic DAG.**

Every serious API orchestration tool either lacks debugging or separates the debugger from
the canvas. Luzo's differentiator is that the canvas IS the debugger — chosen paths
highlighted, skipped paths dimmed, each variable's resolved value inspectable at any step,
step-through execution available for any workflow. This capability must deepen with every
phase and must never be compromised by architectural shortcuts.

### What is the biggest thing to avoid?

**Letting `evaluate` accumulate more features while `If` and `ForEach` are being planned.**

This is the most likely failure mode. If any iteration of Phase 1 development adds "just one
more conditional case" or "quick ForEach support" to the existing `evaluate` node, the
migration becomes progressively more expensive, the semantic debt compounds, and the product
acquires a god-node that no user or AI can reason about correctly. The moment Phase 1 starts,
`evaluate` is frozen. This is the single most important architectural decision in the roadmap.

---

## 11. Implementation Checklist

### Runtime correctness

- [ ] Every new node type ships with **both** a canvas block definition **and** a runtime executor — never one without the other
- [ ] Every new executor is covered by at least one unit test before merging
- [ ] `markSkippedSubgraph` is called for all non-taken paths (`If` false branch, `ForEach` iterations on empty collection)
- [ ] Variable resolution state is captured at each step for timeline replay
- [ ] `step_ready` debug pause/inject round-trips cleanly for all new node types
- [ ] Parallel stage execution is regression-tested for dependent variable reorder safety
- [ ] `ForEach` executor isolates per-iteration variable scope — no cross-iteration pollution
- [ ] `Delay` node uses `tinyqueue` min-heap for `wakeAt`-ordered scheduling, not `setTimeout` chaining or `p-queue`

### No duplication across packages

- [ ] Variable resolver has one canonical implementation — no copies across packages
- [ ] Condition evaluator has one canonical implementation — used by `If`, `Assert`, and `Poll` stop conditions
- [ ] No runtime execution logic in `@luzo/flow-builder`
- [ ] No canvas block definitions in `apps/luzo` (except the adapter layer in `features/flow-editor`)

### Clean boundaries

- [ ] `@luzo/flow-types` — pure TypeScript; no runtime imports; no React imports
- [ ] `@luzo/flow-core` — no DOM/browser globals (`window`, `document`, `localStorage`); worker-safe; tree-shakeable
- [ ] `@luzo/flow-builder` — canvas and builder UI only; no execution logic; no pipeline store imports
- [ ] `@luzo/ui` — domain-agnostic primitives only; no canvas concepts; no pipeline concepts; no timeline concepts
- [ ] `apps/luzo` — runtime, stores, persistence, server actions, workers

### Debugging and observability

- [ ] Timeline shows chosen/skipped path labels for `If` nodes using `byOutcome` index
- [ ] Timeline shows `ForEach` iteration groups (expandable rows, per-iteration status)
- [ ] `Log` node events visible in timeline with interpolated message
- [ ] `Assert` node pass/fail visible in timeline with condition expression and variable values at time of evaluation
- [ ] Variable resolution state inspectable for any timeline event (existing store supports this)
- [ ] Forward-reference warnings from `buildLineageIndex` surfaced in inspector for `unresolved_path` and `forward_reference` classifications
- [ ] Skipped paths shown dimmed in timeline; chosen paths highlighted

### AI stays constrained

- [ ] AI features implemented as server actions (not client-side LLM calls)
- [ ] AI workflow generation output validated by `validateWorkflowDag` before presenting to user
- [ ] AI task nodes have declared input/output schemas — not free-form generation
- [ ] No AI feature silently mutates the canvas — all AI output requires explicit user acceptance
- [ ] AI does not autofill API credentials, endpoint URLs, or authentication headers
- [ ] No giant generic AI node — only typed task nodes (`Extract`, `Classify`, `Summarize`, cautiously `Transform`)
- [ ] `Decide` node not shipped in Phase 4 — breaks determinism

### Clear node semantics

- [ ] `evaluate` node: frozen in Phase 1; no new capabilities after Phase 1 begins; deprecation flag in registry; upgrade affordance in inspector
- [ ] `If` node: one condition expression, two output handles (`true`/`false`), no iteration, no multi-branch nesting
- [ ] `ForEach` node: one collection variable input, one loop body sub-graph, `loop_body`/`loop_exit` handles, per-iteration variable scope
- [ ] `Assert` node: one condition expression, one output handle (pass-through), halts pipeline on false
- [ ] `Condition` node: not a separate long-term concept; condition evaluation is a shared internal runtime utility used by `If`, `Assert`, and `Poll`
- [ ] `Switch` node: not built until Phase 3; only after `If` usage in production demonstrates that chained `If` nodes are a real pain point
- [ ] Handle kind vocabulary locked in Phase 1: `success`, `failure`, `true`, `false`, `default`, `loop_body` (reserved), `loop_exit` (reserved)

### Incremental rollout discipline

- [ ] Phase 1 adds exactly: `If`, `Delay`, `End`, conditionally `Poll`, edge delete, route labels, branch timeline, `evaluate` deprecation
- [ ] Phase 2 adds exactly: `ForEach`, `Transform`, `WebhookWait`, `Log`, `Assert`, `Join`, pipeline config, iteration timeline
- [ ] Phase 3 adds exactly: Subflows, Templates, `Switch`, `@luzo/ui` extraction, package cleanup
- [ ] Phase 4 adds exactly: AI binding assistance, AI failure/branch explanation, AI next-step suggestions, AI flow generation (lower-trust), AI task nodes
- [ ] No feature from a later phase is rushed into an earlier phase without explicit justification
- [ ] `Join` may be pulled from Phase 2 into late Phase 1 **only if** branch recombination pain is observed immediately after `If` lands

### Maintainability

- [ ] No file exceeds 250 lines — enforced by `scripts/check-file-length.cjs` pre-commit hook
- [ ] New node executor files stay under 150 lines by delegating to shared utility functions
- [ ] New inspector components stay under 200 lines by composing section components
- [ ] New node canvas blocks stay under 100 lines — they are rendering primitives, not logic hosts
- [ ] `ForEach` executor delegates iteration scheduling to a shared utility, not inlining all state management
- [ ] Large-file violations (`Canvas.tsx`, `useFlowState.ts`, `flow-document.ts`, `BodyEditor.tsx`) addressed in Phase 3 after structure stabilizes

### Test coverage expectations

- [ ] Every new executor: minimum one unit test covering the happy path, one covering the failure/skip path
- [ ] `If` executor: test for `true` branch taken + `false` branch skipped; test for `false` branch taken + `true` branch skipped
- [ ] `Delay` executor: test that wake-up ordering via `tinyqueue` is correct for concurrent delays
- [ ] `ForEach` executor: test for empty collection (zero iterations), single iteration, multi-iteration with variable scope isolation
- [ ] `Assert` executor: test for passing condition (pipeline continues), failing condition (pipeline halts with structured error)
- [ ] Timeline tests: extend `buildTimelineIndex` tests for `iteration_start`/`iteration_end` events and `log` events
- [ ] Canvas block tests: each new block renders without errors with default props
- [ ] No phase merges without at least the executor unit tests in place

---

*Grounded in the actual codebase state as of the April 2026 audit.*
*The runtime infrastructure is stronger than the current canvas-level node vocabulary suggests.*
*The most impactful work ahead is surfacing existing infrastructure through correct dedicated node types and honest debugging UI.*
