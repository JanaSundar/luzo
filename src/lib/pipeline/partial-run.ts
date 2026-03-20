import type { Pipeline } from "@/types";
import type {
  DebugSessionOptions,
  PartialExecutionMode,
  PersistedExecutionArtifact,
} from "@/types/pipeline-debug";
import { buildStepAliases } from "./dag-validator";
import {
  buildRuntimeVariablesFromArtifact,
  getRequiredPreviousAliases,
  isArtifactStale,
} from "./execution-artifacts";
import { collectStepDependencies } from "./template-dependencies";

export type AnyArtifact =
  | PersistedExecutionArtifact
  | {
      runtime: { mode: string };
      steps: Array<{ stepId: string }>;
      stepContextByAlias: Record<string, unknown>;
      generatedAt: string;
      pipelineStructureHash: string;
    };

export type ArtifactInput =
  | PersistedExecutionArtifact
  | {
      runtime: { mode: PartialExecutionMode | string };
      steps: Array<{ stepId: string }>;
      stepContextByAlias: Record<string, unknown>;
      generatedAt: string;
      pipelineStructureHash: string;
    }
  | null;

interface PartialRunPlanInput {
  pipeline: Pipeline;
  startStepId: string;
  mode: Extract<PartialExecutionMode, "partial-previous" | "partial-fresh">;
  artifact: ArtifactInput;
}

type PartialRunPlan =
  | { valid: true; options: DebugSessionOptions }
  | { valid: false; error: string };

export function planPartialPipelineRun({
  pipeline,
  startStepId,
  mode,
  artifact,
}: PartialRunPlanInput): PartialRunPlan {
  const stepAliases = buildStepAliases(pipeline.steps);
  const requiredAliases = getRequiredPreviousAliases(
    pipeline,
    startStepId,
    stepAliases,
    collectStepDependencies,
  );

  if (mode === "partial-fresh") {
    if (requiredAliases.length > 0) {
      return {
        valid: false,
        error: `Step requires previous data from ${formatAliases(requiredAliases, pipeline, stepAliases)}.`,
      };
    }

    return {
      valid: true,
      options: {
        startStepId,
        partialMode: "partial-fresh",
        reusedAliases: [],
      },
    };
  }

  if (!artifact) {
    return { valid: false, error: "No previous execution data available." };
  }

  const availableAliases = new Set(Object.keys(artifact.stepContextByAlias));
  const missingAliases = requiredAliases.filter((alias) => !availableAliases.has(alias));
  if (missingAliases.length > 0) {
    return {
      valid: false,
      error: `Step requires data from ${formatAliases(missingAliases, pipeline, stepAliases)}.`,
    };
  }

  return {
    valid: true,
    options: {
      startStepId,
      partialMode: "partial-previous",
      initialRuntimeVariables: buildRuntimeVariablesFromArtifact(
        artifact as PersistedExecutionArtifact,
        requiredAliases,
      ),
      reusedAliases: requiredAliases,
      staleContextWarning: isArtifactStale(artifact as PersistedExecutionArtifact, pipeline)
        ? `Using previous execution context from ${new Date(artifact.generatedAt).toLocaleString()}.`
        : null,
    },
  };
}

function formatAliases(
  aliasNames: string[],
  pipeline: Pipeline,
  stepAliases: ReturnType<typeof buildStepAliases>,
) {
  const stepNameByAlias = new Map(
    stepAliases.map((alias) => [
      alias.alias,
      pipeline.steps[alias.index]?.name || `Step ${alias.index + 1}`,
    ]),
  );

  return aliasNames.map((alias) => `${stepNameByAlias.get(alias) ?? alias} (${alias})`).join(", ");
}
