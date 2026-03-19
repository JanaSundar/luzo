import type { GeneratorYield } from "@/types/pipeline-debug";
import type { PipelineRuntimeState } from "./usePipelineRuntimeStore";

type AsyncPipelineGenerator = AsyncGenerator<
  GeneratorYield,
  void,
  Record<string, string> | undefined
>;

type RuntimeSetter = (
  partial:
    | Partial<PipelineRuntimeState>
    | ((state: PipelineRuntimeState) => Partial<PipelineRuntimeState>)
) => void;

export async function advanceGenerator(
  generator: AsyncPipelineGenerator,
  variableOverrides: Record<string, string>
) {
  const next = await generator.next(variableOverrides);
  if (next.done || next.value.type !== "step_ready") {
    return next;
  }
  return generator.next(variableOverrides);
}

export function syncGeneratorState(
  result: IteratorResult<GeneratorYield, void>,
  set: RuntimeSetter
) {
  if (result.done) {
    set((state) => ({
      runtime:
        state.runtime.status === "aborted"
          ? state.runtime
          : { ...state.runtime, status: "completed", completedAt: new Date().toISOString() },
      generator: null,
    }));
    return;
  }

  const yielded = result.value;
  set((state) => ({
    snapshots: yielded.allSnapshots,
    runtimeVariables: yielded.snapshot.variables ?? state.runtimeVariables,
    runtime: {
      ...state.runtime,
      currentStepIndex: yielded.allSnapshots.filter(
        (snapshot) => snapshot.status !== "pending" && snapshot.status !== "running"
      ).length,
      status:
        yielded.type === "pipeline_complete"
          ? "completed"
          : yielded.type === "error"
            ? yielded.snapshot.status === "aborted"
              ? "aborted"
              : "failed"
            : "paused",
      completedAt:
        yielded.type === "pipeline_complete" || yielded.type === "error"
          ? new Date().toISOString()
          : null,
    },
    generator:
      yielded.type === "pipeline_complete" || yielded.type === "error" ? null : state.generator,
  }));
}

export function omitRecord(record: Record<string, string>, key: string) {
  const next = { ...record };
  delete next[key];
  return next;
}
