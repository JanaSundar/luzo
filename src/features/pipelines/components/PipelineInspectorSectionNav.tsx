"use client";

import { cn } from "@/utils";

export type PipelineInspectorSection = "request" | "flow" | "routing" | "mock";

export interface PipelineInspectorSectionItem {
  id: PipelineInspectorSection;
  label: string;
  detail: string;
  highlighted?: boolean;
}

interface PipelineInspectorSectionNavProps {
  activeSection: PipelineInspectorSection;
  items: PipelineInspectorSectionItem[];
  onSectionChange: (section: PipelineInspectorSection) => void;
}

export function PipelineInspectorSectionNav({
  activeSection,
  items,
  onSectionChange,
}: PipelineInspectorSectionNavProps) {
  return (
    <nav
      aria-label="Inspector sections"
      className="sticky top-0 flex w-44 shrink-0 flex-col gap-2 self-start rounded-2xl border border-border/40 bg-background/80 p-2 shadow-sm"
    >
      {items.map((item) => {
        const active = item.id === activeSection;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSectionChange(item.id)}
            className={cn(
              "flex w-full items-start justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-transparent text-foreground hover:bg-muted/60",
            )}
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold">{item.label}</div>
              <div
                className={cn(
                  "mt-1 text-[11px] leading-relaxed",
                  active ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {item.detail}
              </div>
            </div>
            {item.highlighted ? (
              <span
                className={cn(
                  "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                  active ? "bg-primary-foreground/90" : "bg-primary",
                )}
              />
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
