import { useCallback, useRef } from "react";
import type { Pipeline } from "@/types";
import type { ControllerOptions } from "@/types/pipeline-runtime";
import { DebugController } from "./debug-controller";

export function useDebugController() {
  const controllerRef = useRef<DebugController | null>(null);

  if (!controllerRef.current) {
    controllerRef.current = new DebugController();
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

  const step = useCallback(() => controllerRef.current?.step(), []);
  const resume = useCallback(() => controllerRef.current?.resume(), []);
  const stop = useCallback(() => controllerRef.current?.stop(), []);
  const retry = useCallback(() => controllerRef.current?.retry(), []);
  const skip = useCallback(() => controllerRef.current?.skip(), []);

  return { start, step, resume, stop, retry, skip };
}
