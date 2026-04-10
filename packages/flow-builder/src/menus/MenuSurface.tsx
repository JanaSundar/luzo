import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface MenuSurfaceProps {
  anchor: { x: number; y: number };
  /** "top" (default): menu top-left at anchor. "bottom": menu bottom-center at anchor. */
  anchorEdge?: "top" | "bottom";
  onClose: () => void;
  children: ReactNode;
}

const VIEWPORT_PADDING = 12;

export function MenuSurface({ anchor, anchorEdge = "top", onClose, children }: MenuSurfaceProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState(anchor);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    // For "bottom" edge: centre menu on anchor.x, bottom of menu at anchor.y.
    const rawLeft = anchorEdge === "bottom" ? anchor.x - rect.width / 2 : anchor.x;
    const rawTop = anchorEdge === "bottom" ? anchor.y - rect.height : anchor.y;
    const nextLeft = clamp(
      rawLeft,
      VIEWPORT_PADDING,
      window.innerWidth - rect.width - VIEWPORT_PADDING,
    );
    const nextTop = clamp(
      rawTop,
      VIEWPORT_PADDING,
      window.innerHeight - rect.height - VIEWPORT_PADDING,
    );

    if (nextLeft === position.x && nextTop === position.y) return;
    setPosition({ x: nextLeft, y: nextTop });
  }, [anchor, anchorEdge, position.x, position.y]);

  return (
    <div
      ref={ref}
      role="menu"
      style={{
        background: "var(--fb-node-bg, #fff)",
        border: "1px solid var(--fb-node-border, #e5e7eb)",
        borderRadius: 14,
        boxShadow: "0 24px 48px rgba(15, 23, 42, 0.16)",
        left: position.x,
        maxHeight: `calc(100vh - ${VIEWPORT_PADDING * 2}px)`,
        maxWidth: `calc(100vw - ${VIEWPORT_PADDING * 2}px)`,
        minWidth: 180,
        overflow: "auto",
        padding: 8,
        position: "fixed",
        top: position.y,
        zIndex: 40,
      }}
      tabIndex={-1}
    >
      {children}
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}
