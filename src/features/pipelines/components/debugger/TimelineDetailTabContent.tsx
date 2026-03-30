"use client";

import { METHOD_COLORS } from "@/utils/http";
import type { TimelineEvent } from "@/types/timeline-event";
import {
  formatBytes,
  formatDuration,
  formatTimestamp,
} from "@/features/pipeline/timeline/format-utils";
import { getHttpStatusColor, getStatusVisual } from "@/features/pipeline/timeline/status-config";
import {
  BodyBlock,
  CopyableMetaRow,
  HeaderBlock,
  MetaRow,
  PayloadSummaryCard,
} from "./TimelineDetailBlocks";
import { TimelineLineageTable } from "./TimelineLineageTable";
import type { TimelineLineageRow } from "./timelineLineageUtils";

export function OverviewTab({ event }: { event: TimelineEvent }) {
  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2">
        <PayloadSummaryCard
          title="Request summary"
          items={[
            { label: "Request", value: `${event.method} ${event.inputSnapshot?.url ?? event.url}` },
            {
              label: "Response",
              value:
                event.httpStatus != null
                  ? `${event.httpStatus} ${event.outputSnapshot?.statusText ?? ""}`.trim()
                  : getStatusVisual(event.status).label,
              className:
                event.httpStatus != null ? getHttpStatusColor(event.httpStatus) : undefined,
            },
            {
              label: "Headers",
              value: `${Object.keys(event.inputSnapshot?.headers ?? {}).length} req / ${Object.keys(event.outputSnapshot?.headers ?? {}).length} res`,
            },
            {
              label: "Payload",
              value: `${sizeLabel(event.inputSnapshot?.body)} req / ${sizeLabel(event.outputSnapshot?.body)} res`,
            },
          ]}
        />
      </section>
      <div className="space-y-0">
        {event.eventKind ? <MetaRow label="Event Kind" value={event.eventKind} /> : null}
        {event.summary ? <MetaRow label="Summary" value={event.summary} /> : null}
        <MetaRow label="Step" value={event.stepName} />
        <MetaRow
          label="Status"
          value={getStatusVisual(event.status).label}
          className={getStatusVisual(event.status).color}
        />
        <MetaRow label="Method" value={event.method} className={METHOD_COLORS[event.method]} />
        <MetaRow label="URL" value={event.url} />
        {event.routeSemantics ? <MetaRow label="Route" value={event.routeSemantics} /> : null}
        {event.attemptNumber != null ? (
          <MetaRow label="Attempt" value={String(event.attemptNumber)} />
        ) : null}
        {event.terminalReason ? (
          <MetaRow label="Terminal Reason" value={event.terminalReason} />
        ) : null}
        {event.targetStepId ? <MetaRow label="Target Step" value={event.targetStepId} /> : null}
        {event.skippedReason ? (
          <MetaRow label="Skipped Reason" value={event.skippedReason} />
        ) : null}
        {event.httpStatus != null ? (
          <MetaRow
            label="HTTP Status"
            value={String(event.httpStatus)}
            className={getHttpStatusColor(event.httpStatus)}
          />
        ) : null}
        <MetaRow label="Started" value={formatTimestamp(event.startedAt)} />
        <MetaRow label="Ended" value={formatTimestamp(event.endedAt)} />
        <MetaRow label="Duration" value={formatDuration(event.durationMs)} />
        {event.responseSize != null ? (
          <MetaRow label="Size" value={formatBytes(event.responseSize)} />
        ) : null}
        {event.retryCount > 0 ? <MetaRow label="Retries" value={String(event.retryCount)} /> : null}
        {event.preRequestPassed != null ? (
          <MetaRow label="Pre-request" value={event.preRequestPassed ? "✓ Passed" : "✗ Failed"} />
        ) : null}
        {event.postRequestPassed != null ? (
          <MetaRow label="Post-request" value={event.postRequestPassed ? "✓ Passed" : "✗ Failed"} />
        ) : null}
        {event.testsPassed != null ? (
          <MetaRow label="Tests" value={event.testsPassed ? "✓ Passed" : "✗ Failed"} />
        ) : null}
      </div>
    </div>
  );
}

export function RequestTab({ event }: { event: TimelineEvent }) {
  const input = event.inputSnapshot;
  if (!input) return <p className="text-xs italic text-muted-foreground">No request data</p>;

  return (
    <div className="space-y-3">
      <PayloadSummaryCard
        title="Request summary"
        items={[
          { label: "Method", value: input.method, className: METHOD_COLORS[input.method] },
          { label: "URL", value: input.url },
          { label: "Headers", value: `${Object.keys(input.headers).length}` },
          { label: "Body", value: sizeLabel(input.body) },
        ]}
      />
      <CopyableMetaRow label="URL" value={input.url} />
      <HeaderBlock headers={input.headers} />
      <BodyBlock title="Body" body={input.body} />
    </div>
  );
}

export function ResponseTab({ event }: { event: TimelineEvent }) {
  const output = event.outputSnapshot;
  if (!output) return <p className="text-xs italic text-muted-foreground">No response data</p>;

  return (
    <div className="space-y-3">
      <PayloadSummaryCard
        title="Response summary"
        items={[
          {
            label: "Status",
            value: `${output.status} ${output.statusText}`,
            className: getHttpStatusColor(output.status),
          },
          { label: "Latency", value: formatDuration(output.latencyMs) },
          { label: "Headers", value: `${Object.keys(output.headers).length}` },
          { label: "Body", value: formatBytes(output.sizeBytes) },
        ]}
      />
      <HeaderBlock headers={output.headers} />
      <BodyBlock title="Body" body={output.body} className="flex-1" />
    </div>
  );
}

export function ErrorTab({ event }: { event: TimelineEvent }) {
  const errorSnapshot = event.errorSnapshot;
  if (!errorSnapshot) return <p className="text-xs italic text-muted-foreground">No error data</p>;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
        <h4 className="mb-2 text-sm font-semibold text-destructive">Error</h4>
        <p className="break-all text-xs font-mono text-destructive">{errorSnapshot.message}</p>
      </div>
      <MetaRow label="Step" value={errorSnapshot.stepName} />
      <MetaRow label="Step ID" value={errorSnapshot.stepId} />
      {event.retryCount > 0 ? (
        <MetaRow label="Retry attempts" value={String(event.retryCount)} />
      ) : null}
    </div>
  );
}

export function LineageTab({ rows }: { rows: TimelineLineageRow[] }) {
  return (
    <div className="space-y-3">
      <PayloadSummaryCard
        title="Lineage summary"
        items={[
          { label: "References", value: String(rows.length) },
          { label: "Sensitive", value: String(rows.filter((row) => row.isSensitive).length) },
        ]}
      />
      <TimelineLineageTable rows={rows} />
    </div>
  );
}

function sizeLabel(body: string | null | undefined) {
  if (!body) return "0b";
  return formatBytes(new TextEncoder().encode(body).length);
}
