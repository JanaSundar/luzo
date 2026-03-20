"use client";

import {
  Test,
  TestError,
  TestErrorMessage,
  TestName,
  TestResults,
  TestResultsContent,
  TestResultsDuration,
  TestResultsHeader,
  TestResultsProgress,
  TestResultsSummaryDisplay,
  TestStatusDisplay,
  TestSuite,
  TestSuiteContent,
  TestSuiteName,
  TestSuiteStats,
} from "@/components/common/TestResults";
import { segmentedTabListClassName, segmentedTabTriggerClassName } from "@/lib/ui/segmentedTabs";
import { cn } from "@/lib/utils";
import type { StepSnapshot } from "@/types/pipeline-debug";

export type ResponsePanelTab = "response" | "pre-request" | "tests";

const RESPONSE_TABS = [
  { id: "response" as const, label: "Response" },
  { id: "pre-request" as const, label: "Pre-request" },
  { id: "tests" as const, label: "Tests" },
];

export function ResponseTabBar({
  panelTab,
  onTabChange,
}: {
  panelTab: ResponsePanelTab;
  onTabChange: (tab: ResponsePanelTab) => void;
}) {
  return (
    <div className="flex shrink-0 items-center border-b bg-muted/10 px-4 py-2.5">
      <div
        role="tablist"
        aria-label="Response panels"
        className={cn(
          "inline-flex w-fit min-w-0 max-w-full items-stretch overflow-x-auto",
          segmentedTabListClassName,
        )}
      >
        {RESPONSE_TABS.map((tab) => {
          const active = panelTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(tab.id)}
              className={segmentedTabTriggerClassName(
                active,
                "h-7 shrink-0 px-3 py-1.5 whitespace-nowrap",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PreRequestOutputPanel({ snapshot }: { snapshot?: StepSnapshot }) {
  return (
    <div className="flex-1 min-h-0 overflow-auto p-4 custom-scrollbar lg:col-span-12">
      {snapshot?.preRequestResult ? (
        <div className="space-y-3">
          {snapshot.preRequestResult.error && (
            <div className="rounded-md bg-destructive/5 px-3 py-2 font-mono text-xs text-destructive">
              {snapshot.preRequestResult.error}
            </div>
          )}
          <div className="text-[10px] font-bold uppercase text-muted-foreground">
            Duration: {snapshot.preRequestResult.durationMs}ms
          </div>
          {snapshot.preRequestResult.logs.length > 0 ? (
            <pre className="rounded-md bg-muted/30 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
              {snapshot.preRequestResult.logs.join("\n")}
            </pre>
          ) : (
            <p className="text-xs italic text-muted-foreground">
              No console output from pre-request script
            </p>
          )}
        </div>
      ) : (
        <EmptyPanelState
          message={
            snapshot
              ? "No pre-request script or result for this step"
              : "Select a step to view pre-request output"
          }
        />
      )}
    </div>
  );
}

export function TestOutputPanel({ snapshot }: { snapshot?: StepSnapshot }) {
  const results = snapshot?.testResult?.testResults ?? [];
  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;

  return (
    <div className="flex-1 min-h-0 overflow-auto p-4 custom-scrollbar lg:col-span-12">
      {results.length > 0 ? (
        <TestResults
          summary={{
            passed,
            failed,
            skipped: 0,
            total: results.length,
            duration: snapshot?.testResult?.durationMs ?? 0,
          }}
        >
          <TestResultsHeader>
            <TestResultsSummaryDisplay />
            <TestResultsDuration />
          </TestResultsHeader>
          <TestResultsContent>
            <TestResultsProgress />
            <TestSuite
              name="Response tests"
              status={snapshot?.testResult?.error || failed > 0 ? "failed" : "passed"}
              defaultOpen
            >
              <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                <TestSuiteName />
                <TestSuiteStats passed={passed} failed={failed} skipped={0} />
              </div>
              <TestSuiteContent>
                {results.map((result) => (
                  <Test
                    key={result.name}
                    name={result.name}
                    status={result.passed ? "passed" : "failed"}
                  >
                    <TestStatusDisplay />
                    <TestName />
                    {result.error && (
                      <TestError>
                        <TestErrorMessage>{result.error}</TestErrorMessage>
                      </TestError>
                    )}
                  </Test>
                ))}
              </TestSuiteContent>
            </TestSuite>
          </TestResultsContent>
        </TestResults>
      ) : (
        <EmptyPanelState
          message={
            snapshot
              ? "No test script or results for this step"
              : "Select a step to view test results"
          }
        />
      )}
    </div>
  );
}

function EmptyPanelState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm italic text-muted-foreground">
      {message}
    </div>
  );
}
