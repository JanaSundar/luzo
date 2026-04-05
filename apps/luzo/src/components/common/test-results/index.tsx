import type React from "react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type {
  TestResultsSummary as TestResultsSummaryType,
  TestStatus as TestStatusType,
} from "./context";
import { TestResultsContext } from "./context";
import { TestSuite, TestSuiteContent, TestSuiteName, TestSuiteStats } from "./suite";
import {
  TestResultsDuration,
  TestResultsHeader,
  TestResultsProgress,
  TestResultsSummaryComponent,
} from "./summary";
import {
  Test,
  TestDurationMarker,
  TestError,
  TestErrorMessage,
  TestErrorStack,
  TestName,
  TestStatusComponent,
} from "./test";

export type { TestResultsSummaryType as TestResultsSummary, TestStatusType as TestStatus };

export {
  Test,
  TestDurationMarker,
  TestError,
  TestErrorMessage,
  TestErrorStack,
  TestName,
  TestResultsDuration,
  TestResultsHeader,
  TestResultsProgress,
  TestResultsSummaryComponent,
  TestStatusComponent,
  TestSuite,
  TestSuiteContent,
  TestSuiteName,
  TestSuiteStats,
};

// Main component
export interface TestResultsProps extends React.HTMLAttributes<HTMLDivElement> {
  summary?: TestResultsSummaryType;
}

export const TestResults: React.FC<TestResultsProps> = ({
  summary,
  className,
  children,
  ...props
}) => {
  const contextValue = useMemo(() => ({ summary }), [summary]);

  return (
    <TestResultsContext.Provider value={contextValue}>
      <div className={cn("rounded-lg border bg-background", className)} {...props}>
        {children ??
          (summary && (
            <TestResultsHeader>
              <TestResultsSummaryComponent />
              <TestResultsDuration />
            </TestResultsHeader>
          ))}
      </div>
    </TestResultsContext.Provider>
  );
};

export const TestResultsContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn("space-y-2 p-4", className)} {...props}>
    {children}
  </div>
);

// Final component aliases (aliased to avoid type name collisions in the same file)
export {
  TestResultsSummaryComponent as TestResultsSummaryDisplay,
  TestStatusComponent as TestStatusDisplay,
};
