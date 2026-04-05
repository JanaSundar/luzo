import { useCallback, useRef } from "react";
import type { Pipeline } from "@/types";
import type { ControllerOptions } from "@/types/pipeline-runtime";
import { type DebugController, createDebugController } from "./debug-controller";

export function useDebugController(): DebugController {
  const controllerRef = useRef<DebugController | null>(null);

  if (!controllerRef.current) {
    controllerRef.current = createDebugController();
  }

  const start = useCallback(
    (pipeline: Pipeline, envVars: Record<string, string>, options: ControllerOptions) => {
      const controller = controllerRef.current;
      if (!controller) {
        return { valid: false, errors: ["Controller not initialized"] };
      }
      return controller.start(pipeline, envVars, options);
    },
    [],
  );

  const step = useCallback(async () => {
    await controllerRef.current?.step();
  }, []);
  const resume = useCallback(async () => {
    await controllerRef.current?.resume();
  }, []);
  const stop = useCallback(() => {
    controllerRef.current?.stop();
  }, []);
  const retry = useCallback(async () => {
    await controllerRef.current?.retry();
  }, []);

  return { start, step, resume, stop, retry };
}
