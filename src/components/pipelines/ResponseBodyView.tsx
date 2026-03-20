"use client";

import { useState } from "react";
import { toast } from "sonner";
import { maskSensitiveValue } from "@/lib/pipeline/sensitivity";
import type { StepSnapshot } from "@/types/pipeline-debug";

function JsonSyntaxHighlight({ text }: { text: string }) {
  const parts = text.split(
    /("(?:[^"\\]|\\.)*"|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
  );

  return (
    <>
      {parts.map((part, i) => {
        const key = `${i}-${part.slice(0, 8)}`;
        if (part.startsWith('"')) {
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

function applyRedaction(text: string): string {
  const sensitiveKeys = [
    "token",
    "password",
    "secret",
    "api[_-]?key",
    "authorization",
    "jwt",
    "bearer",
    "credential",
    "private[_-]?key",
    "access[_-]?token",
    "refresh[_-]?token",
    "session[_-]?id",
    "ssn",
    "credit[_-]?card",
  ];

  let result = text;
  for (const pattern of sensitiveKeys) {
    const regex = new RegExp(`("(?:${pattern})":\\s*")([^"]*)(")`, "gi");
    result = result.replace(regex, (_, before, value, after) => {
      return `${before}${maskSensitiveValue(value)}${after}`;
    });
  }
  return result;
}

function getDisplayBody(snapshot?: StepSnapshot): string | null {
  if (snapshot?.fullBody) {
    try {
      return JSON.stringify(JSON.parse(snapshot.fullBody), null, 2);
    } catch {
      return snapshot.fullBody;
    }
  }

  if (!snapshot?.reducedResponse?.summary) {
    return null;
  }

  try {
    return JSON.stringify(snapshot.reducedResponse.summary, null, 2);
  } catch {
    return null;
  }
}

type RedactionMode = "full" | "redacted";

export type { RedactionMode };

interface ResponseBodyViewProps {
  snapshot: StepSnapshot | undefined;
  hasSnapshots: boolean;
  redactionMode?: RedactionMode;
}

export function ResponseBodyView({
  snapshot,
  hasSnapshots,
  redactionMode = "full",
}: ResponseBodyViewProps) {
  const [copied, setCopied] = useState(false);

  const displayBody = getDisplayBody(snapshot);
  const isStreaming = snapshot?.streamStatus === "streaming";
  const isDone = snapshot?.streamStatus === "done";
  const chunks = snapshot?.streamChunks ?? [];

  const finalBody =
    redactionMode === "redacted" && displayBody ? applyRedaction(displayBody) : displayBody;

  const handleCopy = () => {
    if (finalBody) {
      navigator.clipboard.writeText(finalBody);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:col-span-6">
      <div className="flex items-center justify-between border-b bg-muted/10 p-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {snapshot?.fullBody ? "Response Body" : "Response Body (Reduced)"}
          </h3>
          {isStreaming && (
            <span className="flex items-center gap-1 text-[10px] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Streaming...
            </span>
          )}
          {isDone && !snapshot?.fullBody && (
            <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
              Streamed
            </span>
          )}
        </div>
        {finalBody && (
          <button
            type="button"
            className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors"
            onClick={handleCopy}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 min-w-0 overflow-auto bg-muted/5 p-4 font-mono custom-scrollbar">
        {isStreaming && chunks.length > 0 ? (
          <div className="space-y-0">
            {chunks.map((chunk, i) => (
              <pre key={i} className="w-full text-xs leading-relaxed whitespace-pre-wrap break-all">
                <JsonSyntaxHighlight text={chunk} />
              </pre>
            ))}
            <div className="flex items-center gap-1 pt-2 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Waiting for more...
            </div>
          </div>
        ) : finalBody ? (
          <pre className="w-full text-xs leading-relaxed whitespace-pre-wrap break-all">
            <JsonSyntaxHighlight text={finalBody} />
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
