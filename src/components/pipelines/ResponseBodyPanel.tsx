"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { StepSnapshot } from "@/types/pipeline-debug";

interface ResponseBodyPanelProps {
  parsedBody: string | null;
  hasSnapshots: boolean;
  snapshot: StepSnapshot | undefined;
  isFullResponse?: boolean;
}

export function ResponseBodyPanel({
  parsedBody,
  hasSnapshots,
  snapshot,
  isFullResponse = false,
}: ResponseBodyPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text =
      parsedBody ??
      (snapshot?.reducedResponse?.summary
        ? JSON.stringify(snapshot.reducedResponse.summary, null, 2)
        : "");
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t lg:col-span-5 lg:border-t-0 lg:border-l">
      <div className="p-3 border-b bg-muted/10 flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {isFullResponse ? "Response Body" : "Response Body (Reduced)"}
        </h3>
        {(parsedBody || snapshot?.reducedResponse?.summary) && (
          <button
            type="button"
            className="text-[10px] text-primary hover:text-primary/80 font-bold transition-colors"
            onClick={handleCopy}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto custom-scrollbar p-4 bg-muted/5 font-mono">
        {parsedBody ? (
          <pre className="text-xs leading-relaxed whitespace-pre-wrap break-all">
            <JsonSyntaxHighlight text={parsedBody} />
          </pre>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm italic">
            {hasSnapshots ? "Select a step to view response" : "No data yet"}
          </div>
        )}
      </div>
    </div>
  );
}

function JsonSyntaxHighlight({ text }: { text: string }) {
  const parts = text.split(
    /("(?:[^"\\]|\\.)*"|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g
  );

  return (
    <>
      {parts.map((part, i) => {
        const key = `${i}-${part.slice(0, 8)}`;
        if (/^"/.test(part)) {
          const nextPart = parts[i + 1];
          if (nextPart?.trim().startsWith(":")) {
            return (
              <span key={key} className="text-blue-400">
                {part}
              </span>
            );
          }
          return (
            <span key={key} className="text-emerald-400">
              {part}
            </span>
          );
        }
        if (/^(true|false)$/.test(part))
          return (
            <span key={key} className="text-amber-400">
              {part}
            </span>
          );
        if (/^null$/.test(part))
          return (
            <span key={key} className="text-red-400">
              {part}
            </span>
          );
        if (/^-?\d/.test(part))
          return (
            <span key={key} className="text-purple-400">
              {part}
            </span>
          );
        return <span key={key}>{part}</span>;
      })}
    </>
  );
}
