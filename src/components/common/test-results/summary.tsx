import { CheckCircle2, Circle, XCircle } from "lucide-react";
import type React from "react";
import { useContext } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDuration, TestResultsContext } from "./context";

export const TestResultsHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn("flex items-center justify-between border-b px-4 py-3", className)} {...props}>
    {children}
  </div>
);

export const TestResultsDuration: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({
  className,
  children,
  ...props
}) => {
  const { summary } = useContext(TestResultsContext);
  if (!summary?.duration) return null;
  return (
    <span className={cn("text-muted-foreground text-sm", className)} {...props}>
      {children ?? formatDuration(summary.duration)}
    </span>
  );
};

export const TestResultsSummaryComponent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  const { summary } = useContext(TestResultsContext);
  if (!summary) return null;

  return (
    <div className={cn("flex items-center gap-3", className)} {...props}>
      {children ?? (
        <>
          <Badge
            className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            variant="secondary"
          >
            <CheckCircle2 className="size-3" />
            {summary.passed} passed
          </Badge>
          {summary.failed > 0 && (
            <Badge
              className="gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              variant="secondary"
            >
              <XCircle className="size-3" />
              {summary.failed} failed
            </Badge>
          )}
          {summary.skipped > 0 && (
            <Badge
              className="gap-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
              variant="secondary"
            >
              <Circle className="size-3" />
              {summary.skipped} skipped
            </Badge>
          )}
        </>
      )}
    </div>
  );
};

export const TestResultsProgress: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  const { summary } = useContext(TestResultsContext);
  if (!summary) return null;

  const passedPercent = (summary.passed / summary.total) * 100;
  const failedPercent = (summary.failed / summary.total) * 100;

  return (
    <div className={cn("space-y-2", className)} {...props}>
      {children ?? (
        <>
          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
            <div className="bg-green-500 transition-all" style={{ width: `${passedPercent}%` }} />
            <div className="bg-red-500 transition-all" style={{ width: `${failedPercent}%` }} />
          </div>
          <div className="flex justify-between text-muted-foreground text-xs">
            <span>
              {summary.passed}/{summary.total} tests passed
            </span>
            <span>{passedPercent.toFixed(0)}%</span>
          </div>
        </>
      )}
    </div>
  );
};
