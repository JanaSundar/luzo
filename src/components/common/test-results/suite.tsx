import { CheckCircle2, ChevronRight, Circle, CircleDot, XCircle } from "lucide-react";
import type React from "react";
import { useContext, useMemo } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { type TestStatus, TestSuiteContext } from "./context";

const statusStyles: Record<TestStatus, string> = {
  failed: "text-red-600 dark:text-red-400",
  passed: "text-green-600 dark:text-green-400",
  running: "text-blue-600 dark:text-blue-400",
  skipped: "text-yellow-600 dark:text-yellow-400",
};

const statusIcons: Record<TestStatus, React.ReactNode> = {
  failed: <XCircle className="size-4" />,
  passed: <CheckCircle2 className="size-4" />,
  running: <CircleDot className="size-4 animate-pulse" />,
  skipped: <Circle className="size-4" />,
};

export const TestStatusIcon = ({ status }: { status: TestStatus }) => (
  <span className={cn("shrink-0", statusStyles[status])}>{statusIcons[status]}</span>
);

export const TestSuite: React.FC<
  React.ComponentProps<typeof Collapsible> & { name: string; status: TestStatus }
> = ({ name, status, className, children, ...props }) => {
  const contextValue = useMemo(() => ({ name, status }), [name, status]);
  return (
    <TestSuiteContext.Provider value={contextValue}>
      <Collapsible className={cn("rounded-lg border", className)} {...props}>
        {children}
      </Collapsible>
    </TestSuiteContext.Provider>
  );
};

export const TestSuiteName: React.FC<React.ComponentProps<typeof CollapsibleTrigger>> = ({
  className,
  children,
  ...props
}) => {
  const { name, status } = useContext(TestSuiteContext);
  return (
    <CollapsibleTrigger
      className={cn(
        "group flex w-full items-center gap-2 rounded-t-lg bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50",
        className
      )}
      {...props}
    >
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
      <TestStatusIcon status={status} />
      <span className="font-semibold text-sm tracking-tight">{children ?? name}</span>
    </CollapsibleTrigger>
  );
};

export const TestSuiteStats: React.FC<
  React.HTMLAttributes<HTMLDivElement> & { passed?: number; failed?: number; skipped?: number }
> = ({ passed = 0, failed = 0, skipped = 0, className, children, ...props }) => (
  <div className={cn("ml-auto flex items-center gap-2 text-xs", className)} {...props}>
    {children ?? (
      <>
        {passed > 0 && <span className="text-green-600 dark:text-green-400">{passed} passed</span>}
        {failed > 0 && <span className="text-red-600 dark:text-red-400">{failed} failed</span>}
        {skipped > 0 && (
          <span className="text-yellow-600 dark:text-yellow-400">{skipped} skipped</span>
        )}
      </>
    )}
  </div>
);

export const TestSuiteContent: React.FC<React.ComponentProps<typeof CollapsibleContent>> = ({
  className,
  children,
  ...props
}) => (
  <CollapsibleContent className={cn("border-t", className)} {...props}>
    <div className="divide-y">{children}</div>
  </CollapsibleContent>
);
