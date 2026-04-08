import { CheckCircle2, Circle, CircleDot, XCircle } from "lucide-react";
import type React from "react";
import { useContext, useMemo } from "react";
import { cn } from "@/utils";
import { TestContext, type TestStatus } from "./context";

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

export const TestStatusComponent: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({
  className,
  children,
  ...props
}) => {
  const { status } = useContext(TestContext);
  return (
    <span className={cn("shrink-0", statusStyles[status], className)} {...props}>
      {children ?? statusIcons[status]}
    </span>
  );
};

export const TestName: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({
  className,
  children,
  ...props
}) => {
  const { name } = useContext(TestContext);
  return (
    <span className={cn("flex-1", className)} {...props}>
      {children ?? name}
    </span>
  );
};

export const TestDurationMarker: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({
  className,
  children,
  ...props
}) => {
  const { duration } = useContext(TestContext);
  if (duration === undefined) return null;
  return (
    <span className={cn("ml-auto text-muted-foreground text-xs", className)} {...props}>
      {children ?? `${duration}ms`}
    </span>
  );
};

export const Test: React.FC<
  React.HTMLAttributes<HTMLDivElement> & { name: string; status: TestStatus; duration?: number }
> = ({ name, status, duration, className, children, ...props }) => {
  const contextValue = useMemo(() => ({ duration, name, status }), [duration, name, status]);
  return (
    <TestContext.Provider value={contextValue}>
      <div className={cn("flex items-center gap-2 pl-14 pr-4 py-2 text-sm", className)} {...props}>
        {children ?? (
          <>
            <TestStatusComponent />
            <TestName />
            {duration !== undefined && <TestDurationMarker />}
          </>
        )}
      </div>
    </TestContext.Provider>
  );
};

export const TestError: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn("mt-2 rounded-md bg-red-50 p-3 dark:bg-red-900/20", className)} {...props}>
    {children}
  </div>
);

export const TestErrorMessage: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => (
  <p className={cn("font-medium text-red-700 text-sm dark:text-red-400", className)} {...props}>
    {children}
  </p>
);

export const TestErrorStack: React.FC<React.HTMLAttributes<HTMLPreElement>> = ({
  className,
  children,
  ...props
}) => (
  <pre
    className={cn("mt-2 overflow-auto font-mono text-red-600 text-xs dark:text-red-400", className)}
    {...props}
  >
    {children}
  </pre>
);
