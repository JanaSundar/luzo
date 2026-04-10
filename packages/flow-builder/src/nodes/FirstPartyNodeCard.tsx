import type {
  AssertNode,
  DelayNode,
  FlowNode,
  ForEachNode,
  IfNode,
  LogNode,
  PollNode,
  RequestNode,
  SwitchNode,
  TransformNode,
  WebhookWaitNode,
} from "@luzo/flow-types";
import { getNodeAccent, getNodeLabel } from "./cardUtils";
import {
  Badge,
  CardLayout,
  HintText,
  MiniBars,
  PreviewBox,
  RouteBadge,
  RowSummary,
  SplitSummary,
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

  if (node.type === "if") {
    return <IfCard node={node} />;
  }

  if (node.type === "delay") {
    return <DelayCard node={node} />;
  }

  if (node.type === "forEach") {
    return <ForEachCard node={node} />;
  }

  if (node.type === "transform") {
    return (
      <CardLayout accent={getNodeAccent(node)} eyebrow="Data" title={getNodeLabel(node)}>
        <PreviewBox mono>
          {(node as TransformNode).data.script?.trim() || "No script configured"}
        </PreviewBox>
      </CardLayout>
    );
  }

  if (node.type === "log") {
    return (
      <CardLayout accent={getNodeAccent(node)} eyebrow="Debug" title={getNodeLabel(node)}>
        <PreviewBox>{(node as LogNode).data.message?.trim() || "No message configured"}</PreviewBox>
      </CardLayout>
    );
  }

  if (node.type === "assert") {
    return <AssertCard node={node as AssertNode} />;
  }

  if (node.type === "webhookWait") {
    return <WebhookWaitCard node={node as WebhookWaitNode} />;
  }

  if (node.type === "poll") {
    return <PollCard node={node as PollNode} />;
  }

  if (node.type === "switch") return <SwitchCard node={node as SwitchNode} />;

  if (node.type === "end") {
    return (
      <CardLayout accent={getNodeAccent(node)} eyebrow="Terminal" title={getNodeLabel(node)}>
        <HintText>Terminates this branch</HintText>
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

function IfCard({ node }: { node: IfNode }) {
  return (
    <CardLayout accent={getNodeAccent(node)} eyebrow="Logic" title={getNodeLabel(node)}>
      <PreviewBox mono>{node.data.expression?.trim() || "Add a boolean expression"}</PreviewBox>
      <SplitSummary
        leading={<RouteBadge tone="success">True</RouteBadge>}
        trailing={
          node.data.hasFalseBranch ? (
            <RouteBadge tone="danger">False</RouteBadge>
          ) : (
            <RouteBadge tone="neutral">False idle</RouteBadge>
          )
        }
      />
    </CardLayout>
  );
}

function DelayCard({ node }: { node: DelayNode }) {
  const ms = node.data.durationMs ?? 0;
  const label = ms >= 1000 ? `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s` : `${ms}ms`;

  return (
    <CardLayout accent={getNodeAccent(node)} eyebrow="Control" title={getNodeLabel(node)}>
      <SplitSummary
        leading={<Badge>Pause</Badge>}
        trailing={<RouteBadge tone="neutral">{label}</RouteBadge>}
      />
      <HintText>Hold execution, then continue down the single outgoing path.</HintText>
    </CardLayout>
  );
}

function ForEachCard({ node }: { node: ForEachNode }) {
  return (
    <CardLayout accent={getNodeAccent(node)} eyebrow="Iteration" title={getNodeLabel(node)}>
      <PreviewBox mono>
        {node.data.collectionPath?.trim() || "Point this at an array value"}
      </PreviewBox>
      {node.data.mapExpression?.trim() ? (
        <HintText>Applies a map expression to each item.</HintText>
      ) : null}
    </CardLayout>
  );
}

function AssertCard({ node }: { node: AssertNode }) {
  return (
    <CardLayout accent={getNodeAccent(node)} eyebrow="Validation" title={getNodeLabel(node)}>
      <PreviewBox mono>{node.data.expression?.trim() || "No expression configured"}</PreviewBox>
      <RowSummary items={["Halts pipeline on failure"]} />
    </CardLayout>
  );
}

function WebhookWaitCard({ node }: { node: WebhookWaitNode }) {
  const timeoutSec = ((node.data.timeoutMs ?? 300_000) / 1000).toFixed(0);
  return (
    <CardLayout accent={getNodeAccent(node)} eyebrow="Async" title={getNodeLabel(node)}>
      <SplitSummary
        leading={<Badge>Paused</Badge>}
        trailing={<RouteBadge tone="neutral">{timeoutSec}s timeout</RouteBadge>}
      />
      <HintText>Suspends the branch until an inbound webhook resumes it.</HintText>
    </CardLayout>
  );
}

function PollCard({ node }: { node: PollNode }) {
  const attempts = node.data.maxAttempts ?? 10;
  const intervalSec = ((node.data.intervalMs ?? 2_000) / 1000).toFixed(
    (node.data.intervalMs ?? 2_000) % 1000 === 0 ? 0 : 1,
  );
  return (
    <CardLayout accent={getNodeAccent(node)} eyebrow="Control flow" title={getNodeLabel(node)}>
      <PreviewBox mono>
        {node.data.stopCondition?.trim() || "Stop when this turns truthy"}
      </PreviewBox>
      <RowSummary
        items={[`Every ${intervalSec}s`, `Max ${attempts} attempt${attempts === 1 ? "" : "s"}`]}
      />
    </CardLayout>
  );
}

function SwitchCard({ node }: { node: SwitchNode }) {
  const n = (node.data.cases ?? []).filter((c) => !c.isDefault).length;
  return (
    <CardLayout accent={getNodeAccent(node)} eyebrow="Logic" title={getNodeLabel(node)}>
      <RowSummary items={[`${n} case${n === 1 ? "" : "s"}`, "Evaluates top-to-bottom"]} />
      <HintText>Default branch fires when no case matches.</HintText>
    </CardLayout>
  );
}
