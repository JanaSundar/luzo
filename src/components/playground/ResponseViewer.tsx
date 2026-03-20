import { Activity, Check, ChevronDown, ChevronUp, Copy, Download, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
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
import { JsonColorized } from "@/components/playground/JsonColorized";
import {
  JsonResponseViewer,
  type JsonResponseViewerRef,
} from "@/components/playground/JsonResponseViewer";
import { ResponseStats } from "@/components/playground/ResponseStats";
import { AnimatedTabContent } from "@/components/ui/animated-tab-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExecutionStore } from "@/lib/stores/useExecutionStore";
import { segmentedTabListClassName, segmentedTabTriggerClassName } from "@/lib/ui/segmentedTabs";
import { cn } from "@/lib/utils";

export function ResponseViewer() {
  const { activeRawResponse: response, isLoading } = useExecutionStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [bodyView, setBodyView] = useState<"preview" | "raw">("preview");
  const [activeTab, setActiveTab] = useState<"body" | "headers" | "pre-request" | "tests">("body");
  const [copied, setCopied] = useState(false);
  const jsonViewerRef = useRef<JsonResponseViewerRef>(null);

  const copy = useCallback(async () => {
    if (!response) return;
    await navigator.clipboard.writeText(response.body);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [response]);

  const onMatchChange = useCallback((count: number, index: number) => {
    setMatchCount(count);
    setCurrentMatchIndex(index);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <LoadingSpinner size="lg" variant="dots" />
        <span className="text-xs font-medium text-muted-foreground">Loading response...</span>
      </div>
    );
  }

  if (!response) {
    return (
      <EmptyState
        icon={Activity}
        title="No response yet"
        description="Send a request to see the response here"
      />
    );
  }

  const contentType = (() => {
    const key = Object.keys(response.headers).find((k) => k.toLowerCase() === "content-type");
    return key ? response.headers[key].toLowerCase().split(";")[0].trim() : "";
  })();
  const isImageResponse = /^image\//.test(contentType);
  const isPdfResponse = contentType === "application/pdf";
  const isBinaryPreview = isImageResponse || isPdfResponse;

  const isJson = (() => {
    if (isBinaryPreview) return false;
    try {
      JSON.parse(response.body);
      return true;
    } catch {
      return false;
    }
  })();
  const displayBody = isJson ? JSON.stringify(JSON.parse(response.body), null, 2) : response.body;

  const download = () => {
    let blob: Blob;
    let filename = "response";
    const SAFE_LIMIT = 5 * 1024 * 1024; // 5MB

    if (isBinaryPreview && response.body) {
      if (response.body.length > SAFE_LIMIT) {
        toast.error("Response body too large for browser preview. Data might be truncated.");
      }
      try {
        const binary = Uint8Array.from(atob(response.body), (c) => c.charCodeAt(0));
        blob = new Blob([binary], { type: contentType });
        const ext = isImageResponse ? contentType.replace("image/", "") : "pdf";
        filename = `response.${ext === "jpeg" ? "jpg" : ext}`;
      } catch (_err) {
        toast.error("Failed to decode large response body");
        return;
      }
    } else {
      blob = new Blob([response.body], { type: isJson ? "application/json" : "text/plain" });
      filename = isJson ? "response.json" : "response.txt";
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const dataUrl =
    isBinaryPreview && response.body ? `data:${contentType};base64,${response.body}` : null;

  const tests = response.testResults ?? [];
  const passedCount = tests.filter((t) => t.passed).length;
  const failedCount = tests.filter((t) => !t.passed).length;
  const totalTests = tests.length;

  const hasSearch = searchQuery.trim().length > 0 && !isBinaryPreview && bodyView === "preview";
  const hasMatches = matchCount > 0;

  return (
    <div className="flex flex-1 min-h-0 min-w-0 w-full flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 flex-wrap gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <ResponseStats
            status={response.status}
            statusText={response.statusText}
            time={response.time}
            size={response.size}
          />
        </div>

        <div className="flex items-center gap-2 sm:flex-1 sm:min-w-0 sm:justify-end">
          <div className="relative flex items-center w-full sm:w-[320px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground shrink-0 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isBinaryPreview
                  ? "Search not available for this preview"
                  : bodyView === "raw"
                    ? "Switch to preview to search"
                    : "Search in preview..."
              }
              disabled={isBinaryPreview || bodyView === "raw"}
              className="pl-8 pr-16 h-8 text-sm w-full"
            />
            {hasSearch && hasMatches && (
              <motion.div
                layout
                className="absolute inset-y-0 right-1 flex items-center gap-1 text-[11px]"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
              >
                <button
                  type="button"
                  className="h-6 w-6 inline-flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  onClick={() => jsonViewerRef.current?.goPrev()}
                  disabled={currentMatchIndex <= 0}
                  title="Previous match"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <motion.span
                  key={currentMatchIndex}
                  className="px-1 min-w-9 text-center tabular-nums text-muted-foreground"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                  {currentMatchIndex + 1}/{matchCount}
                </motion.span>
                <button
                  type="button"
                  className="h-6 w-6 inline-flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  onClick={() => jsonViewerRef.current?.goNext()}
                  disabled={currentMatchIndex >= matchCount - 1}
                  title="Next match"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </motion.div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={copy}
              title={copied ? "Copied!" : "Copy"}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={download}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        </div>
      </div>

      <div className="shrink-0 flex flex-col gap-3">
        <div
          role="tablist"
          className={cn(
            "inline-flex w-fit max-w-full min-w-0 flex-wrap items-stretch",
            segmentedTabListClassName
          )}
        >
          {[
            { id: "body", label: "Response" },
            { id: "headers", label: `Headers (${Object.keys(response.headers).length})` },
            ...(response.preRequestResult
              ? [
                  {
                    id: "pre-request",
                    label: response.preRequestResult.error
                      ? "Pre-request (Error)"
                      : `Pre-request (${response.preRequestResult.durationMs}ms)`,
                  },
                ]
              : []),
            ...(response.testResults && response.testResults.length > 0
              ? [
                  {
                    id: "tests",
                    label: `Tests (${response.testResults.filter((t) => t.passed).length}/${response.testResults.length})`,
                  },
                ]
              : []),
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id as "body" | "headers" | "pre-request" | "tests")}
                className={segmentedTabTriggerClassName(isActive, "h-7 shrink-0 px-3 sm:px-4")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "body" && (
            <AnimatedTabContent
              key="body"
              className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
            >
              <div className="mt-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div
                    role="tablist"
                    aria-label="Body view"
                    className={cn(
                      "inline-flex w-fit min-w-0 items-stretch",
                      segmentedTabListClassName
                    )}
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={bodyView === "preview"}
                      className={segmentedTabTriggerClassName(
                        bodyView === "preview",
                        "h-7 shrink-0 px-3 py-1.5 whitespace-nowrap"
                      )}
                      onClick={() => setBodyView("preview")}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={bodyView === "raw"}
                      className={segmentedTabTriggerClassName(
                        bodyView === "raw",
                        "h-7 shrink-0 px-3 py-1.5 whitespace-nowrap"
                      )}
                      onClick={() => setBodyView("raw")}
                    >
                      Raw
                    </button>
                  </div>
                </div>

                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border/40 bg-background">
                  <div
                    className={cn(
                      "flex min-h-0 min-w-0 flex-1 custom-scrollbar",
                      bodyView === "raw" ? "overflow-y-auto overflow-x-hidden" : "overflow-auto"
                    )}
                  >
                    {bodyView === "raw" ? (
                      <div className="min-h-0 min-w-0 max-w-full p-4">
                        {isJson ? (
                          <pre className="m-0 min-w-0 max-w-full text-xs leading-relaxed font-mono whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                            <JsonColorized text={response.body} />
                          </pre>
                        ) : (
                          <pre className="m-0 min-w-0 max-w-full text-xs leading-relaxed whitespace-pre-wrap break-words font-mono [overflow-wrap:anywhere]">
                            {response.body}
                          </pre>
                        )}
                      </div>
                    ) : dataUrl ? (
                      <div className="min-h-0 min-w-0 flex flex-col items-center p-4">
                        {isImageResponse && dataUrl && (
                          <Image
                            src={dataUrl}
                            alt="Response"
                            width={800}
                            height={600}
                            className="max-w-full h-auto object-contain"
                          />
                        )}
                        {isPdfResponse && (
                          <iframe
                            src={dataUrl}
                            title="PDF response"
                            className="min-h-[500px] w-full flex-1 rounded border-0"
                          />
                        )}
                      </div>
                    ) : displayBody ? (
                      <JsonResponseViewer
                        ref={jsonViewerRef}
                        text={displayBody}
                        searchQuery={searchQuery}
                        onMatchChange={onMatchChange}
                        className="h-full w-full min-w-0"
                      />
                    ) : (
                      <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-4">
                        <span className="text-muted-foreground text-sm">Empty response body</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </AnimatedTabContent>
          )}

          {activeTab === "pre-request" && response.preRequestResult && (
            <AnimatedTabContent
              key="pre-request"
              className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
            >
              <div className="mt-2 flex-1 min-h-0 flex flex-col">
                <div className="flex-1 min-h-0 rounded-md border border-border/40 bg-background flex flex-col overflow-hidden">
                  <div className="flex-1 min-h-0 overflow-auto custom-scrollbar p-4">
                    <div className="space-y-3">
                      {response.preRequestResult.error && (
                        <div className="text-xs text-destructive bg-destructive/5 px-3 py-2 rounded-md font-mono">
                          {response.preRequestResult.error}
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground uppercase font-bold">
                        Duration: {response.preRequestResult.durationMs}ms
                      </div>
                      {response.preRequestResult.logs.length > 0 ? (
                        <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-all bg-muted/30 p-3 rounded-md">
                          {response.preRequestResult.logs.join("\n")}
                        </pre>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          No console output from pre-request script
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedTabContent>
          )}

          {activeTab === "headers" && (
            <AnimatedTabContent
              key="headers"
              className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
            >
              <div className="mt-2 flex-1 min-h-0 flex flex-col">
                <div className="flex-1 min-h-0 rounded-md border border-border/40 bg-background flex flex-col overflow-hidden">
                  <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2 text-left font-medium">Header</th>
                          <th className="px-3 py-2 text-left font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(response.headers).map(([key, value]) => (
                          <tr key={key} className="border-b last:border-0">
                            <td className="px-3 py-2 font-mono text-muted-foreground">{key}</td>
                            <td className="px-3 py-2 font-mono break-all">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </AnimatedTabContent>
          )}

          {activeTab === "tests" && tests.length > 0 && (
            <AnimatedTabContent
              key="tests"
              className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
            >
              <div className="mt-2 flex-1 min-h-0 overflow-y-auto">
                <TestResults
                  summary={{
                    passed: passedCount,
                    failed: failedCount,
                    skipped: 0,
                    total: totalTests,
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
                      status={failedCount > 0 ? "failed" : "passed"}
                      defaultOpen
                    >
                      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                        <TestSuiteName />
                        <TestSuiteStats passed={passedCount} failed={failedCount} skipped={0} />
                      </div>
                      <TestSuiteContent>
                        {tests.map((t) => (
                          <Test key={t.name} name={t.name} status={t.passed ? "passed" : "failed"}>
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
              </div>
            </AnimatedTabContent>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
