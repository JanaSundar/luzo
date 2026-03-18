"use client";

import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import type { ErrorInfo, ReactNode } from "react";
import { useState } from "react";
import { type FallbackProps, ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import { Button } from "@/components/ui/button";

const IS_DEV = process.env.NODE_ENV === "development";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

function ProductionFallback({ error, resetErrorBoundary }: FallbackProps) {
  const errorMessage = error instanceof Error ? error.message : "Something went wrong";

  return (
    <div className="flex flex-1 min-h-0 items-center justify-center p-6">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        <div className="h-14 w-14 rounded-2xl border border-border/60 bg-muted/30 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </div>
        <Button
          onClick={resetErrorBoundary}
          variant="default"
          size="lg"
          className="gap-2 font-bold uppercase tracking-wider text-[10px]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </Button>
      </div>
    </div>
  );
}

function DevelopmentFallback({ error, resetErrorBoundary }: FallbackProps) {
  const [showStack, setShowStack] = useState(true);
  const [showComponentStack, setShowComponentStack] = useState(false);

  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const componentStack = (error as Error & { __componentStack?: string })?.__componentStack;

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden p-6">
      <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg border border-destructive/40 bg-destructive/5 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Development Error</h2>
              <p className="text-sm text-muted-foreground font-mono mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <Button
            onClick={resetErrorBoundary}
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>
        </div>

        {stack && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setShowStack(!showStack)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Stack trace
              </span>
              {showStack ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {showStack && (
              <pre className="px-4 pb-4 pt-0 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap wrap-break-word max-h-48 overflow-y-auto">
                {stack}
              </pre>
            )}
          </div>
        )}

        {componentStack && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setShowComponentStack(!showComponentStack)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Component stack
              </span>
              {showComponentStack ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {showComponentStack && (
              <pre className="px-4 pb-4 pt-0 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap wrap-break-word max-h-48 overflow-y-auto">
                {componentStack}
              </pre>
            )}
          </div>
        )}

        {!stack && !componentStack && (
          <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              No stack trace available. This may be a non-Error object or the error was thrown
              without a stack.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DefaultFallback(props: FallbackProps) {
  return IS_DEV ? <DevelopmentFallback {...props} /> : <ProductionFallback {...props} />;
}

export function ErrorBoundary({ children, fallback }: Props) {
  const handleError = (error: unknown, info: ErrorInfo) => {
    if (error && typeof error === "object" && info.componentStack) {
      (error as Error & { __componentStack?: string }).__componentStack = info.componentStack;
    }
  };

  return (
    <ReactErrorBoundary
      onError={handleError}
      fallbackRender={fallback ? () => <>{fallback}</> : DefaultFallback}
    >
      {children}
    </ReactErrorBoundary>
  );
}
