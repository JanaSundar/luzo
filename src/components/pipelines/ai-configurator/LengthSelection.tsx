"use client";

import { File, FileText, Files } from "lucide-react";
import { cn } from "@/utils";
import type { ReportLength } from "@/types/pipeline-report";

export const REPORT_LENGTHS: { id: ReportLength; label: string; icon: React.ReactNode }[] = [
  {
    id: "short",
    label: "Short",
    icon: <File className="h-4 w-4" />,
  },
  {
    id: "medium",
    label: "Medium",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    id: "long",
    label: "Long",
    icon: <Files className="h-4 w-4" />,
  },
];

interface LengthSelectionProps {
  currentLength: ReportLength;
  onLengthChange: (length: ReportLength) => void;
}

export function LengthSelection({ currentLength, onLengthChange }: LengthSelectionProps) {
  return (
    <section className="space-y-1.5 rounded-none border-0 bg-transparent p-0 shadow-none">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Depth
        </h3>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {REPORT_LENGTHS.map((length) => (
          <button
            type="button"
            key={length.id}
            onClick={() => onLengthChange(length.id)}
            className={cn(
              "group flex h-9 min-w-0 items-center gap-2 rounded-lg border px-2.5 text-left transition-colors",
              currentLength === length.id
                ? "border-foreground/15 bg-muted/25"
                : "border-border/45 bg-background hover:bg-muted/15",
            )}
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border/50 bg-muted/20">
              {length.icon}
            </div>
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-tight">
              {length.label}
            </span>
            <div
              className={cn(
                "h-2.5 w-2.5 shrink-0 rounded-full transition-colors",
                currentLength === length.id ? "bg-foreground" : "bg-muted-foreground/25",
              )}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
