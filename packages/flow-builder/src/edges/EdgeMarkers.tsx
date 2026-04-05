export function EdgeMarkers() {
  return (
    <defs>
      <EdgeMarker color="var(--fb-edge-stroke, #475569)" id="flow-builder-edge-arrow-default" />
      <EdgeMarker
        color="var(--fb-edge-stroke-selected, #2563eb)"
        id="flow-builder-edge-arrow-selected"
      />
      <EdgeMarker
        color="var(--fb-edge-preview-stroke, #2563eb)"
        id="flow-builder-edge-arrow-variable"
      />
      <EdgeMarker
        color="var(--fb-edge-conditional-stroke, #d97706)"
        id="flow-builder-edge-arrow-conditional"
      />
      <EdgeMarker
        color="var(--fb-edge-success-stroke, #16a34a)"
        id="flow-builder-edge-arrow-success"
      />
      <EdgeMarker color="var(--fb-edge-fail-stroke, #dc2626)" id="flow-builder-edge-arrow-fail" />
    </defs>
  );
}

function EdgeMarker({ color, id }: { color: string; id: string }) {
  return (
    <marker
      id={id}
      markerHeight="5"
      markerUnits="strokeWidth"
      markerWidth="5"
      orient="auto-start-reverse"
      refX="4.4"
      refY="2.5"
    >
      <path
        d="M 0.9 0.9 L 4.2 2.5 L 0.9 4.1"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.1"
      />
    </marker>
  );
}
