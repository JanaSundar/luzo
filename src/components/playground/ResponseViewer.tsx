"use client";

import { Activity, ChevronDown, ChevronUp, Copy, Download, Search } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
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
import { AnimatedTabContent } from "@/components/ui/animated-tab-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlaygroundStore } from "@/lib/stores/usePlaygroundStore";
import { cn } from "@/lib/utils";

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300)
    return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  if (status >= 300 && status < 400) return "bg-blue-500/15 text-blue-600 dark:text-blue-400";
  if (status >= 400 && status < 500) return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  if (status >= 500) return "bg-red-500/15 text-red-600 dark:text-red-400";
  return "bg-muted text-muted-foreground";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ResponseViewer() {
  const { response, isLoading } = usePlaygroundStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [bodyView, setBodyView] = useState<"preview" | "raw">("preview");
  const [activeTab, setActiveTab] = useState<"body" | "headers" | "tests">("body");
  const jsonViewerRef = useRef<JsonResponseViewerRef>(null);

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
    if (isBinaryPreview && response.body) {
      const binary = Uint8Array.from(atob(response.body), (c) => c.charCodeAt(0));
      blob = new Blob([binary], { type: contentType });
      const ext = isImageResponse ? contentType.replace("image/", "") : "pdf";
      filename = `response.${ext === "jpeg" ? "jpg" : ext}`;
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

  const copy = () => navigator.clipboard.writeText(response.body);

  const dataUrl =
    isBinaryPreview && response.body ? `data:${contentType};base64,${response.body}` : null;

  const tests = response.testResults ?? [];
  const passedCount = tests.filter((t) => t.passed).length;
  const failedCount = tests.filter((t) => !t.passed).length;
  const totalTests = tests.length;

  const hasSearch = searchQuery.trim().length > 0 && !isBinaryPreview && bodyView === "preview";
  const hasMatches = matchCount > 0;

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge className={cn("font-mono font-semibold text-sm", getStatusColor(response.status))}>
            {response.status} {response.statusText}
          </Badge>
          <span className="text-sm text-muted-foreground">{response.time}ms</span>
          <span className="text-sm text-muted-foreground">{formatSize(response.size)}</span>
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
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copy}>
              <Copy className="h-3.5 w-3.5" />
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
        <nav className="inline-flex items-center gap-0.5 rounded-full bg-muted/50 p-0.5 border border-border/50 w-fit">
          {[
            { id: "body", label: "Body" },
            { id: "headers", label: `Headers (${Object.keys(response.headers).length})` },
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
                onClick={() => setActiveTab(tab.id as "body" | "headers" | "tests")}
                className={cn(
                  "relative flex h-7 items-center px-4 text-[11px] uppercase tracking-wider font-semibold transition-all rounded-full outline-none",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="response-tabs-pill"
                    className="absolute inset-0 bg-primary rounded-full shadow-sm"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <AnimatedTabContent key={activeTab} className="flex-1 flex flex-col min-h-0">
          {activeTab === "body" && (
            <div className="mt-2 flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-1 rounded-md border border-border/40 bg-muted/40 p-0.5 text-xs">
                  <button
                    type="button"
                    className={cn(
                      "px-2 py-1 rounded-sm transition-colors",
                      bodyView === "preview"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setBodyView("preview")}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "px-2 py-1 rounded-sm transition-colors",
                      bodyView === "raw"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setBodyView("raw")}
                  >
                    Raw
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 max-h-[calc(100vh-260px)] rounded-md border border-border/40 bg-background overflow-auto">
                {bodyView === "raw" ? (
                  <div className="min-h-0 p-4">
                    {isJson ? (
                      <pre className="m-0 text-xs leading-relaxed font-mono whitespace-pre-wrap break-all">
                        <JsonColorized text={response.body} />
                      </pre>
                    ) : (
                      <pre className="m-0 text-xs leading-relaxed whitespace-pre-wrap break-all font-mono">
                        {response.body}
                      </pre>
                    )}
                  </div>
                ) : dataUrl ? (
                  <div className="min-h-0 p-4 flex flex-col items-center">
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
                        className="w-full flex-1 min-h-[500px] rounded border-0"
                      />
                    )}
                  </div>
                ) : displayBody ? (
                  <JsonResponseViewer
                    ref={jsonViewerRef}
                    text={displayBody}
                    searchQuery={searchQuery}
                    onMatchChange={onMatchChange}
                    className="flex-1"
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center p-4">
                    <span className="text-muted-foreground text-sm">Empty response body</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "headers" && (
            <div className="mt-2 flex-1 min-h-0">
              <div className="flex-1 min-h-0 max-h-[calc(100vh-260px)] rounded-md border overflow-auto">
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
          )}

          {activeTab === "tests" && tests.length > 0 && (
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
          )}
        </AnimatedTabContent>
      </div>
    </div>
  );
}
