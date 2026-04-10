"use client";

import { Shield, Sparkles, Zap } from "lucide-react";
import { cn } from "@/utils";
import type { NarrativeTone } from "@/types";

export const TONES: { id: NarrativeTone; label: string; icon: React.ReactNode }[] = [
  {
    id: "technical",
    label: "Technical",
    icon: <Zap className="h-4 w-4" />,
  },
  {
    id: "executive",
    label: "Executive",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    id: "compliance",
    label: "Compliance",
    icon: <Shield className="h-4 w-4" />,
  },
];

interface ToneSelectionProps {
  currentTone: NarrativeTone;
  onToneChange: (tone: NarrativeTone) => void;
}

export function ToneSelection({ currentTone, onToneChange }: ToneSelectionProps) {
  return (
    <section className="space-y-1.5 rounded-none border-0 bg-transparent p-0 shadow-none">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Tone
        </h3>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {TONES.map((tone) => (
          <button
            type="button"
            key={tone.id}
            onClick={() => onToneChange(tone.id)}
            className={cn(
              "group flex h-9 min-w-0 items-center gap-2 rounded-lg border px-2.5 text-left transition-colors",
              currentTone === tone.id
                ? "border-foreground/15 bg-muted/25"
                : "border-border/45 bg-background hover:bg-muted/15",
            )}
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border/50 bg-muted/20">
              {tone.icon}
            </div>
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-tight">
              {tone.label}
            </span>
            <div
              className={cn(
                "h-2.5 w-2.5 shrink-0 rounded-full transition-colors",
                currentTone === tone.id ? "bg-foreground" : "bg-muted-foreground/25",
              )}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
