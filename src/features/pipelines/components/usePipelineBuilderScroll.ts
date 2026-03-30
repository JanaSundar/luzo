"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAnimationFrame, useMotionValue, useSpring } from "motion/react";
import type { Pipeline } from "@/types";

export function usePipelineBuilderScroll({
  pipeline,
  scrollContainerRef,
}: {
  pipeline: Pipeline | null;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const lastStepsCount = useRef(pipeline?.steps.length ?? 0);
  const scrollY = useMotionValue(0);
  const smoothScrollY = useSpring(scrollY, {
    stiffness: 70,
    damping: 20,
    restDelta: 0.5,
  });

  useAnimationFrame(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = smoothScrollY.get();
    }
  });

  const smoothScrollTo = useCallback(
    (target: number | HTMLElement) => {
      if (!scrollContainerRef.current) return;
      const container = scrollContainerRef.current;
      const startScroll = container.scrollTop;
      const endScroll =
        typeof target === "number"
          ? target
          : startScroll +
            (target.getBoundingClientRect().top - container.getBoundingClientRect().top) -
            container.clientHeight / 3;

      scrollY.set(startScroll);
      scrollY.set(
        Math.max(0, Math.min(endScroll, container.scrollHeight - container.clientHeight)),
      );
    },
    [scrollContainerRef, scrollY],
  );

  useEffect(() => {
    if (!pipeline) return;
    if (pipeline.steps.length > lastStepsCount.current) {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          smoothScrollTo(scrollContainerRef.current.scrollHeight);
        }
      }, 150);
    }
    lastStepsCount.current = pipeline.steps.length;
  }, [pipeline, scrollContainerRef, smoothScrollTo]);
}
