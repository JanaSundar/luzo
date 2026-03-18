"use client";

import { Clock } from "lucide-react";
import { useMemo, useState } from "react";
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
import { usePipelineDebugStore } from "@/lib/stores/usePipelineDebugStore";
import type { StepSnapshot } from "@/types/pipeline-debug";
import { cn } from "@/lib/utils";
import { DebugControlsBar } from "./DebugControlsBar";
import { MiddlePanel } from "./MiddlePanel";
import { ResponseBodyPanel } from "./ResponseBodyPanel";
import { TimelinePanel } from "./TimelinePanel";
import { UnresolvedVariablesPanel } from "./UnresolvedVariablesPanel";

type ResponsePanelTab = "response" | "pre-request" | "tests";

export function ResponseStream() {
  const { runtime, snapshots, stepNext, continueAll, stopExecution } = usePipelineDebugStore();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [panelTab, setPanelTab] = useState<ResponsePanelTab>("response");

  const selectedSnapshot = snapshots[selectedIndex] as StepSnapshot | undefined;

  const totalTime = useMemo(
    () =>
      snapshots
        .map((s) => s.reducedResponse?.latencyMs ?? 0)
        .filter((l) => l > 0)
        .reduce((a, b) => a + b, 0),
    [snapshots]
  );

  const parsedBody = useMemo(() => {
    if (selectedSnapshot?.fullBody) {
      try {
        const parsed = JSON.parse(selectedSnapshot.fullBody);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return selectedSnapshot.fullBody;
      }
    }
    if (!selectedSnapshot?.reducedResponse?.summary) return null;
    try {
      return JSON.stringify(selectedSnapshot.reducedResponse.summary, null, 2);
    } catch {
      return null;
    }
  }, [selectedSnapshot]);

  const cookies = useMemo(() => {
    const headers = selectedSnapshot?.fullHeaders ?? selectedSnapshot?.reducedResponse?.headers;
    if (!headers) return [];
    const entry = Object.entries(headers).find(([k]) => k.toLowerCase() === "set-cookie");
    return (
      entry?.[1]
        ?.split(",")
        .map((c) => c.trim())
        .filter(Boolean) ?? []
    );
  }, [selectedSnapshot]);

  const isFullResponse = Boolean(selectedSnapshot?.fullBody);

  const isActive = runtime.status === "running" || runtime.status === "paused";
  const isDone =
    runtime.status === "completed" || runtime.status === "failed" || runtime.status === "aborted";

  if (runtime.status === "idle" && snapshots.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
        <div className="p-4 rounded-full bg-muted/30">
          <Clock className="h-8 w-8 opacity-20" />
        </div>
        <p className="text-sm">Run a pipeline to see real-time results</p>
        <p className="text-xs text-muted-foreground">Use Debug mode for step-by-step execution</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col min-h-0 gap-3 overflow-hidden">
      {(isActive || isDone) && (
        <DebugControlsBar
          runtime={runtime}
          totalTime={totalTime}
          isActive={isActive}
          isDone={isDone}
          onStep={stepNext}
          onContinue={continueAll}
          onStop={stopExecution}
        />
      )}

      {runtime.status === "paused" && <UnresolvedVariablesPanel />}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden rounded-xl border bg-background shadow-sm lg:grid-cols-12">
        <TimelinePanel
          snapshots={snapshots}
          selectedIndex={selectedIndex}
          totalTime={totalTime}
          isPaused={runtime.status === "paused"}
          isRunning={runtime.status === "running"}
          currentStepIndex={runtime.currentStepIndex}
          totalSteps={runtime.totalSteps}
          onSelect={setSelectedIndex}
        />
        <div className="flex min-h-0 flex-1 flex-col border-t lg:col-span-9 lg:border-t-0 lg:border-l">
          <nav className="flex items-center gap-0 shrink-0 border-b bg-muted/10">
            {(
              [
                { id: "response" as const, label: "Response" },
                { id: "pre-request" as const, label: "Pre-request" },
                { id: "tests" as const, label: "Tests" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPanelTab(tab.id)}
                className={cn(
                  "px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-all border-b-2 -mb-px",
                  panelTab === tab.id
                    ? "border-foreground text-foreground bg-background"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-12">
            {panelTab === "response" && (
              <>
                <MiddlePanel snapshot={selectedSnapshot} cookies={cookies} />
                <ResponseBodyPanel
                  parsedBody={parsedBody}
                  hasSnapshots={snapshots.length > 0}
                  snapshot={selectedSnapshot}
                  isFullResponse={isFullResponse}
                />
              </>
            )}
            {panelTab === "pre-request" && (
              <div className="lg:col-span-12 flex-1 min-h-0 overflow-auto custom-scrollbar p-4">
                {selectedSnapshot?.preRequestResult ? (
                  <div className="space-y-3">
                    {selectedSnapshot.preRequestResult.error && (
                      <div className="text-xs text-destructive bg-destructive/5 px-3 py-2 rounded-md font-mono">
                        {selectedSnapshot.preRequestResult.error}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">
                      Duration: {selectedSnapshot.preRequestResult.durationMs}ms
                    </div>
                    {selectedSnapshot.preRequestResult.logs.length > 0 ? (
                      <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-all bg-muted/30 p-3 rounded-md">
                        {selectedSnapshot.preRequestResult.logs.join("\n")}
                      </pre>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        No console output from pre-request script
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm italic">
                    {selectedSnapshot
                      ? "No pre-request script or result for this step"
                      : "Select a step to view pre-request output"}
                  </div>
                )}
              </div>
            )}
            {panelTab === "tests" && (
              <div className="lg:col-span-12 flex-1 min-h-0 overflow-auto custom-scrollbar p-4">
                {selectedSnapshot?.testResult?.testResults &&
                selectedSnapshot.testResult.testResults.length > 0 ? (
                  <TestResults
                    summary={{
                      passed: selectedSnapshot.testResult.testResults.filter((t) => t.passed)
                        .length,
                      failed: selectedSnapshot.testResult.testResults.filter((t) => !t.passed)
                        .length,
                      skipped: 0,
                      total: selectedSnapshot.testResult.testResults.length,
                      duration: selectedSnapshot.testResult.durationMs,
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
                        status={
                          selectedSnapshot.testResult.error ||
                          selectedSnapshot.testResult.testResults.some((t) => !t.passed)
                            ? "failed"
                            : "passed"
                        }
                        defaultOpen
                      >
                        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                          <TestSuiteName />
                          <TestSuiteStats
                            passed={
                              selectedSnapshot.testResult.testResults.filter((t) => t.passed).length
                            }
                            failed={
                              selectedSnapshot.testResult.testResults.filter((t) => !t.passed)
                                .length
                            }
                            skipped={0}
                          />
                        </div>
                        <TestSuiteContent>
                          {selectedSnapshot.testResult.testResults.map((t) => (
                            <Test
                              key={t.name}
                              name={t.name}
                              status={t.passed ? "passed" : "failed"}
                            >
                              <TestStatusDisplay />
                              <TestName />
                              {t.error && (
                                <TestError>
                                  <TestErrorMessage>{t.error}</TestErrorMessage>
                                </TestError>
                              )}
                            </Test>
                          ))}
                        </TestSuiteContent>
                      </TestSuite>
                    </TestResultsContent>
                  </TestResults>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm italic">
                    {selectedSnapshot
                      ? "No test script or results for this step"
                      : "Select a step to view test results"}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
