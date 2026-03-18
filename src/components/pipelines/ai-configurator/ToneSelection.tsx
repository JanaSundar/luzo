"use client";

import { Shield, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NarrativeTone } from "@/types";

export const TONES: { id: NarrativeTone; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    id: "technical",
    label: "Technical",
    desc: "Detailed technical breakdown with metrics, headers, and performance analysis.",
    icon: <Zap className="h-4 w-4" />,
  },
  {
    id: "executive",
    label: "Executive",
    desc: "High-level business overview focused on SLA compliance and operational health.",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    id: "compliance",
    label: "Compliance",
    desc: "Audit-ready report covering data handling, PII, and endpoint security.",
    icon: <Shield className="h-4 w-4" />,
  },
];

interface ToneSelectionProps {
  currentTone: NarrativeTone;
  onToneChange: (tone: NarrativeTone) => void;
}

export function ToneSelection({ currentTone, onToneChange }: ToneSelectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Output Tone
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TONES.map((tone) => (
          <button
            type="button"
            key={tone.id}
            onClick={() => onToneChange(tone.id)}
            className={cn(
              "flex flex-col gap-2 p-4 rounded-xl border-2 transition-all text-left group",
              currentTone === tone.id
                ? "border-primary bg-primary/5 shadow-md"
                : "border-muted hover:border-border hover:bg-muted/5"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {tone.icon}
                <span className="font-bold text-sm tracking-tight">{tone.label}</span>
              </div>
              <div
                className={cn(
                  "h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all",
                  currentTone === tone.id
                    ? "border-primary bg-primary"
                    : "border-muted group-hover:border-border"
                )}
              >
                {currentTone === tone.id && (
                  <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                )}
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{tone.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
