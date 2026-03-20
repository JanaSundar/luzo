"use client";

import { File, FileText, Files } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReportLength } from "@/types/pipeline-report";

export const REPORT_LENGTHS: {
  id: ReportLength;
  label: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "short",
    label: "Short",
    desc: "1 page summary with key findings and top 3 recommendations.",
    icon: <File className="h-4 w-4" />,
  },
  {
    id: "medium",
    label: "Medium",
    desc: "2-3 pages with step analysis and 5-7 recommendations.",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    id: "long",
    label: "Long",
    desc: "Detailed 3+ page breakdown with deep analysis and 8-12 recommendations.",
    icon: <Files className="h-4 w-4" />,
  },
];

interface LengthSelectionProps {
  currentLength: ReportLength;
  onLengthChange: (length: ReportLength) => void;
}

export function LengthSelection({ currentLength, onLengthChange }: LengthSelectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Report Length
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {REPORT_LENGTHS.map((length) => (
          <button
            type="button"
            key={length.id}
            onClick={() => onLengthChange(length.id)}
            className={cn(
              "flex flex-col gap-2 p-4 rounded-xl border-2 transition-all text-left group",
              currentLength === length.id
                ? "border-primary bg-primary/5 shadow-md"
                : "border-muted hover:border-border hover:bg-muted/5",
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {length.icon}
                <span className="font-bold text-sm tracking-tight">{length.label}</span>
              </div>
              <div
                className={cn(
                  "h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all",
                  currentLength === length.id
                    ? "border-primary bg-primary"
                    : "border-muted group-hover:border-border",
                )}
              >
                {currentLength === length.id && (
                  <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                )}
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{length.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
