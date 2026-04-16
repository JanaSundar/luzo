"use client";

import { METHOD_COLORS } from "@/utils/http";
import type { StepRunDiff } from "@/types/pipeline-debug";
import type { TimelineEvent } from "@/types/timeline-event";
import { usePipelineStore } from "@/stores/usePipelineStore";
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
import { buildPipelineStepNameMap, resolveTimelineDisplayName } from "./timelineDisplayNames";

export function OverviewTab({ event }: { event: TimelineEvent }) {
  const activePipelineId = usePipelineStore((state) => state.activePipelineId);
  const pipeline = usePipelineStore(
    (state) => state.pipelines.find((entry) => entry.id === activePipelineId) ?? null,
  );
  const stepNameById = buildPipelineStepNameMap(pipeline);
  const displayStepName = resolveTimelineDisplayName({
    stepId: event.stepId,
    fallback: event.stepName,
    stepNameById,
  });
  const targetStepName = usePipelineStore((state) => {
    const pipeline = state.pipelines.find((entry) => entry.id === activePipelineId);
    return pipeline?.steps.find((step) => step.id === event.targetStepId)?.name ?? null;
  });

  const isCondition = event.eventKind === "condition_evaluated";

  return (
    <div className="space-y-4">
      {isCondition ? (
        <ConditionSummarySection event={event} />
      ) : (
        <section className="grid gap-3 md:grid-cols-2">
          <PayloadSummaryCard
            title="Request summary"
            items={[
              {
                label: "Request",
                value: `${event.method} ${event.inputSnapshot?.url ?? event.url}`,
              },
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
      )}
      <div className="space-y-0">
        {event.eventKind ? <MetaRow label="Event Kind" value={event.eventKind} /> : null}
        {event.summary ? <MetaRow label="Summary" value={event.summary} /> : null}
        <MetaRow label="Step" value={displayStepName} />
        <MetaRow
          label="Status"
          value={getStatusVisual(event.status).label}
          className={getStatusVisual(event.status).color}
        />
        {!isCondition && (
          <MetaRow label="Method" value={event.method} className={METHOD_COLORS[event.method]} />
        )}
        {!isCondition && <MetaRow label="URL" value={event.url} />}
        {event.routeSemantics ? <MetaRow label="Route" value={event.routeSemantics} /> : null}
        {event.attemptNumber != null ? (
          <MetaRow label="Attempt" value={String(event.attemptNumber)} />
        ) : null}
        {event.terminalReason ? (
          <MetaRow label="Terminal Reason" value={event.terminalReason} />
        ) : null}
        {event.targetStepId ? (
          <MetaRow label="Target Step" value={targetStepName ?? "Selected request"} />
        ) : null}
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

function ConditionSummarySection({ event }: { event: TimelineEvent }) {
  const resultIsTrue = event.routeSemantics === "true";
  const resolvedInputs = (event.metadata?.resolvedInputs ?? {}) as Record<string, unknown>;
  const inputEntries = Object.entries(resolvedInputs);

  return (
    <section className="space-y-3">
      <PayloadSummaryCard
        title="Condition summary"
        items={[
          {
            label: "Result",
            value: resultIsTrue ? "✓ True" : "✗ False",
            className: resultIsTrue ? "text-emerald-600" : "text-rose-500",
          },
          {
            label: "Route taken",
            value: resultIsTrue ? "True path" : "False path",
          },
        ]}
      />
      {inputEntries.length > 0 && (
        <div className="rounded-lg border bg-muted/10 p-3">
          <p className="mb-3 text-xs font-medium text-muted-foreground">Resolved inputs</p>
          <div className="space-y-0">
            {inputEntries.map(([key, value]) => (
              <MetaRow key={key} label={key} value={String(value)} />
            ))}
          </div>
        </div>
      )}
    </section>
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
  const activePipelineId = usePipelineStore((state) => state.activePipelineId);
  const pipeline = usePipelineStore(
    (state) => state.pipelines.find((entry) => entry.id === activePipelineId) ?? null,
  );
  const stepNameById = buildPipelineStepNameMap(pipeline);
  const displayStepName = resolveTimelineDisplayName({
    stepId: errorSnapshot.stepId,
    fallback: errorSnapshot.stepName,
    stepNameById,
  });

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
        <h4 className="mb-2 text-sm font-semibold text-destructive">Error</h4>
        <p className="break-all text-xs font-mono text-destructive">{errorSnapshot.message}</p>
      </div>
      <MetaRow label="Step" value={displayStepName} />
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

export function DiffTab({ stepDiff }: { stepDiff: StepRunDiff | null }) {
  if (!stepDiff) {
    return <p className="text-xs italic text-muted-foreground">No baseline diff available.</p>;
  }

  return (
    <div className="space-y-3">
      <PayloadSummaryCard
        title="Baseline diff"
        items={[
          { label: "Severity", value: stepDiff.severity },
          {
            label: "Matched baseline",
            value: stepDiff.isMatched ? "Yes" : "No",
          },
          {
            label: "Latency delta",
            value:
              stepDiff.latencyDeltaMs != null
                ? `${stepDiff.latencyDeltaMs > 0 ? "+" : ""}${stepDiff.latencyDeltaMs}ms`
                : "n/a",
          },
          { label: "Changes", value: String(stepDiff.changes.length) },
        ]}
      />
      {stepDiff.changes.length === 0 ? (
        <div className="rounded-lg border bg-muted/10 px-3 py-2 text-sm text-muted-foreground">
          This request matches the pinned baseline.
        </div>
      ) : (
        <div className="space-y-2">
          {stepDiff.changes.map((change) => (
            <div
              key={`${change.kind}:${change.message}`}
              className="rounded-lg border border-border/50 bg-background px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{change.message}</p>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {change.severity}
                </span>
              </div>
              {change.before !== undefined || change.after !== undefined ? (
                <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <div className="rounded-md border border-border/40 bg-muted/10 px-2 py-1.5">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.14em]">
                      Baseline
                    </span>
                    <span>{String(change.before ?? "n/a")}</span>
                  </div>
                  <div className="rounded-md border border-border/40 bg-muted/10 px-2 py-1.5">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.14em]">
                      Current
                    </span>
                    <span>{String(change.after ?? "n/a")}</span>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
