import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { useEffect, useRef } from "react";
import type { FlowTransform } from "@luzo/flow-types";

import { clamp } from "../utils/geometry";

interface UsePanZoomOptions {
  canvasRef: RefObject<HTMLDivElement | null>;
  transform: FlowTransform;
  setTransform: (transform: FlowTransform) => void;
}

export function usePanZoom({ canvasRef, transform, setTransform }: UsePanZoomOptions) {
  const isSpacePressedRef = useRef(false);
  const panStateRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startTransform: FlowTransform;
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") isSpacePressedRef.current = true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") isSpacePressedRef.current = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const root = canvasRef.current;
    if (!root) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = root.getBoundingClientRect();
      const pointX = event.clientX - rect.left;
      const pointY = event.clientY - rect.top;

      if (event.ctrlKey || event.metaKey) {
        const nextScale = clamp(transform.scale - event.deltaY * 0.0015, 0.2, 1.8);
        const scaleRatio = nextScale / transform.scale;
        const nextX = pointX - (pointX - transform.x) * scaleRatio;
        const nextY = pointY - (pointY - transform.y) * scaleRatio;
        setTransform({ x: nextX, y: nextY, scale: nextScale });
        return;
      }

      setTransform({
        ...transform,
        x: transform.x - event.deltaX,
        y: transform.y - event.deltaY,
      });
    };

    root.addEventListener("wheel", handleWheel, { passive: false });
    return () => root.removeEventListener("wheel", handleWheel);
  }, [canvasRef, setTransform, transform]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 1 && !(event.button === 0 && isSpacePressedRef.current)) {
      return;
    }

    panStateRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startTransform: transform,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const panState = panStateRef.current;
    if (!panState || panState.pointerId !== event.pointerId) return;

    setTransform({
      ...panState.startTransform,
      x: panState.startTransform.x + (event.clientX - panState.startClientX),
      y: panState.startTransform.y + (event.clientY - panState.startClientY),
    });
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panStateRef.current?.pointerId !== event.pointerId) return;
    panStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return { onPointerDown, onPointerMove, onPointerUp };
}
