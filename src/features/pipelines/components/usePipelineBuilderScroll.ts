"use client";

import { useEffect, useRef } from "react";
import type { Pipeline } from "@/types";

export function usePipelineBuilderScroll({
  pipeline,
  scrollContainerRef,
}: {
  pipeline: Pipeline | null;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const lastStepsCount = useRef(pipeline?.steps.length ?? 0);
  const isAutoScrolling = useRef(false);

  useEffect(() => {
    if (!pipeline) return;
    if (pipeline.steps.length > lastStepsCount.current) {
      setTimeout(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        isAutoScrolling.current = true;
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
        // Clear the lock once the browser finishes the smooth scroll (~400ms is sufficient)
        setTimeout(() => {
          isAutoScrolling.current = false;
        }, 400);
      }, 150);
    }
    lastStepsCount.current = pipeline.steps.length;
  }, [pipeline, scrollContainerRef]);
}
