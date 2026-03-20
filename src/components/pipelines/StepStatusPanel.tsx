"use client";

import { AlertCircle, CheckCircle2, Circle, XCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { METHOD_COLORS } from "@/lib/utils/http";
import type { StepSnapshot, StepStatus } from "@/types/pipeline-debug";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}b`;
  return `${(bytes / 1024).toFixed(1)}kb`;
}

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === "success") return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  if (status === "error") return <XCircle className="h-5 w-5 text-destructive" />;
  if (status === "skipped") return <AlertCircle className="h-5 w-5 text-amber-500" />;
  return <Circle className="h-5 w-5 text-muted-foreground" />;
}

function ExecutionBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    idle: "bg-muted text-muted-foreground",
    running: "bg-primary/10 text-primary",
    paused: "bg-amber-500/10 text-amber-600",
    completed: "bg-emerald-500/10 text-emerald-600",
    error: "bg-destructive/10 text-destructive",
    aborted: "bg-amber-500/10 text-amber-600",
    interrupted: "bg-amber-500/10 text-amber-600",
  };
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        variants[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}

function getStatusColor(status: number) {
  if (status >= 200 && status < 300) return "text-emerald-600";
  if (status >= 300 && status < 400) return "text-blue-600";
  if (status >= 400 && status < 500) return "text-amber-600";
  if (status >= 500) return "text-destructive";
  return "text-muted-foreground";
}

interface StepStatusPanelProps {
  snapshot?: StepSnapshot;
  executionStatus?: string;
  cookies: string[];
}

export function StepStatusPanel({ snapshot, executionStatus, cookies }: StepStatusPanelProps) {
  const [activeTab, setActiveTab] = useState<"details" | "request" | "cookies">("details");

  if (!snapshot) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground text-sm italic lg:col-span-4">
        Select a step to view details
      </div>
    );
  }

  const response = snapshot.reducedResponse;
  const headers = snapshot.fullHeaders ?? response?.headers ?? {};
  const isSuccess = snapshot.status === "success";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col border-r lg:col-span-4 lg:border-r-0">
      <div className="p-4 border-b bg-muted/5">
        <div className="flex items-center gap-3 mb-2">
          <StatusIcon status={snapshot.status} />
          <span
            className={cn(
              "text-2xl font-bold tracking-tight",
              isSuccess ? getStatusColor(response?.status ?? 0) : "text-destructive",
            )}
          >
            {response ? `${response.status} ${response.statusText}` : snapshot.status.toUpperCase()}
          </span>
        </div>
        {response && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              Latency: <strong className="text-foreground">{response.latencyMs}ms</strong>
            </span>
            <span>
              Size: <strong className="text-foreground">{formatSize(response.sizeBytes)}</strong>
            </span>
          </div>
        )}
        {executionStatus && (
          <div className="mt-2">
            <ExecutionBadge status={executionStatus} />
          </div>
        )}
        {snapshot.error && (
          <p className="mt-2 text-xs text-destructive bg-destructive/5 px-2 py-1 rounded">
            {snapshot.error}
          </p>
        )}
      </div>

      <div className="border-b">
        <nav className="flex items-center gap-0 px-4">
          {(["details", "request", "cookies"] as const).map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-all border-b-2",
                activeTab === tab
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab}
              {tab === "cookies" && cookies.length > 0 && (
                <span className="ml-1 text-[10px] bg-muted px-1 rounded">{cookies.length}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-4">
        {activeTab === "details" && (
          <div className="space-y-0">
            {Object.entries(headers).length > 0 ? (
              Object.entries(headers).map(([key, value]) => (
                <div key={key} className="flex gap-4 py-2 border-b border-muted/20 last:border-0">
                  <span className="text-xs font-mono text-muted-foreground min-w-[140px] shrink-0">
                    {key}
                  </span>
                  <span className="text-xs font-mono break-all">{value}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic">No headers</p>
            )}
          </div>
        )}

        {activeTab === "request" && (
          <div className="space-y-3">
            <div className="flex gap-4 py-2 border-b border-muted/20">
              <span className="text-xs font-mono text-muted-foreground min-w-[80px]">Method</span>
              <span className={cn("text-xs font-mono font-bold", METHOD_COLORS[snapshot.method])}>
                {snapshot.method}
              </span>
            </div>
            <div className="flex gap-4 py-2 border-b border-muted/20">
              <span className="text-xs font-mono text-muted-foreground min-w-[80px]">URL</span>
              <span className="text-xs font-mono break-all">{snapshot.resolvedRequest.url}</span>
            </div>
            <div className="flex gap-4 py-2 border-b border-muted/20">
              <span className="text-xs font-mono text-muted-foreground min-w-[80px]">Status</span>
              <span className="text-xs font-mono">{snapshot.status}</span>
            </div>
            {snapshot.resolvedRequest.body && (
              <div className="flex items-start gap-4 py-2">
                <span className="text-xs font-mono text-muted-foreground min-w-[80px] shrink-0">
                  Body
                </span>
                <pre className="w-full text-xs font-mono break-all whitespace-pre-wrap max-h-[300px] overflow-auto">
                  {snapshot.resolvedRequest.body}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === "cookies" && (
          <div className="space-y-2">
            {cookies.length > 0 ? (
              cookies.map((cookie, i) => (
                <div key={`cookie-${i}`} className="p-2 bg-muted/10 rounded-lg">
                  <code className="text-xs font-mono break-all">{cookie}</code>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic">No cookies in response</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
