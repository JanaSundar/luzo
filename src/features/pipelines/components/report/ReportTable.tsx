import { cn } from "@/utils";

type ReportRenderMode = "preview" | "pdf";

interface PerformanceMetric {
  stepName: string;
  url: string;
  statusCode?: number | null;
  latencyMs?: number | null;
  sizeBytes?: number | null;
}

export function PerformanceAppendixTable({
  metrics,
  mode = "preview",
}: {
  metrics: PerformanceMetric[];
  mode?: ReportRenderMode;
}) {
  if (!metrics?.length) return null;

  if (mode === "pdf") {
    return <PdfMetricTable metrics={metrics} />;
  }

  return <PreviewMetricTable metrics={metrics} />;
}

/* ---- PDF variant ---- */

function PdfMetricTable({ metrics }: { metrics: PerformanceMetric[] }) {
  const groups = Array.from({ length: Math.ceil(metrics.length / 6) }, (_, i) =>
    metrics.slice(i * 6, i * 6 + 6),
  );

  return (
    <div className="space-y-4">
      {groups.map((group, gi) => (
        <div
          key={`pdf-g-${gi}`}
          className="break-inside-avoid-page overflow-hidden border border-border/60 bg-transparent"
        >
          <MetricTableHeader />
          <div className="divide-y divide-border/30">
            {group.map((m, ri) => (
              <MetricRow
                key={`pdf-r-${gi}-${ri}-${m.stepName}`}
                metric={m}
                urlClass="whitespace-normal break-all"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---- Preview variant ---- */

function PreviewMetricTable({ metrics }: { metrics: PerformanceMetric[] }) {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-border/45 bg-background">
      <table className="w-full border-collapse text-left">
        <thead className="border-b border-border/40 bg-muted/10">
          <tr>
            <Th className="w-[50%]">Endpoint</Th>
            <Th className="w-[15%] text-center">Status</Th>
            <Th className="w-[15%] text-right">Latency</Th>
            <Th className="w-[20%] text-right">Size</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {metrics.map((m, i) => (
            <tr key={`prev-${i}-${m.stepName}`} className="transition-colors hover:bg-muted/10">
              <td className="px-6 py-4">
                <div className="mb-1 text-[12px] font-semibold leading-none tracking-tight text-foreground">
                  {m.stepName}
                </div>
                <div className="truncate font-mono text-[9px] text-muted-foreground opacity-70">
                  {m.url}
                </div>
              </td>
              <td className="px-6 py-5 text-center">
                <StatusBadge statusCode={m.statusCode} />
              </td>
              <td className="px-6 py-5 text-right">
                <MetricValue value={m.latencyMs ?? 0} unit="ms" />
              </td>
              <td className="px-6 py-5 text-right">
                <MetricValue
                  value={m.sizeBytes ? (m.sizeBytes / 1024).toFixed(1) : "0.0"}
                  unit="KB"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---- Shared table primitives ---- */

function MetricTableHeader() {
  const cols = ["Endpoint", "Status", "Latency", "Size"];
  const align = ["", "text-center", "text-right", "text-right"];
  return (
    <div className="grid grid-cols-[minmax(0,2.6fr)_0.7fr_0.8fr_0.9fr] border-b border-border/40 bg-muted/10">
      {cols.map((col, i) => (
        <div
          key={col}
          className={cn(
            "px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground",
            align[i],
          )}
        >
          {col}
        </div>
      ))}
    </div>
  );
}

function MetricRow({ metric, urlClass }: { metric: PerformanceMetric; urlClass?: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,2.6fr)_0.7fr_0.8fr_0.9fr]">
      <div className="px-4 py-3">
        <div className="mb-1 text-[12px] font-semibold leading-none tracking-tight text-foreground">
          {metric.stepName}
        </div>
        <div className={cn("font-mono text-[9px] text-muted-foreground opacity-70", urlClass)}>
          {metric.url}
        </div>
      </div>
      <div className="px-4 py-4 text-center">
        <StatusBadge statusCode={metric.statusCode} />
      </div>
      <div className="px-4 py-4 text-right">
        <MetricValue value={metric.latencyMs ?? 0} unit="ms" />
      </div>
      <div className="px-4 py-4 text-right">
        <MetricValue
          value={metric.sizeBytes ? (metric.sizeBytes / 1024).toFixed(1) : "0.0"}
          unit="KB"
        />
      </div>
    </div>
  );
}

function StatusBadge({ statusCode }: { statusCode?: number | null }) {
  return (
    <span
      className={cn(
        "text-[10px] font-bold tabular-nums",
        statusCode && statusCode < 400 ? "text-emerald-600" : "text-rose-600",
      )}
    >
      {statusCode ?? "ERR"}
    </span>
  );
}

function MetricValue({ value, unit }: { value: string | number; unit: string }) {
  return (
    <>
      <span className="text-[12px] font-semibold tabular-nums text-foreground">{value}</span>
      <span className="ml-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
        {unit}
      </span>
    </>
  );
}

function Th({ children, className }: { children: string; className?: string }) {
  return (
    <th
      className={cn(
        "px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground",
        className,
      )}
    >
      {children}
    </th>
  );
}
