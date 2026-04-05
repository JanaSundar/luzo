import type { PipelineStep } from "@/types";
import type { ContextVariable, SignalGroup, StepAlias, StepSnapshot } from "@/types/pipeline-debug";
import { buildStepAliases } from "./dag-validator";
import { classifySensitivity } from "./sensitivity";
import { flattenObject } from "./variable-resolver";

const IMPORTANT_FIELD_PATTERNS = [
  /^response\.status$/,
  /^response\.time$/,
  /^response\.statusText$/,
  /\.id$/,
  /\.uuid$/,
  /\.code$/,
  /\.message$/,
  /\.error/,
  /\.name$/,
  /\.type$/,
  /\.count$/,
  /\.total$/,
  /\.success$/,
];

/**
 * Extract all context variables from step snapshots.
 * Returns a flat list grouped by step.
 */
export function extractSignals(snapshots: StepSnapshot[], steps: PipelineStep[]): SignalGroup[] {
  const aliases = buildStepAliases(steps);
  const aliasMap = new Map<string, StepAlias>();
  for (const a of aliases) aliasMap.set(a.stepId, a);

  const groups: SignalGroup[] = [];

  for (const snapshot of snapshots) {
    if (snapshot.status !== "success" && snapshot.status !== "error") continue;

    const alias = aliasMap.get(snapshot.stepId);
    if (!alias) continue;

    const variables: ContextVariable[] = [];

    variables.push({
      path: `${alias.alias}.response.status`,
      stepId: snapshot.stepId,
      label: "Status Code",
      value: snapshot.reducedResponse?.status ?? null,
      sensitivity: "low",
      autoSelected: true,
    });

    variables.push({
      path: `${alias.alias}.response.statusText`,
      stepId: snapshot.stepId,
      label: "Status Text",
      value: snapshot.reducedResponse?.statusText ?? null,
      sensitivity: "low",
      autoSelected: false,
    });

    variables.push({
      path: `${alias.alias}.response.latencyMs`,
      stepId: snapshot.stepId,
      label: "Latency",
      value: snapshot.reducedResponse?.latencyMs ?? null,
      sensitivity: "low",
      autoSelected: true,
    });

    variables.push({
      path: `${alias.alias}.response.sizeBytes`,
      stepId: snapshot.stepId,
      label: "Response Size",
      value: snapshot.reducedResponse?.sizeBytes ?? null,
      sensitivity: "low",
      autoSelected: false,
    });

    if (snapshot.reducedResponse?.headers) {
      for (const [key, value] of Object.entries(snapshot.reducedResponse.headers)) {
        const path = `${alias.alias}.response.headers.${key}`;
        variables.push({
          path,
          stepId: snapshot.stepId,
          label: `Header: ${key}`,
          value,
          sensitivity: classifySensitivity(key, value),
          autoSelected: false,
        });
      }
    }

    if (snapshot.reducedResponse?.summary) {
      const flattened = flattenObject(
        snapshot.reducedResponse.summary,
        `${alias.alias}.response.body`,
      );
      for (const { path, value } of flattened) {
        const lastKey = path.split(".").pop() ?? path;
        const sensitivity = classifySensitivity(lastKey, value);
        const isImportant = IMPORTANT_FIELD_PATTERNS.some((p) =>
          p.test(path.replace(`${alias.alias}.`, "")),
        );

        variables.push({
          path,
          stepId: snapshot.stepId,
          label: humanizeFieldPath(path, alias.alias),
          value,
          sensitivity,
          autoSelected: isImportant && sensitivity !== "high",
        });
      }
    }

    if (snapshot.error) {
      variables.push({
        path: `${alias.alias}.error`,
        stepId: snapshot.stepId,
        label: "Error",
        value: snapshot.error,
        sensitivity: "low",
        autoSelected: true,
      });
    }

    groups.push({
      stepId: snapshot.stepId,
      stepName: snapshot.stepName,
      method: snapshot.method,
      url: snapshot.resolvedRequest.url,
      variables,
    });
  }

  return groups;
}

/**
 * Get the default selection of signals: auto-select important + non-sensitive fields.
 */
export function getDefaultSelectedSignals(groups: SignalGroup[]): string[] {
  const selected: string[] = [];
  for (const group of groups) {
    for (const v of group.variables) {
      if (v.autoSelected && v.sensitivity !== "high") {
        selected.push(v.path);
      }
    }
  }
  return selected;
}

function humanizeFieldPath(path: string, alias: string): string {
  const stripped = path.replace(`${alias}.response.body.`, "").replace(`${alias}.`, "");
  return stripped
    .replace(/\./g, " → ")
    .replace(/\[0\]/g, "[first]")
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim();
}
