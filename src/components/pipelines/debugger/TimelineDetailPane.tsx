"use client";

import { useEffect, useState } from "react";
import { METHOD_COLORS } from "@/utils/http";
import { cn } from "@/utils";
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

type DetailTab = "overview" | "request" | "response" | "error";

export function TimelineDetailPane({ event }: { event: TimelineEvent | null }) {
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  useEffect(() => {
    setActiveTab("overview");
  }, [event?.eventId]);

  if (!event) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm italic text-muted-foreground">
        Select a timeline event to view details
      </div>
    );
  }

  const visual = getStatusVisual(event.status);
  const tabs: DetailTab[] = event.errorSnapshot
    ? ["overview", "request", "response", "error"]
    : ["overview", "request", "response"];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b bg-muted/5 p-4">
        <div className="mb-1 flex items-center gap-3">
          <span className={cn("text-2xl font-bold tracking-tight", visual.color)}>
            {event.httpStatus
              ? `${event.httpStatus} ${event.outputSnapshot?.statusText ?? ""}`
              : visual.label}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className={cn("font-mono font-bold", METHOD_COLORS[event.method])}>
            {event.method}
          </span>
          <span className="truncate">{event.stepName}</span>
          {event.durationMs != null ? <span>· {formatDuration(event.durationMs)}</span> : null}
          {event.responseSize != null ? <span>· {formatBytes(event.responseSize)}</span> : null}
        </div>
      </div>

      <div className="border-b border-border/40 bg-muted/10 px-4 py-2.5">
        <nav
          role="tablist"
          aria-label="Event details"
          className="inline-flex min-w-0 max-w-full items-center gap-1 overflow-x-auto"
        >
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "h-8 shrink-0 rounded-full px-3 text-xs uppercase tracking-wider transition-colors",
                activeTab === tab
                  ? "bg-foreground text-background"
                  : "bg-background/70 text-muted-foreground",
              )}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="custom-scrollbar flex-1 overflow-auto p-4">
        {activeTab === "overview" ? <OverviewTab event={event} /> : null}
        {activeTab === "request" ? <RequestTab event={event} /> : null}
        {activeTab === "response" ? <ResponseTab event={event} /> : null}
        {activeTab === "error" ? <ErrorTab event={event} /> : null}
      </div>
    </div>
  );
}

function OverviewTab({ event }: { event: TimelineEvent }) {
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
        <MetaRow label="Step" value={event.stepName} />
        <MetaRow
          label="Status"
          value={getStatusVisual(event.status).label}
          className={getStatusVisual(event.status).color}
        />
        <MetaRow label="Method" value={event.method} className={METHOD_COLORS[event.method]} />
        <MetaRow label="URL" value={event.url} />
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

function RequestTab({ event }: { event: TimelineEvent }) {
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

function ResponseTab({ event }: { event: TimelineEvent }) {
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

function ErrorTab({ event }: { event: TimelineEvent }) {
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

function sizeLabel(body: string | null | undefined) {
  if (!body) return "0b";
  return formatBytes(new TextEncoder().encode(body).length);
}
