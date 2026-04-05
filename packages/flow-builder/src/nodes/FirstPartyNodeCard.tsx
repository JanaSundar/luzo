import type { FlowNode, RequestNode } from "@luzo/flow-types";
import { getNodeAccent, getNodeLabel } from "./cardUtils";
import {
  Badge,
  CardLayout,
  HintText,
  MiniBars,
  PreviewBox,
  RowSummary,
  UrlText,
} from "./firstPartyCardPrimitives";

export function FirstPartyNodeCard({ node }: { node: FlowNode }) {
  if (node.type === "start") {
    return (
      <CardLayout accent={getNodeAccent(node)} eyebrow="Entry" title={getNodeLabel(node)}>
        <HintText>Start of the flow graph</HintText>
      </CardLayout>
    );
  }

  if (node.type === "request") {
    return <RequestCard node={node} />;
  }

  if (node.type === "evaluate") {
    return (
      <CardLayout
        accent={getNodeAccent(node)}
        eyebrow="Logic"
        meta={node.data.conditionType}
        title={getNodeLabel(node)}
      >
        <PreviewBox mono>{node.data.expression?.trim() || "No expression configured"}</PreviewBox>
        <RowSummary
          items={[
            `${node.data.variables?.length ?? 0} variables`,
            node.data.hasFalseBranch ? "True + false" : "True branch",
          ]}
        />
      </CardLayout>
    );
  }

  if (node.type === "list") {
    return (
      <CardLayout
        accent={getNodeAccent(node)}
        eyebrow="Transform"
        meta="List"
        title={getNodeLabel(node)}
      >
        <RowSummary items={[`${node.data.itemCount ?? 0} items`, "Outputs sequence"]} />
      </CardLayout>
    );
  }

  if (node.type === "display") {
    return (
      <CardLayout
        accent={getNodeAccent(node)}
        eyebrow="Output"
        meta={node.data.chartType ?? "table"}
        title={getNodeLabel(node)}
      >
        <MiniBars />
      </CardLayout>
    );
  }

  if (node.type === "text") {
    return (
      <CardLayout accent={getNodeAccent(node)} eyebrow="Notes" title={getNodeLabel(node)}>
        <PreviewBox>{node.data.content.trim() || "Add canvas notes or instructions"}</PreviewBox>
      </CardLayout>
    );
  }

  if (node.type === "group") {
    return (
      <CardLayout accent={getNodeAccent(node)} eyebrow="Annotation" title={getNodeLabel(node)}>
        <PreviewBox>{node.data.color ?? "No color selected"}</PreviewBox>
      </CardLayout>
    );
  }

  return (
    <CardLayout accent={getNodeAccent(node)} eyebrow="Block" title={getNodeLabel(node)}>
      <HintText>Custom node renderer</HintText>
    </CardLayout>
  );
}

function RequestCard({ node }: { node: RequestNode }) {
  const meta = [
    node.data.paramCount ? `${node.data.paramCount} params` : null,
    node.data.headerCount ? `${node.data.headerCount} headers` : null,
    node.data.authType ? `Auth: ${node.data.authType}` : "Auth: none",
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <CardLayout
      accent={getNodeAccent(node)}
      eyebrow="Request"
      meta={node.data.executionState ?? "idle"}
      title={getNodeLabel(node)}
    >
      <div style={{ alignItems: "center", display: "flex", gap: 8, minWidth: 0 }}>
        <Badge>{node.data.method ?? "GET"}</Badge>
        <UrlText>{node.data.url?.trim() || "https://api.example.com"}</UrlText>
      </div>
      <RowSummary
        items={[
          meta || "No request details yet",
          node.data.bodyType ? `Body: ${node.data.bodyType}` : "Body: none",
        ]}
      />
    </CardLayout>
  );
}
