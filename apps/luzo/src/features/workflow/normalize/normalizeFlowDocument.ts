import type { FlowDocument, FlowEdgeRecord, FlowNodeRecord } from "@/types/workflow";

function compareNodes(a: FlowNodeRecord, b: FlowNodeRecord) {
  return a.id.localeCompare(b.id);
}

function compareEdges(a: FlowEdgeRecord, b: FlowEdgeRecord) {
  return a.id.localeCompare(b.id);
}

export function normalizeFlowDocument(flow: FlowDocument): FlowDocument {
  return {
    ...flow,
    viewport: {
      x: Number.isFinite(flow.viewport.x) ? flow.viewport.x : 0,
      y: Number.isFinite(flow.viewport.y) ? flow.viewport.y : 0,
      zoom: Number.isFinite(flow.viewport.zoom) ? flow.viewport.zoom : 1,
    },
    nodes: [...flow.nodes]
      .map((node) => ({
        ...node,
        geometry: {
          ...node.geometry,
          position: {
            x: Number.isFinite(node.geometry?.position?.x) ? node.geometry.position.x : 0,
            y: Number.isFinite(node.geometry?.position?.y) ? node.geometry.position.y : 0,
          },
        },
        position: {
          x: Number.isFinite(node.position?.x) ? node.position!.x : 0,
          y: Number.isFinite(node.position?.y) ? node.position!.y : 0,
        },
      }))
      .sort(compareNodes),
    edges: [...flow.edges].sort(compareEdges),
  };
}
