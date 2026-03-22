"use client";

import { Activity } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ResponseContent } from "@/components/playground/response/ResponseContent";
import { ResponseToolbar } from "@/components/playground/response/ResponseToolbar";
import { segmentedTabListClassName, segmentedTabTriggerClassName } from "@/lib/ui/segmentedTabs";
import { useExecutionStore } from "@/lib/stores/useExecutionStore";
import { cn } from "@/lib/utils";

export function ResponseViewer() {
  const response = useExecutionStore((state) => state.activeRawResponse);
  const isLoading = useExecutionStore((state) => state.isLoading);
  const [searchQuery, setSearchQuery] = useState("");
  const [bodyView, setBodyView] = useState<"preview" | "raw">("preview");
  const [activeTab, setActiveTab] = useState<"body" | "headers" | "pre-request" | "tests">("body");
  const [fontScale, setFontScale] = useState<"sm" | "md" | "lg">("md");
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    if (!response) return;
    await navigator.clipboard.writeText(response.body);
    setCopied(true);
    toast.success("Copied to clipboard");
    window.setTimeout(() => setCopied(false), 1800);
  }, [response]);

  const contentType = useMemo(() => {
    if (!response) return "";
    const key = Object.keys(response.headers).find(
      (header) => header.toLowerCase() === "content-type",
    );
    return key ? response.headers[key].toLowerCase().split(";")[0].trim() : "";
  }, [response]);

  const isBinaryPreview = contentType.startsWith("image/") || contentType === "application/pdf";
  const isJson = useMemo(() => {
    if (!response || isBinaryPreview) return false;
    try {
      JSON.parse(response.body);
      return true;
    } catch {
      return false;
    }
  }, [isBinaryPreview, response]);

  const dataUrl = useMemo(
    () =>
      response && isBinaryPreview && response.body
        ? `data:${contentType};base64,${response.body}`
        : null,
    [contentType, isBinaryPreview, response],
  );

  const download = useCallback(() => {
    if (!response) return;
    const blob =
      isBinaryPreview && response.body
        ? new Blob([Uint8Array.from(atob(response.body), (char) => char.charCodeAt(0))], {
            type: contentType,
          })
        : new Blob([response.body], { type: isJson ? "application/json" : "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = isBinaryPreview
      ? `response.${contentType.split("/")[1] || "bin"}`
      : isJson
        ? "response.json"
        : "response.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [contentType, isBinaryPreview, isJson, response]);

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

  const tabs = [
    { id: "body" as const, label: "Response" },
    { id: "headers" as const, label: `Headers (${Object.keys(response.headers).length})` },
    ...(response.preRequestResult
      ? [
          {
            id: "pre-request" as const,
            label: `Pre-request (${response.preRequestResult.durationMs}ms)`,
          },
        ]
      : []),
    ...(response.testResults?.length
      ? [
          {
            id: "tests" as const,
            label: `Tests (${response.testResults.filter((test) => test.passed).length}/${response.testResults.length})`,
          },
        ]
      : []),
  ];

  const searchPlaceholder = isBinaryPreview
    ? "Search unavailable"
    : bodyView === "raw"
      ? "Switch to preview to search"
      : "Search response";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ResponseToolbar
        status={response.status}
        statusText={response.statusText}
        time={response.time}
        size={response.size}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={searchPlaceholder}
        searchDisabled={isBinaryPreview || bodyView === "raw" || !isJson}
        onCopy={() => void copy()}
        onDownload={download}
        copied={copied}
        fontScale={fontScale}
        onFontScaleChange={setFontScale}
      />

      <div
        role="tablist"
        className={cn("inline-flex w-fit items-center", segmentedTabListClassName)}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={segmentedTabTriggerClassName(activeTab === tab.id, "h-8 px-3")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        <ResponseContent
          response={response}
          bodyView={bodyView}
          onBodyViewChange={setBodyView}
          activeTab={activeTab}
          searchQuery={searchQuery}
          isJson={isJson}
          isBinaryPreview={isBinaryPreview}
          dataUrl={dataUrl}
          contentType={contentType}
          fontScale={fontScale}
        />
      </div>
    </div>
  );
}
