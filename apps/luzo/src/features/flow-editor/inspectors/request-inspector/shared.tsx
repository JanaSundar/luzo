"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
    >
      {children}
    </label>
  );
}

export function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <p className="text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

export function EditorTabs({
  activeTab,
  tabs,
  onSelect,
}: {
  activeTab: string;
  tabs: ReadonlyArray<{ id: string; label: string }>;
  onSelect: (tab: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium tracking-[0.08em] transition-colors",
            activeTab === tab.id
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
