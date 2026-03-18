"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "./StepCard";

interface ReportExecutiveSummaryProps {
  reportOutput: string | null;
  mode: "ai" | "preview";
  providerInfo?: string;
}

export function ReportExecutiveSummary({
  reportOutput,
  mode,
  providerInfo,
}: ReportExecutiveSummaryProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Executive Summary
        </h3>
        <Badge
          className={cn(
            "text-[9px] font-bold px-1.5 py-0.5 border",
            mode === "ai"
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
          )}
        >
          {mode === "ai" ? "AI Generated" : "Static Template"}
        </Badge>
        {providerInfo && (
          <span className="text-[9px] text-muted-foreground font-medium truncate uppercase tracking-tight">
            ({providerInfo})
          </span>
        )}
      </div>

      <div className="text-[13px] leading-relaxed text-foreground/80 whitespace-pre-wrap bg-muted/5 p-6 rounded-2xl border border-muted-foreground/10">
        {reportOutput ? (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:mb-4 prose-headings:mt-6 first:prose-headings:mt-0">
            <RenderMarkdown text={reportOutput} />
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground space-y-3">
            <Sparkles className="h-8 w-8 mx-auto opacity-20" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground/60">No narrative generated yet</p>
              <p className="text-xs">
                Configure your signals, then click "Generate Report" above to see insights.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function RenderMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-4">
      {lines.map((line, i) => {
        const key = `line-${i}`;
        if (!line.trim()) return <div key={key} className="h-2" />;

        if (line.startsWith("### "))
          return (
            <h4 key={key} className="text-base font-bold text-foreground">
              {processInline(line.slice(4))}
            </h4>
          );
        if (line.startsWith("## "))
          return (
            <h3
              key={key}
              className="text-lg font-bold text-foreground border-b border-muted/30 pb-1 w-fit pr-8"
            >
              {processInline(line.slice(3))}
            </h3>
          );
        if (line.startsWith("# "))
          return (
            <h2 key={key} className="text-xl font-bold text-foreground">
              {processInline(line.slice(2))}
            </h2>
          );

        if (line.match(/^[-*]\s/)) {
          return (
            <div key={key} className="flex items-start gap-3 pl-2">
              <span className="text-primary mt-2 h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
              <span className="flex-1">{processInline(line.slice(2))}</span>
            </div>
          );
        }

        if (line.startsWith("*") && line.endsWith("*") && !line.startsWith("**")) {
          return (
            <p
              key={key}
              className="italic text-muted-foreground text-xs pl-4 border-l-2 border-primary/20 bg-primary/5 py-2 rounded-r-lg"
            >
              {line.slice(1, -1)}
            </p>
          );
        }

        return (
          <p key={key} className="text-foreground/90">
            {processInline(line)}
          </p>
        );
      })}
    </div>
  );
}

function processInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    const key = `inline-${i}`;
    if (part.startsWith("**") && part.endsWith("**"))
      return (
        <strong key={key} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    if (part.startsWith("*") && part.endsWith("*"))
      return (
        <em key={key} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    return <span key={key}>{part}</span>;
  });
}
