import type { FlowTransform } from "@luzo/flow-types";

interface DotGridProps {
  transform: FlowTransform;
}

export function DotGrid({ transform }: DotGridProps) {
  const spacing = 24 * transform.scale;
  const dotSize = Math.max(1, 1.5 * transform.scale);

  return (
    <div
      aria-hidden="true"
      style={{
        backgroundColor: "var(--fb-canvas-bg, #f8f8f8)",
        backgroundImage: `radial-gradient(circle, var(--fb-grid-dot-color, #d0d0d0) ${dotSize}px, transparent ${dotSize}px)`,
        backgroundPosition: `${transform.x}px ${transform.y}px`,
        backgroundSize: `${spacing}px ${spacing}px`,
        inset: 0,
        position: "absolute",
      }}
    />
  );
}
