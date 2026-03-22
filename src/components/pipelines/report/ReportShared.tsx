import React, { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ReportRenderMode = "preview" | "pdf";

interface ReportSectionProps {
  title: string;
  icon?: ReactNode;
  children?: ReactNode;
}

interface RequestCardProps {
  method: string;
  name: string;
  statusCode?: number | null;
  latencyMs?: number | null;
  url: string;
  children?: ReactNode;
}

interface PerformanceMetric {
  stepName: string;
  url: string;
  statusCode?: number | null;
  latencyMs?: number | null;
  sizeBytes?: number | null;
}

export function ReportLayoutContainer({
  children,
  className,
  mode = "preview",
}: {
  children: ReactNode;
  className?: string;
  mode?: ReportRenderMode;
}) {
  return (
    <div
      className={cn(
        mode === "pdf"
          ? "w-full bg-background px-0 py-0 text-foreground"
          : "w-full rounded-[2rem] border border-border/50 bg-background/90 px-6 py-8 text-foreground shadow-sm backdrop-blur sm:px-8 sm:py-10",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StaticHtml({ html }: { html: string }) {
  if (!html?.trim()) return null;

  return (
    <div
      className="text-[13px] leading-[1.7] text-neutral-600 space-y-4 font-medium"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/* ================= HEADER ================= */

export function ReportHeader({
  title,
  children,
  mode = "preview",
}: {
  title: string;
  children: ReactNode;
  mode?: ReportRenderMode;
}) {
  return (
    <header className={cn("space-y-6", mode === "pdf" ? "mb-10" : "mb-12")}>
      <div>
        <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
          Technical Audit Report
        </p>

        <h1 className="max-w-[90%] text-[28px] font-semibold leading-tight tracking-tight text-foreground">
          {title}
        </h1>
      </div>

      <div
        className={cn(
          mode === "pdf"
            ? "grid grid-cols-4 overflow-hidden border border-border"
            : "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
        )}
      >
        {React.Children.map(children, (child) => (
          <div className="flex-1">{child}</div>
        ))}
      </div>
    </header>
  );
}

export function ReportStat({
  label,
  value,
  mode = "preview",
}: {
  label: string;
  value: string;
  mode?: ReportRenderMode;
}) {
  return (
    <div
      className={cn(
        mode === "pdf"
          ? "border-r border-border bg-muted/20 px-4 py-3 last:border-r-0"
          : "rounded-2xl border border-border/50 bg-muted/15 px-4 py-3",
      )}
    >
      <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-[22px] font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

/* ================= SECTIONS ================= */

export function ReportSection({
  title,
  icon,
  children,
  mode = "preview",
}: ReportSectionProps & { mode?: ReportRenderMode }) {
  if (!children) return null;

  return (
    <section
      className={cn(
        mode === "pdf"
          ? "mb-8 border-b border-border/60 bg-transparent px-0 pb-6 last:mb-0 last:border-b-0 last:pb-0"
          : "mb-10 rounded-[1.5rem] border border-border/40 bg-background/75 p-6 last:mb-0",
      )}
    >
      <div className="mb-5 flex items-center gap-2.5">
        {icon && <span className="scale-75 text-muted-foreground opacity-70">{icon}</span>}
        <h2
          className={cn(
            mode === "pdf"
              ? "text-[11px] font-semibold tracking-[0.08em] text-foreground/75"
              : "text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground",
          )}
        >
          {title}
        </h2>
      </div>

      <div className="max-w-[98%] space-y-5 text-[13px] font-medium leading-[1.7] text-foreground/80">
        {children}
      </div>
    </section>
  );
}

/* ================= LIST ================= */

export function ReportList({ items }: { items?: ReactNode[] }) {
  if (!items?.length) return null;

  return (
    <ul className="mt-5 space-y-4 px-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-4 text-[15px] font-medium leading-[1.7] text-foreground/80">
          <span className="mt-[6px] shrink-0 text-muted-foreground/40 scale-150 leading-none font-black">
            •
          </span>
          <div className="flex-1">{item}</div>
        </li>
      ))}
    </ul>
  );
}

/* ================= REQUEST CARD ================= */

export function RequestCard({
  method,
  name,
  statusCode,
  latencyMs,
  url,
  children,
  mode = "preview",
}: RequestCardProps & { mode?: ReportRenderMode }) {
  const isSuccess = statusCode != null && statusCode < 400;

  return (
    <div
      className={cn(
        "mb-6 overflow-hidden last:mb-0",
        mode === "pdf"
          ? "break-inside-avoid-page border border-border/60 bg-transparent"
          : "rounded-[1.5rem] border border-border/45 bg-gradient-to-br from-background via-background to-muted/[0.18] shadow-[0_18px_40px_rgba(15,23,42,0.06)]",
      )}
    >
      <div
        className={cn(
          "border-b border-border/40 px-5 py-4",
          mode === "pdf" ? "bg-muted/5" : "bg-muted/10",
        )}
      >
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={cn(
                  "h-2.5 w-2.5 shrink-0 rounded-full",
                  isSuccess ? "bg-emerald-500" : "bg-rose-500",
                )}
              />
              <span className="truncate text-[15px] font-semibold tracking-tight text-foreground">
                {name}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
                  isSuccess
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                    : "border-rose-500/20 bg-rose-500/10 text-rose-600",
                )}
              >
                {method}
              </span>
              <span className="rounded-full border border-border/50 bg-background/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/70">
                Status {statusCode ?? "ERR"}
              </span>
              <span className="rounded-full border border-border/50 bg-background/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/70 tabular-nums">
                {latencyMs ?? 0}ms
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-5 py-5">
        <div
          className={cn(
            "rounded-xl border border-border/40 px-3 py-2",
            mode === "pdf" ? "bg-transparent" : "bg-background/75",
          )}
        >
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Endpoint
          </div>
          <div
            className={cn(
              "mt-1 font-mono text-[11px] text-muted-foreground",
              mode === "pdf" ? "break-all whitespace-normal" : "truncate",
            )}
          >
            {url}
          </div>
        </div>

        <div className="text-[13px] font-medium leading-[1.7] text-foreground/80 selection:bg-foreground selection:text-background">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ================= TABLE ================= */

export function PerformanceAppendixTable({
  metrics,
  mode = "preview",
}: {
  metrics: PerformanceMetric[];
  mode?: ReportRenderMode;
}) {
  if (!metrics?.length) return null;

  if (mode === "pdf") {
    const metricGroups = Array.from({ length: Math.ceil(metrics.length / 6) }, (_, index) =>
      metrics.slice(index * 6, index * 6 + 6),
    );

    return (
      <div className="space-y-4">
        {metricGroups.map((group, groupIndex) => (
          <div
            key={`pdf-metric-group-${groupIndex}`}
            className="break-inside-avoid-page overflow-hidden border border-border/60 bg-transparent"
          >
            <div className="grid grid-cols-[minmax(0,2.6fr)_0.7fr_0.8fr_0.9fr] border-b border-border/40 bg-muted/10">
              <div className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Endpoint
              </div>
              <div className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Status
              </div>
              <div className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Latency
              </div>
              <div className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Size
              </div>
            </div>

            <div className="divide-y divide-border/30">
              {group.map((metric, rowIndex) => (
                <div
                  key={`pdf-metric-row-${groupIndex}-${rowIndex}-${metric.stepName}`}
                  className="grid grid-cols-[minmax(0,2.6fr)_0.7fr_0.8fr_0.9fr]"
                >
                  <div className="px-4 py-3">
                    <div className="mb-1 text-[12px] font-semibold leading-none tracking-tight text-foreground">
                      {metric.stepName}
                    </div>
                    <div className="whitespace-normal break-all font-mono text-[9px] text-muted-foreground opacity-70">
                      {metric.url}
                    </div>
                  </div>

                  <div className="px-4 py-4 text-center">
                    <span
                      className={cn(
                        "text-[10px] font-bold tabular-nums",
                        metric.statusCode && metric.statusCode < 400
                          ? "text-emerald-600"
                          : "text-rose-600",
                      )}
                    >
                      {metric.statusCode ?? "ERR"}
                    </span>
                  </div>

                  <div className="px-4 py-4 text-right">
                    <span className="text-[12px] font-semibold tabular-nums text-foreground">
                      {metric.latencyMs ?? 0}
                    </span>
                    <span className="ml-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      ms
                    </span>
                  </div>

                  <div className="px-4 py-4 text-right">
                    <span className="text-[12px] font-semibold tabular-nums text-foreground">
                      {metric.sizeBytes ? (metric.sizeBytes / 1024).toFixed(1) : "0.0"}
                    </span>
                    <span className="ml-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      KB
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-border/45 bg-background">
      <table className="w-full border-collapse text-left">
        <thead className="border-b border-border/40 bg-muted/10">
          <tr>
            <th className="w-[50%] px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Endpoint
            </th>
            <th className="w-[15%] px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Status
            </th>
            <th className="w-[15%] px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Latency
            </th>
            <th className="w-[20%] px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Size
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-border/30">
          {metrics.map((metric, index) => (
            <tr
              key={`preview-metric-row-${index}-${metric.stepName}`}
              className="transition-colors hover:bg-muted/10"
            >
              <td className="px-6 py-4">
                <div className="mb-1 text-[12px] font-semibold leading-none tracking-tight text-foreground">
                  {metric.stepName}
                </div>
                <div className="truncate font-mono text-[9px] text-muted-foreground opacity-70">
                  {metric.url}
                </div>
              </td>

              <td className="px-6 py-5 text-center">
                <span
                  className={cn(
                    "text-[10px] font-bold tabular-nums",
                    metric.statusCode && metric.statusCode < 400
                      ? "text-emerald-600"
                      : "text-rose-600",
                  )}
                >
                  {metric.statusCode ?? "ERR"}
                </span>
              </td>

              <td className="px-6 py-5 text-right">
                <span className="text-[12px] font-semibold tabular-nums text-foreground">
                  {metric.latencyMs ?? 0}
                </span>
                <span className="ml-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  ms
                </span>
              </td>

              <td className="px-6 py-5 text-right">
                <span className="text-[12px] font-semibold tabular-nums text-foreground">
                  {metric.sizeBytes ? (metric.sizeBytes / 1024).toFixed(1) : "0.0"}
                </span>
                <span className="ml-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  KB
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
