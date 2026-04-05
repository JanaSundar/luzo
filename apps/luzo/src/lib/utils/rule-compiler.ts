import type { PostRequestRule, PreRequestRule, TestRule } from "@/types";

/**
 * Mappings for Pre-request actions
 */
const PRE_REQUEST_TEMPLATES: Record<
  PreRequestRule["type"],
  (key: string, value?: string) => string
> = {
  set_env_var: (k, v) => `lz.env.set(${JSON.stringify(k)}, ${JSON.stringify(v || "")});`,
  clear_env_var: (k) => `lz.env.unset(${JSON.stringify(k)});`,
  set_header: (k, v) =>
    `lz.request.headers.upsert(${JSON.stringify(k)}, ${JSON.stringify(v || "")});`,
  delete_header: (k) => `lz.request.headers.remove(${JSON.stringify(k)});`,
};

const POST_REQUEST_TEMPLATES: Record<
  PostRequestRule["type"],
  (key: string, value?: string) => string
> = {
  set_env_var: (k, v) => `lz.env.set(${JSON.stringify(k)}, ${JSON.stringify(v || "")});`,
  clear_env_var: (k) => `lz.env.unset(${JSON.stringify(k)});`,
  set_response_header: (k, v) =>
    `lz.response.headers.upsert(${JSON.stringify(k)}, ${JSON.stringify(v || "")});`,
  delete_response_header: (k) => `lz.response.headers.remove(${JSON.stringify(k)});`,
  set_response_body: (_k, v) => `lz.response.body.set(${JSON.stringify(v || "")});`,
};

/**
 * Target selectors helper
 */
const GET_TARGET_EXPR = (rule: TestRule): string => {
  switch (rule.target) {
    case "status_code":
      return "lz.response.status";
    case "response_time":
      return "lz.response.time";
    case "body_contains":
      return "lz.response.text()";
    case "header":
      return `lz.response.headers.get(${JSON.stringify(rule.property)})`;
    case "json_property":
      return `_.get(__jsonData, ${JSON.stringify(rule.property)})`;
    default:
      return "undefined";
  }
};

/**
 * Operator to Chai assertion mapping
 */
const OPERATOR_CHAI_MAP: Record<TestRule["operator"], (val: string, target: string) => string> = {
  equals: (v, t) => `lz.expect(${t}).to.equal(${v});`,
  not_equals: (v, t) => `lz.expect(${t}).to.not.equal(${v});`,
  contains: (v, t) => `lz.expect(${t}).to.include(${v});`,
  not_contains: (v, t) => `lz.expect(${t}).to.not.include(${v});`,
  greater_than: (v, t) => `lz.expect(Number(${t})).to.be.above(Number(${v}));`,
  less_than: (v, t) => `lz.expect(Number(${t})).to.be.below(Number(${v}));`,
  exists: (_, t) => `lz.expect(${t}).to.not.be.undefined;`,
  not_exists: (_, t) => `lz.expect(${t}).to.be.undefined;`,
};

export function compilePreRequestRules(rules: PreRequestRule[] | undefined): string {
  if (!rules || rules.length === 0) return "";
  return rules.map((r) => PRE_REQUEST_TEMPLATES[r.type](r.key, r.value)).join("\n");
}

export function compilePostRequestRules(rules: PostRequestRule[] | undefined): string {
  if (!rules || rules.length === 0) return "";
  return rules.map((r) => POST_REQUEST_TEMPLATES[r.type](r.key, r.value)).join("\n");
}

export function compileTestRules(rules: TestRule[] | undefined): string {
  if (!rules || rules.length === 0) return "";

  const lines: string[] = [];

  if (rules.some((r) => r.target === "json_property")) {
    lines.push(`var __jsonData = {};\ntry {\n  __jsonData = lz.response.json();\n} catch(e) {}\n`);
  }

  for (const rule of rules) {
    const testName = generateTestName(rule);
    const targetExpr = GET_TARGET_EXPR(rule);

    // Cast strings for comparison if it's text-based
    let valueExpr = JSON.stringify(rule.value || "");
    let finalTargetExpr = targetExpr;

    if (rule.target === "status_code" || rule.target === "response_time") {
      valueExpr = `Number(${valueExpr})`;
    } else if (
      rule.target === "json_property" &&
      !["greater_than", "less_than", "exists", "not_exists"].includes(rule.operator)
    ) {
      finalTargetExpr = `String(${targetExpr})`;
      valueExpr = `String(${valueExpr})`;
    }

    const testBody = OPERATOR_CHAI_MAP[rule.operator](valueExpr, finalTargetExpr);

    if (testName && testBody) {
      lines.push(`lz.test(${JSON.stringify(testName)}, function () {\n  ${testBody}\n});\n`);
    }
  }

  return lines.join("\n");
}

function generateTestName(rule: TestRule): string {
  const targetLabel = {
    status_code: "Status code",
    response_time: "Response time",
    header: `Header '${rule.property}'`,
    body_contains: "Body",
    json_property: `JSON Property '${rule.property}'`,
  }[rule.target];

  return `${targetLabel} ${rule.operator} ${rule.value || ""}`;
}
