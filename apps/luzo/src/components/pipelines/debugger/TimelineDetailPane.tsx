"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { JsonView } from "@/components/ui/JsonView";
import { useTimelineStore } from "@/lib/stores/useTimelineStore";
import { segmentedTabListClassName, segmentedTabTriggerClassName } from "@/lib/ui/segmentedTabs";
import { cn } from "@/lib/utils";
import { METHOD_COLORS } from "@/lib/utils/http";
import {
  isConditionTimelineEvent,
  isRequestTimelineEvent,
  type TimelineEvent,
} from "@/types/timeline-event";
import { formatBytes, formatDuration, formatTimestamp } from "@/lib/pipeline/timeline/format-utils";
import { getHttpStatusColor, getStatusVisual } from "@/lib/pipeline/timeline/status-config";

// ─── Tab types ──────────────────────────────────────────────────────
type DetailTab = "overview" | "request" | "response" | "error" | "decision";

// ─── Component ──────────────────────────────────────────────────────
interface TimelineDetailPaneProps {
  event: TimelineEvent | null;
}

export function TimelineDetailPane({ event }: TimelineDetailPaneProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  useEffect(() => {
    setActiveTab("overview");
  }, [event?.eventId]);

  if (!event) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm italic p-4">
        Select a timeline event to view details
      </div>
    );
  }

  const visual = getStatusVisual(event.status);
  const tabs: DetailTab[] = isConditionTimelineEvent(event)
    ? ["overview", "decision"]
    : ["overview", "request", "response"];
  if (isRequestTimelineEvent(event) && event.errorSnapshot) tabs.push("error");

  return (
    <div className="flex h-full flex-col min-h-0">
      {/* Header */}
      <div className="p-4 border-b bg-muted/5">
        <div className="flex items-center gap-3 mb-1">
          <span className={cn("text-2xl font-bold tracking-tight", visual.color)}>
            {isRequestTimelineEvent(event) && event.httpStatus
              ? `${event.httpStatus} ${event.outputSnapshot?.statusText ?? ""}`
              : isConditionTimelineEvent(event)
                ? (event.resultLabel ?? visual.label)
                : visual.label}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {isRequestTimelineEvent(event) ? (
            <span className={cn("font-mono font-bold", METHOD_COLORS[event.method])}>
              {event.method}
            </span>
          ) : (
            <span className="font-mono font-bold text-amber-600">CONDITION</span>
          )}
          <span className="truncate">{event.stepName}</span>
          {event.durationMs != null && <span>· {formatDuration(event.durationMs)}</span>}
          {isRequestTimelineEvent(event) && event.responseSize != null && (
            <span>· {formatBytes(event.responseSize)}</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border/40 bg-muted/10 px-4 py-2.5">
        <nav
          role="tablist"
          aria-label="Event details"
          className={cn(
            "inline-flex min-w-0 max-w-full items-center overflow-x-auto",
            segmentedTabListClassName,
          )}
        >
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={segmentedTabTriggerClassName(
                activeTab === tab,
                "h-8 shrink-0 whitespace-nowrap px-3 text-xs uppercase tracking-wider",
              )}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto custom-scrollbar p-4">
        {activeTab === "overview" && <OverviewTab event={event} />}
        {activeTab === "decision" && isConditionTimelineEvent(event) && (
          <DecisionTab event={event} />
        )}
        {activeTab === "request" && isRequestTimelineEvent(event) && <RequestTab event={event} />}
        {activeTab === "response" && isRequestTimelineEvent(event) && <ResponseTab event={event} />}
        {activeTab === "error" && isRequestTimelineEvent(event) && <ErrorTab event={event} />}
      </div>
    </div>
  );
}

// ─── Tab content components ─────────────────────────────────────────

function MetaRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex gap-4 py-2 border-b border-muted/20 last:border-0">
      <span className="text-xs font-mono text-muted-foreground min-w-[120px] shrink-0">
        {label}
      </span>
      <span className={cn("text-xs font-mono break-all", className)}>{value}</span>
    </div>
  );
}

function OverviewTab({ event }: { event: TimelineEvent }) {
  if (isConditionTimelineEvent(event)) {
    return <ConditionOverviewTab event={event} />;
  }
  if (!isRequestTimelineEvent(event)) {
    return <p className="text-xs text-muted-foreground italic">No overview data</p>;
  }

  const comparisonItems = [
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
      className: event.httpStatus != null ? getHttpStatusColor(event.httpStatus) : undefined,
    },
    {
      label: "Headers",
      value: `${Object.keys(event.inputSnapshot?.headers ?? {}).length} req / ${
        Object.keys(event.outputSnapshot?.headers ?? {}).length
      } res`,
    },
    {
      label: "Payload",
      value: `${getBodySizeLabel(event.inputSnapshot?.body)} req / ${getBodySizeLabel(event.outputSnapshot?.body)} res`,
    },
  ];

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2">
        {comparisonItems.map((item) => (
          <div key={item.label} className="rounded-lg border bg-muted/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {item.label}
            </p>
            <p className={cn("mt-1 text-xs font-mono break-all", item.className)}>{item.value}</p>
          </div>
        ))}
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
        {event.httpStatus != null && (
          <MetaRow
            label="HTTP Status"
            value={String(event.httpStatus)}
            className={getHttpStatusColor(event.httpStatus)}
          />
        )}
        {event.routeDecision?.chosenHandleId && (
          <MetaRow
            label="Route"
            value={
              event.routeDecision.chosenHandleId === "success" ? "Success route" : "Fail route"
            }
          />
        )}
        <MetaRow label="Started" value={formatTimestamp(event.startedAt)} />
        <MetaRow label="Ended" value={formatTimestamp(event.endedAt)} />
        <MetaRow label="Duration" value={formatDuration(event.durationMs)} />
        {event.responseSize != null && (
          <MetaRow label="Size" value={formatBytes(event.responseSize)} />
        )}
        {event.retryCount > 0 && <MetaRow label="Retries" value={String(event.retryCount)} />}
        {event.preRequestPassed != null && (
          <MetaRow label="Pre-request" value={event.preRequestPassed ? "✓ Passed" : "✗ Failed"} />
        )}
        {event.testsPassed != null && (
          <MetaRow label="Tests" value={event.testsPassed ? "✓ Passed" : "✗ Failed"} />
        )}
      </div>
    </div>
  );
}

function RequestTab({ event }: { event: Extract<TimelineEvent, { eventKind: "request" }> }) {
  const input = event.inputSnapshot;
  if (!input) return <p className="text-xs text-muted-foreground italic">No request data</p>;

  return (
    <div className="space-y-3">
      <PayloadSummaryCard
        title="Request summary"
        items={[
          { label: "Method", value: input.method, className: METHOD_COLORS[input.method] },
          { label: "URL", value: input.url },
          { label: "Headers", value: `${Object.keys(input.headers).length}` },
          { label: "Body", value: getBodySizeLabel(input.body) },
        ]}
      />
      <CopyableMetaRow label="URL" value={input.url} />
      <HeaderBlock headers={input.headers} />
      <BodyBlock title="Body" body={input.body} />
    </div>
  );
}

function ResponseTab({ event }: { event: Extract<TimelineEvent, { eventKind: "request" }> }) {
  const output = event.outputSnapshot;
  if (!output) return <p className="text-xs text-muted-foreground italic">No response data</p>;

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
      <BodyBlock title="Body" body={output.body} />
    </div>
  );
}

function ErrorTab({ event }: { event: Extract<TimelineEvent, { eventKind: "request" }> }) {
  const err = event.errorSnapshot;
  if (!err) return <p className="text-xs text-muted-foreground italic">No error data</p>;

  return (
    <div className="space-y-3">
      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-destructive mb-2">Error</h4>
        <p className="text-xs font-mono text-destructive break-all">{err.message}</p>
      </div>
      <MetaRow label="Step" value={err.stepName} />
      <MetaRow label="Step ID" value={err.stepId} />
      {event.retryCount > 0 && <MetaRow label="Retry attempts" value={String(event.retryCount)} />}
    </div>
  );
}

function ConditionOverviewTab({
  event,
}: {
  event: Extract<TimelineEvent, { eventKind: "condition" }>;
}) {
  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border bg-muted/10 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Expression
          </p>
          <p className="mt-1 text-xs font-mono break-all">{event.expressionSummary}</p>
        </div>
        <div className="rounded-lg border bg-muted/10 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Decision
          </p>
          <p className="mt-1 text-xs font-mono break-all">{event.resultLabel ?? "Pending"}</p>
        </div>
      </section>

      <div className="space-y-0">
        <MetaRow label="Condition" value={event.stepName} />
        <MetaRow label="Type" value={event.conditionType} />
        <MetaRow label="Expression" value={event.expression ?? "—"} />
        <MetaRow label="Status" value={getStatusVisual(event.status).label} />
        <MetaRow label="Selected path" value={event.chosenHandleId ?? "Pending"} />
        <MetaRow
          label="Downstream"
          value={`${event.affectedExecutedNodeIds.length} ran · ${event.affectedSkippedNodeIds.length} skipped`}
        />
        <MetaRow label="Started" value={formatTimestamp(event.startedAt)} />
        <MetaRow label="Resolved" value={formatTimestamp(event.resolvedAt)} />
      </div>
    </div>
  );
}

function DecisionTab({ event }: { event: Extract<TimelineEvent, { eventKind: "condition" }> }) {
  const focusRoute = useTimelineStore((state) => state.focusRoute);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/10 p-4">
        <p className="text-sm font-semibold">Why this path executed</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {event.resultLabel
            ? `${event.stepName} evaluated ${event.resultLabel.toLowerCase()}, so the ${event.chosenHandleId ?? "selected"} path continued.`
            : `${event.stepName} is waiting for downstream evidence before the path can be resolved.`}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {event.chosenRouteId && (
          <button
            type="button"
            className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700"
            onClick={() =>
              focusRoute({
                conditionEventId: event.eventId,
                routeId: event.chosenRouteId!,
                mode: "chosen",
              })
            }
          >
            Highlight selected path
          </button>
        )}
        {event.skippedRouteIds[0] && (
          <button
            type="button"
            className="rounded-md border border-muted-foreground/20 bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground"
            onClick={() =>
              focusRoute({
                conditionEventId: event.eventId,
                routeId: event.skippedRouteIds[0]!,
                mode: "skipped",
              })
            }
          >
            Inspect skipped path
          </button>
        )}
      </div>
      <MetaRow label="Selected route" value={event.chosenRouteId ?? "Pending"} />
      <MetaRow
        label="Skipped routes"
        value={event.skippedRouteIds.length > 0 ? event.skippedRouteIds.join(", ") : "—"}
      />
      <MetaRow
        label="Affected executed nodes"
        value={
          event.affectedExecutedNodeIds.length > 0 ? event.affectedExecutedNodeIds.join(", ") : "—"
        }
      />
      <MetaRow
        label="Affected skipped nodes"
        value={
          event.affectedSkippedNodeIds.length > 0 ? event.affectedSkippedNodeIds.join(", ") : "—"
        }
      />
      <MetaRow
        label="Shared downstream"
        value={
          event.sharedDownstreamNodeIds.length > 0 ? event.sharedDownstreamNodeIds.join(", ") : "—"
        }
      />
    </div>
  );
}

function CopyableMetaRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
  };

  return (
    <div className="rounded-lg border bg-muted/10 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-primary transition-colors hover:text-primary/80"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="text-xs font-mono break-all">{value}</p>
    </div>
  );
}

function HeaderBlock({ headers }: { headers: Record<string, string> }) {
  const headerText = useMemo(() => JSON.stringify(headers, null, 2), [headers]);

  return (
    <div className="rounded-lg border bg-muted/10 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Headers
          </p>
          <p className="text-[10px] text-muted-foreground">{Object.keys(headers).length} total</p>
        </div>
        <CopyButton label="Headers" value={headerText} />
      </div>
      {Object.keys(headers).length > 0 ? (
        <div className="space-y-0">
          {Object.entries(headers).map(([key, value]) => (
            <MetaRow key={key} label={key} value={value} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No headers</p>
      )}
    </div>
  );
}

function BodyBlock({ title, body }: { title: string; body: string | null }) {
  if (!body)
    return <p className="text-xs text-muted-foreground italic">No {title.toLowerCase()} data</p>;

  const parsed = tryParseJson(body);
  const displayText = parsed ? JSON.stringify(parsed, null, 2) : body;

  return (
    <div className="rounded-lg border bg-muted/10 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {title}
          </p>
          <p className="text-[10px] text-muted-foreground">{getBodySizeLabel(body)}</p>
        </div>
        <CopyButton label={title} value={displayText} />
      </div>
      <div className="max-h-[420px] overflow-hidden rounded-lg border bg-background">
        {parsed ? (
          <JsonView text={displayText} className="h-[320px]" fontScale="sm" />
        ) : (
          <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap break-all p-3 text-xs font-mono">
            {body}
          </pre>
        )}
      </div>
    </div>
  );
}

function PayloadSummaryCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: string; className?: string }>;
}) {
  return (
    <div className="rounded-lg border bg-muted/10 p-3">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-md border bg-background px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {item.label}
            </p>
            <p className={cn("mt-1 text-xs font-mono break-all", item.className)}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="inline-flex items-center gap-1 text-[10px] font-medium text-primary transition-colors hover:text-primary/80"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function getBodySizeLabel(body: string | null | undefined) {
  if (!body) return "0b";
  return formatBytes(new TextEncoder().encode(body).length);
}
