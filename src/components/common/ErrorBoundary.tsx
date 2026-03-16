"use client";

import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { type FallbackProps, ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

function DefaultFallback({ error, resetErrorBoundary }: FallbackProps) {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <div>
        <p className="font-medium">Something went wrong</p>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
      </div>
      <Button onClick={resetErrorBoundary} variant="outline" size="sm">
        Try again
      </Button>
    </div>
  );
}

export function ErrorBoundary({ children, fallback }: Props) {
  return (
    <ReactErrorBoundary fallbackRender={fallback ? () => <>{fallback}</> : DefaultFallback}>
      {children}
    </ReactErrorBoundary>
  );
}
