import React, { type ReactNode } from "react";
import { cn } from "@/utils";

type ReportRenderMode = "preview" | "pdf";

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
