"use client";

import Image from "next/image";
import { JsonView } from "@/components/ui/JsonView";
import { segmentedTabListClassName, segmentedTabTriggerClassName } from "@/utils/ui/segmentedTabs";
import { cn } from "@/utils";
import type { ApiResponse, TestResult } from "@/types";
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

export function ResponseContent({
  response,
  bodyView,
  onBodyViewChange,
  activeTab,
  searchQuery,
  isJson,
  dataUrl,
  contentType,
  fontScale,
}: {
  response: ApiResponse;
  bodyView: "preview" | "raw";
  onBodyViewChange: (value: "preview" | "raw") => void;
  activeTab: "body" | "headers" | "pre-request" | "post-request" | "tests";
  searchQuery: string;
  isJson: boolean;
  dataUrl: string | null;
  contentType: string;
  fontScale: "sm" | "md" | "lg";
}) {
  if (activeTab === "headers") return <HeadersTable headers={response.headers} />;
  if (activeTab === "pre-request" && response.preRequestResult)
    return <PreRequestPanel response={response} />;
  if (activeTab === "post-request" && response.postRequestResult)
    return <ScriptLogPanel title="Post-request" result={response.postRequestResult} />;
  if (activeTab === "tests" && response.testResults?.length)
    return <TestsPanel tests={response.testResults} />;

  if (dataUrl) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-background p-2">
        {contentType.startsWith("image/") ? (
          <Image
            src={dataUrl}
            alt="Response"
            width={800}
            height={600}
            className="max-h-full w-auto max-w-full object-contain"
          />
        ) : (
          <iframe
            src={dataUrl}
            title="PDF response"
            className="h-full min-h-[420px] w-full rounded-xl border-0"
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div
        role="tablist"
        aria-label="Body view"
        className={cn("inline-flex w-fit items-center", segmentedTabListClassName)}
      >
        {(["preview", "raw"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={bodyView === tab}
            onClick={() => onBodyViewChange(tab)}
            className={segmentedTabTriggerClassName(bodyView === tab, "h-8 px-3")}
          >
            {tab === "preview" ? "Preview" : "Raw"}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 h-full overflow-hidden">
        {isJson ? (
          <JsonView
            text={response.body}
            searchQuery={bodyView === "preview" ? searchQuery : ""}
            className="h-full"
            fontScale={fontScale}
            format={bodyView === "preview"}
          />
        ) : (
          <pre
            className={cn(
              "h-full overflow-auto bg-background p-4 font-mono whitespace-pre-wrap break-words [overflow-wrap:anywhere]",
              fontScale === "sm"
                ? "text-[11px] leading-5"
                : fontScale === "lg"
                  ? "text-[13px] leading-7"
                  : "text-xs leading-6",
            )}
          >
            {response.body}
          </pre>
        )}
      </div>
    </div>
  );
}

function HeadersTable({ headers }: { headers: Record<string, string> }) {
  return (
    <div className="h-full overflow-auto bg-background">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-muted/60">
          <tr className="border-b border-border/40">
            <th className="px-4 py-2 text-left font-medium">Header</th>
            <th className="px-4 py-2 text-left font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(headers).map(([key, value]) => (
            <tr key={key} className="border-b border-border/30 last:border-0">
              <td className="px-4 py-2 font-mono text-muted-foreground">{key}</td>
              <td className="px-4 py-2 font-mono break-all">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreRequestPanel({ response }: { response: ApiResponse }) {
  const result = response.preRequestResult;
  if (!result) return null;

  return <ScriptLogPanel title="Pre-request" result={result} />;
}

function ScriptLogPanel({
  title,
  result,
}: {
  title: string;
  result: NonNullable<ApiResponse["preRequestResult"]>;
}) {
  const emptyLabel = title.toLowerCase();

  return (
    <div className="h-full overflow-auto bg-background p-4">
      {result.error ? (
        <div className="rounded-xl bg-destructive/8 px-3 py-2 font-mono text-xs text-destructive">
          {result.error}
        </div>
      ) : null}
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Duration {result.durationMs}ms
      </p>
      <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-muted/35 p-4 font-mono text-xs leading-6 [overflow-wrap:anywhere]">
        {result.logs.length
          ? result.logs.join("\n")
          : `No console output from ${emptyLabel} script`}
      </pre>
    </div>
  );
}

function TestsPanel({ tests }: { tests: TestResult[] }) {
  const passed = tests.filter((test) => test.passed).length;
  const failed = tests.length - passed;

  return (
    <div className="h-full overflow-auto">
      <TestResults summary={{ passed, failed, skipped: 0, total: tests.length }}>
        <TestResultsHeader>
          <TestResultsSummaryDisplay />
          <TestResultsDuration />
        </TestResultsHeader>
        <TestResultsContent>
          <TestResultsProgress />
          <TestSuite name="Response tests" status={failed > 0 ? "failed" : "passed"} defaultOpen>
            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
              <TestSuiteName />
              <TestSuiteStats passed={passed} failed={failed} skipped={0} />
            </div>
            <TestSuiteContent>
              {tests.map((test) => (
                <Test key={test.name} name={test.name} status={test.passed ? "passed" : "failed"}>
                  <TestStatusDisplay />
                  <TestName />
                  {test.error ? (
                    <TestError>
                      <TestErrorMessage>{test.error}</TestErrorMessage>
                    </TestError>
                  ) : null}
                </Test>
              ))}
            </TestSuiteContent>
          </TestSuite>
        </TestResultsContent>
      </TestResults>
    </div>
  );
}
