import { describe, expect, it } from "vitest";
import { evaluateConditionStep } from "@/features/pipeline/condition-evaluator";
import { toRuntimeValue } from "@/features/pipeline/pipeline-execution-mappers";
import type { ConditionNodeConfig } from "@/types/workflow";

function conditionConfig(expression: string): ConditionNodeConfig {
  return {
    kind: "condition",
    label: "Status gate",
    rules: [],
    expression,
  };
}

describe("condition evaluator expression mode", () => {
  it("evaluates literal true expression", () => {
    const result = evaluateConditionStep(conditionConfig("true"), {}, {});
    expect(result.result).toBe(true);
  });

  it("evaluates standard req alias expressions", () => {
    const runtime = {
      req1: {
        response: {
          status: 200,
        },
      },
    };
    const result = evaluateConditionStep(
      conditionConfig("req1.response.status === 200"),
      runtime,
      {},
    );

    expect(result.result).toBe(true);
  });

  it("supports expressions that reference non-identifier runtime keys", () => {
    const runtime = {
      "request-1": {
        response: {
          status: 200,
        },
      },
      req1: {
        response: {
          status: 200,
        },
      },
    };
    const result = evaluateConditionStep(
      conditionConfig("request-1.response.status === 200"),
      runtime,
      {},
    );

    expect(result.result).toBe(true);
  });

  it("evaluates env-scoped expressions", () => {
    const result = evaluateConditionStep(conditionConfig('env.FLAG === "on"'), {}, { FLAG: "on" });
    expect(result.result).toBe(true);
  });

  it("evaluates nested body array paths", () => {
    const runtime = {
      req1: {
        response: {
          body: {
            users: [{ id: 1 }],
          },
        },
      },
    };

    const result = evaluateConditionStep(
      conditionConfig("req1.response.body.users[0].id == 1"),
      runtime,
      {},
    );

    expect(result.result).toBe(true);
  });

  it("evaluates nested body paths when response body is encoded JSON", () => {
    const runtime = {
      req1: toRuntimeValue({
        status: 200,
        statusText: "OK",
        headers: {},
        body: '"{\\"users\\":[{\\"id\\":1}]}"',
        time: 10,
        size: 32,
      }),
    };

    const result = evaluateConditionStep(
      conditionConfig("req1.response.body.users[0].id == 1"),
      runtime,
      {},
    );

    expect(result.result).toBe(true);
  });
});
