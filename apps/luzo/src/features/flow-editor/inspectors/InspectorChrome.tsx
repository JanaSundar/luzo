"use client";

import type { ReactNode } from "react";

export function FlowInspectorCard({
  eyebrow,
  title,
  summary,
  children,
}: {
  eyebrow: string;
  title: string;
  summary?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 rounded-[1.5rem] border border-border/50 bg-background px-4 py-4 shadow-sm">
      <div className="grid gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="text-base font-semibold text-foreground">{title}</div>
          {summary ? (
            <div className="rounded-full border border-border/50 bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              {summary}
            </div>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function InspectorField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3 text-[11px] font-medium text-muted-foreground">
        <span>{label}</span>
        {hint ? <span className="opacity-70">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function InspectorHint({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-5 text-muted-foreground">{children}</p>;
}

export function InspectorPills({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <div
          key={item}
          className="rounded-full border border-border/45 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
        >
          {item}
        </div>
      ))}
    </div>
  );
}
