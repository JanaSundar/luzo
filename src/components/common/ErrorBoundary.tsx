"use client";

import { AlertTriangle, ChevronDown, ClipboardCopy, RefreshCw } from "lucide-react";
import type { ErrorInfo, ReactNode } from "react";
import {
  type FallbackProps,
  ErrorBoundary as ReactErrorBoundary,
  getErrorMessage,
} from "react-error-boundary";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

const IS_DEV = process.env.NODE_ENV === "development";

type AugmentedUnknown = { __componentStack?: string };

function readComponentStack(error: unknown): string | undefined {
  if (error && typeof error === "object" && "__componentStack" in error) {
    const s = (error as AugmentedUnknown).__componentStack;
    return typeof s === "string" && s.trim() ? s : undefined;
  }
  return undefined;
}

function getStackTrace(error: unknown): string | undefined {
  if (error instanceof Error && error.stack?.trim()) {
    return error.stack;
  }
  return undefined;
}

function getErrorTitle(error: unknown): string {
  if (error instanceof Error && error.name) {
    return error.name;
  }
  return "Error";
}

async function copyDevDiagnostics(error: unknown, componentStack?: string) {
  const parts: string[] = [];
  const msg = getErrorMessage(error) ?? String(error);
  parts.push(`${getErrorTitle(error)}: ${msg}`);
  const stack = getStackTrace(error);
  if (stack) {
    parts.push("", "--- Stack trace ---", stack);
  }
  if (componentStack) {
    parts.push("", "--- Component stack ---", componentStack);
  }
  try {
    await navigator.clipboard.writeText(parts.join("\n"));
    toast.success("Copied error details");
  } catch {
    toast.error("Could not copy to clipboard");
  }
}

function ErrorFallbackProduction({ resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-[18rem] flex-col items-center gap-4 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" aria-hidden />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-sm font-semibold text-foreground">Something went wrong</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Try again. If it keeps happening, refresh the page.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={resetErrorBoundary}
          className="gap-1.5 rounded-lg font-medium"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </Button>
      </div>
    </div>
  );
}

function DevStackBlock({
  label,
  children,
  defaultOpen = true,
}: {
  label: string;
  children: string;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-xl border border-border/60 bg-muted/30 text-left shadow-inner dark:bg-muted/20 [&[open]>summary_svg]:rotate-180"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground outline-none marker:content-none [&::-webkit-details-marker]:hidden">
        <span>{label}</span>
        <ChevronDown
          className="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
          aria-hidden
        />
      </summary>
      <div className="border-t border-border/50 px-3 pb-3 pt-0">
        <pre className="max-h-[min(40vh,18rem)] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-background/80 p-3 font-mono text-[11px] leading-relaxed text-foreground ring-1 ring-border/40 dark:bg-background/50">
          {children}
        </pre>
      </div>
    </details>
  );
}

function ErrorFallbackDevelopment({ error, resetErrorBoundary }: FallbackProps) {
  const message = getErrorMessage(error) ?? String(error);
  const title = getErrorTitle(error);
  const stack = getStackTrace(error);
  const componentStack = readComponentStack(error);

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4 sm:p-8">
      <div
        className={cn(
          "w-full max-w-3xl overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-muted/40 to-background shadow-lg",
          "ring-1 ring-border/30 dark:from-muted/25",
        )}
      >
        <div className="border-b border-border/40 bg-muted/20 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive ring-1 ring-destructive/20">
                <AlertTriangle className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {title}
                </p>
                <p className="break-words font-mono text-sm font-medium leading-snug text-foreground">
                  {message}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => void copyDevDiagnostics(error, componentStack)}
              >
                <ClipboardCopy className="h-3.5 w-3.5" />
                Copy
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={resetErrorBoundary}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try again
              </Button>
            </div>
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground">
            Development only — stack traces are hidden in production builds.
          </p>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          {stack ? (
            <DevStackBlock label="Stack trace" defaultOpen>
              {stack}
            </DevStackBlock>
          ) : (
            <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-3 py-2.5 text-center text-xs text-muted-foreground">
              No stack trace (thrown value may not be an <code className="font-mono">Error</code>).
            </p>
          )}
          {componentStack ? (
            <DevStackBlock label="Component stack" defaultOpen={false}>
              {componentStack}
            </DevStackBlock>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ErrorFallback(props: FallbackProps) {
  if (IS_DEV) {
    return <ErrorFallbackDevelopment {...props} />;
  }
  return <ErrorFallbackProduction {...props} />;
}

export function ErrorBoundary({ children, fallback }: Props) {
  const handleError = (err: unknown, info: ErrorInfo) => {
    if (err && typeof err === "object") {
      (err as AugmentedUnknown).__componentStack = info.componentStack ?? "";
    }
    console.error(err, info.componentStack); // oxlint-disable-line no-console
  };

  return (
    <ReactErrorBoundary
      onError={handleError}
      fallbackRender={fallback ? () => <>{fallback}</> : ErrorFallback}
    >
      {children}
    </ReactErrorBoundary>
  );
}
