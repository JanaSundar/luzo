import React, { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ReportLayoutContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("w-full bg-white text-neutral-900 px-10 py-12 tracking-[0.01em]", className)}
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

export function ReportHeader({ title, children }: { title: string; children: ReactNode }) {
  return (
    <header className="mb-14 space-y-6">
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-neutral-400 mb-3">
          Technical Audit Report
        </p>

        <h1 className="text-[28px] font-black leading-tight text-neutral-900 tracking-tight max-w-[90%]">
          {title}
        </h1>
      </div>

      <div className="grid grid-cols-4 border border-neutral-200 overflow-hidden bg-neutral-50/50 divide-x divide-neutral-200">
        {React.Children.map(children, (child) => (
          <div className="flex-1">{child}</div>
        ))}
      </div>
    </header>
  );
}

export function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-4 space-y-0.5">
      <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-neutral-400">{label}</p>
      <p className="text-[20px] font-black text-neutral-900 tabular-nums">{value}</p>
    </div>
  );
}

/* ================= SECTIONS ================= */

export function ReportSection({ title, icon, children }: any) {
  if (!children) return null;

  return (
    <section className="mb-14 pb-10 border-b border-neutral-100 last:border-0 last:mb-0 last:pb-0">
      <div className="flex items-center gap-2.5 mb-6">
        {icon && <span className="text-neutral-400 scale-75 opacity-70">{icon}</span>}
        <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-900 opacity-60">
          {title}
        </h2>
      </div>

      <div className="text-[13px] leading-[1.6] text-neutral-700 font-medium space-y-5 max-w-[98%]">
        {children}
      </div>
    </section>
  );
}

/* ================= LIST ================= */

export function ReportList({ items }: { items?: ReactNode[] }) {
  if (!items?.length) return null;

  return (
    <ul className="space-y-5 mt-6 px-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-4 text-[15px] leading-[1.7] text-neutral-700 font-medium">
          <span className="mt-[6px] text-neutral-300 font-black scale-150 leading-none shrink-0">
            •
          </span>
          <div className="flex-1">{item}</div>
        </li>
      ))}
    </ul>
  );
}

/* ================= REQUEST CARD ================= */

export function RequestCard({ method, name, statusCode, latencyMs, url, children }: any) {
  return (
    <div className="mb-10 last:mb-0 border border-neutral-100 overflow-hidden bg-white">
      <div className="flex justify-between items-center px-6 py-4 bg-neutral-50/50 border-b border-neutral-100">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={cn(
              "text-[10px] px-2.5 py-1 rounded-full border font-black uppercase tracking-wider shrink-0",
              statusCode && statusCode < 400
                ? "text-emerald-700 border-emerald-200 bg-emerald-50/50"
                : "text-rose-700 border-rose-200 bg-rose-50/50",
            )}
          >
            {method} {statusCode ?? ""}
          </span>

          <span className="text-[13px] font-bold text-neutral-900 truncate tracking-tight">
            {name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-neutral-400 tabular-nums tracking-widest uppercase">
            {latencyMs ?? 0}ms
          </span>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-[1px] flex-1 bg-neutral-100" />
          <span className="text-[10px] font-mono text-neutral-300 truncate max-w-[80%] lowercase opacity-80">
            {url}
          </span>
          <div className="h-[1px] w-4 bg-neutral-100" />
        </div>

        <div className="text-[13px] leading-[1.6] text-neutral-700 font-medium selection:bg-neutral-900 selection:text-white">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ================= TABLE ================= */

export function PerformanceAppendixTable({ metrics }: { metrics: any[] }) {
  if (!metrics?.length) return null;

  return (
    <div className="border border-neutral-100 overflow-hidden bg-white">
      <table className="w-full text-left border-collapse">
        <thead className="bg-neutral-50/80 border-b border-neutral-100">
          <tr>
            <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest w-[50%]">
              Endpoint
            </th>
            <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest w-[15%] text-center">
              Status
            </th>
            <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest w-[15%] text-right">
              Latency
            </th>
            <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest w-[20%] text-right">
              Size
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-neutral-50">
          {metrics.map((m, i) => (
            <tr key={i} className="hover:bg-neutral-50/30 transition-colors">
              <td className="px-6 py-4">
                <div className="text-[12px] font-bold text-neutral-900 tracking-tight leading-none mb-1">
                  {m.stepName}
                </div>
                <div className="text-[9px] font-mono text-neutral-400 truncate opacity-70">
                  {m.url}
                </div>
              </td>

              <td className="px-6 py-5 text-center">
                <span
                  className={cn(
                    "text-[10px] font-bold tabular-nums",
                    m.statusCode && m.statusCode < 400 ? "text-emerald-600" : "text-rose-600",
                  )}
                >
                  {m.statusCode ?? "ERR"}
                </span>
              </td>

              <td className="px-6 py-5 text-right">
                <span className="text-[12px] font-bold text-neutral-900 tabular-nums">
                  {m.latencyMs ?? 0}
                </span>
                <span className="text-[9px] text-neutral-400 ml-1 font-black uppercase tracking-widest">
                  ms
                </span>
              </td>

              <td className="px-6 py-5 text-right">
                <span className="text-[12px] font-bold text-neutral-900 tabular-nums">
                  {m.sizeBytes ? (m.sizeBytes / 1024).toFixed(1) : "0.0"}
                </span>
                <span className="text-[9px] text-neutral-400 ml-1 font-black uppercase tracking-widest">
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
