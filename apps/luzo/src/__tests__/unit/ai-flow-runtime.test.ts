import { describe, expect, it } from "vitest";

import { compileFlowDocumentToPipelineSteps } from "@/features/flow-editor/domain/flow-runtime";
import {
  getAutocompleteSuggestions,
  getFlowNodeAutocompleteSuggestions,
} from "@/lib/pipeline/autocomplete";
import type { Pipeline } from "@/types";

describe("AI flow runtime", () => {
  it("compiles AI blocks into executable provider-backed steps", () => {
    const steps = compileFlowDocumentToPipelineSteps({
      version: 1,
      blocks: [
        {
          id: "flow-start",
          type: "start",
          position: { x: 64, y: 200 },
          data: { label: "Start" },
        },
        {
          id: "ai-1",
          type: "ai",
          position: { x: 280, y: 160 },
          data: {
            label: "Summarize",
            provider: "openai",
            model: "gpt-4o-mini",
            prompt: "Summarize {{req1.response.body}}",
            systemPrompt: "You are concise.",
          },
        },
        {
          id: "request-1",
          type: "request",
          position: { x: 640, y: 160 },
          data: {
            auth: { type: "none" },
            body: null,
            bodyType: "none",
            headers: [],
            method: "GET",
            name: "Fetch data",
            params: [],
            url: "https://api.example.com/data",
          },
        },
      ],
      connections: [
        {
          id: "edge-start-ai",
          sourceBlockId: "flow-start",
          targetBlockId: "ai-1",
          sourceHandleId: "output",
          targetHandleId: "input",
          kind: "control",
        },
        {
          id: "edge-ai-request",
          sourceBlockId: "ai-1",
          targetBlockId: "request-1",
          sourceHandleId: "output",
          targetHandleId: "input",
          kind: "control",
        },
      ],
    });

    expect(steps).toHaveLength(2);
    expect(steps[0]).toMatchObject({
      id: "ai-1",
      method: "POST",
      stepType: "ai",
      url: "https://api.openai.com/v1/chat/completions",
    });
    expect(steps[1]).toMatchObject({
      id: "request-1",
      stepType: "request",
      upstreamStepIds: ["ai-1"],
    });
    expect(steps[0]?.body).toContain("Summarize {{req1.response.body}}");
  });

  it("suggests AI outputText for downstream requests", () => {
    const pipeline: Pipeline = {
      id: "pipeline-1",
      name: "AI chain",
      createdAt: "",
      updatedAt: "",
      narrativeConfig: { enabled: true, prompt: "", tone: "technical" },
      flow: { version: 1, blocks: [], connections: [] },
      steps: [
        {
          id: "ai-1",
          name: "Summarize",
          stepType: "ai",
          url: "https://api.openai.com/v1/chat/completions",
          method: "POST",
          headers: [],
          params: [],
          body: "{}",
          bodyType: "json",
          auth: { type: "bearer", bearer: { token: "{{__luzo_ai_openai_api_key}}" } },
        },
        {
          id: "request-1",
          name: "Call API",
          stepType: "request",
          url: "https://api.example.com",
          method: "POST",
          headers: [],
          params: [],
          body: "{{req1.response.outputText}}",
          bodyType: "raw",
          auth: { type: "none" },
        },
      ],
    };

    const suggestions = getAutocompleteSuggestions(
      pipeline,
      "request-1",
      {},
      {
        req1: {
          response: {
            body: { choices: [{ message: { content: "hello" } }] },
            outputText: "hello",
            status: 200,
          },
        },
      },
    );

    expect(suggestions.some((entry) => entry.path === "req1.response.outputText")).toBe(true);
  });

  it("suggests upstream request fields for evaluate nodes", () => {
    const pipeline: Pipeline = {
      id: "pipeline-2",
      name: "Conditional flow",
      createdAt: "",
      updatedAt: "",
      narrativeConfig: { enabled: true, prompt: "", tone: "technical" },
      flow: {
        version: 1,
        blocks: [
          { id: "flow-start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
          {
            id: "request-1",
            type: "request",
            position: { x: 120, y: 0 },
            data: {
              auth: { type: "none" },
              body: null,
              bodyType: "none",
              headers: [],
              method: "GET",
              name: "Fetch users",
              params: [],
              url: "https://api.example.com/users",
            },
          },
          {
            id: "condition-1",
            type: "evaluate",
            position: { x: 280, y: 0 },
            data: { conditionType: "if", expression: "", label: "Check first user" },
          },
        ],
        connections: [
          {
            id: "start-request",
            sourceBlockId: "flow-start",
            targetBlockId: "request-1",
            sourceHandleId: "output",
            targetHandleId: "input",
            kind: "control",
          },
          {
            id: "request-condition",
            sourceBlockId: "request-1",
            targetBlockId: "condition-1",
            sourceHandleId: "success",
            targetHandleId: "input",
            kind: "control",
          },
        ],
      },
      steps: [
        {
          id: "request-1",
          name: "Fetch users",
          stepType: "request",
          url: "https://api.example.com/users",
          method: "GET",
          headers: [],
          params: [],
          body: null,
          bodyType: "none",
          auth: { type: "none" },
        },
      ],
    };

    const suggestions = getFlowNodeAutocompleteSuggestions(
      pipeline,
      "condition-1",
      {},
      {
        req1: {
          response: {
            status: 200,
            body: { users: [{ id: 1, name: "Ada" }] },
          },
        },
      },
    );

    expect(suggestions.some((entry) => entry.path === "req1.response.body.users[0].id")).toBe(true);
  });

  it("suggests both branches' requests for an evaluate after a success-branch request", () => {
    // flow-start → req-a(/users) → cond-1 → [true] req-b(/user/1) → eval-2
    //                                       → [false] req-c(/recipes)
    const flow = {
      version: 1 as const,
      blocks: [
        {
          id: "flow-start",
          type: "start" as const,
          position: { x: 0, y: 200 },
          data: { label: "Start" },
        },
        {
          id: "req-a",
          type: "request" as const,
          position: { x: 280, y: 160 },
          data: {
            auth: { type: "none" as const },
            body: null,
            bodyType: "none" as const,
            headers: [],
            method: "GET" as const,
            name: "Fetch users",
            params: [],
            url: "/users",
          },
        },
        {
          id: "cond-1",
          type: "evaluate" as const,
          position: { x: 640, y: 160 },
          data: { conditionType: "if" as const, expression: "", label: "Check" },
        },
        {
          id: "req-b",
          type: "request" as const,
          position: { x: 1000, y: 80 },
          data: {
            auth: { type: "none" as const },
            body: null,
            bodyType: "none" as const,
            headers: [],
            method: "GET" as const,
            name: "New Request",
            params: [],
            url: "/user/1",
          },
        },
        {
          id: "req-c",
          type: "request" as const,
          position: { x: 1000, y: 300 },
          data: {
            auth: { type: "none" as const },
            body: null,
            bodyType: "none" as const,
            headers: [],
            method: "GET" as const,
            name: "New Request",
            params: [],
            url: "/recipes",
          },
        },
        {
          id: "eval-2",
          type: "evaluate" as const,
          position: { x: 1360, y: 80 },
          data: { conditionType: "if" as const, expression: "", label: "Check user" },
        },
      ],
      connections: [
        {
          id: "c1",
          sourceBlockId: "flow-start",
          targetBlockId: "req-a",
          sourceHandleId: "output",
          targetHandleId: "input",
          kind: "control" as const,
        },
        {
          id: "c2",
          sourceBlockId: "req-a",
          targetBlockId: "cond-1",
          sourceHandleId: "success",
          targetHandleId: "input",
          kind: "control" as const,
        },
        {
          id: "c3",
          sourceBlockId: "cond-1",
          targetBlockId: "req-b",
          sourceHandleId: "true",
          targetHandleId: "input",
          kind: "control" as const,
        },
        {
          id: "c4",
          sourceBlockId: "cond-1",
          targetBlockId: "req-c",
          sourceHandleId: "false",
          targetHandleId: "input",
          kind: "control" as const,
        },
        {
          id: "c5",
          sourceBlockId: "req-b",
          targetBlockId: "eval-2",
          sourceHandleId: "success",
          targetHandleId: "input",
          kind: "control" as const,
        },
      ],
    };

    // Use the real compilation function, just like the app does via syncPipelineGraph
    const steps = compileFlowDocumentToPipelineSteps(flow);
    const pipeline: Pipeline = {
      id: "p-branch",
      name: "Branch test",
      createdAt: "",
      updatedAt: "",
      narrativeConfig: { enabled: true, prompt: "", tone: "technical" },
      flow,
      steps,
    };

    const suggestions = getFlowNodeAutocompleteSuggestions(pipeline, "eval-2", {}, {});
    const aliases = new Set(suggestions.map((s) => s.sourceAlias).filter(Boolean));

    // req-a (/users) must appear — it is an ancestor of eval-2 via cond-1 → req-b
    expect(aliases.has("req1")).toBe(true);
    // req-b (/user/1) must appear — it is the direct parent of eval-2
    expect(aliases.has("req2")).toBe(true);
    // req-c (/recipes) must NOT appear — it is on the failure branch, not an ancestor of eval-2
    expect(aliases.has("req3")).toBe(false);
  });
});
