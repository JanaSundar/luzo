"use client";

import { FolderPlus, GitBranch, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { executeRequest } from "@/app/actions/api-tests";
import { SaveToCollectionDialog } from "@/components/collections/SaveToCollectionDialog";
import { AddToPipelineDialog } from "@/components/playground/request/AddToPipelineDialog";
import { ImportCurlDialog } from "@/components/playground/request/ImportCurlDialog";
import { useCollectionRequestSync } from "@/components/playground/request/useCollectionRequestSync";
import { RequestForm } from "@/components/shared/RequestForm";
import type { TabId } from "@/components/shared/RequestFormTabs";
import { RequestUrlBar } from "@/components/shared/RequestUrlBar";
import { Button } from "@/components/ui/button";
import { useEnvironmentStore } from "@/stores/useEnvironmentStore";
import { useExecutionStore } from "@/stores/useExecutionStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { usePlaygroundStore } from "@/stores/usePlaygroundStore";
import { buildEnvironmentVariableSuggestions } from "@/utils/variableMetadata";
import { compilePreRequestRules, compileTestRules } from "@/utils/rule-compiler";
import { cn } from "@/utils";

export function RequestBuilder() {
  const { request, setMethod, setUrl, setRequest } = usePlaygroundStore();
  const environmentVariables = useEnvironmentStore((state) => {
    const activeEnvironment = state.environments.find(
      (environment) => environment.id === state.activeEnvironmentId,
    );
    return activeEnvironment?.variables ?? [];
  });
  const {
    activeRawResponse: response,
    isLoading,
    setPlaygroundResponse: setResponse,
    setLoading,
  } = useExecutionStore();
  const { getActiveEnvironmentVariables } = useEnvironmentStore();
  const { addToHistory } = useHistoryStore();
  const { pipelines, addStep, addPipeline, setActivePipeline, setView } = usePipelineStore();
  const router = useRouter();
  const collectionSync = useCollectionRequestSync(request, response);

  // Build env variable suggestions for {{}} autocomplete in the URL bar
  const urlSuggestions = useMemo(() => {
    return buildEnvironmentVariableSuggestions(environmentVariables.filter((v) => v.enabled));
  }, [environmentVariables]);

  // Disable body tab for GET and HEAD requests
  const disabledTabs: TabId[] =
    request.method === "GET" || request.method === "HEAD" ? ["body"] : [];

  const send = useCallback(async () => {
    if (!request.url) return;
    setLoading(true);
    setResponse(null);

    try {
      const envVars = getActiveEnvironmentVariables();

      let finalTestScript = request.testScript;
      if (request.testEditorType === "visual") {
        finalTestScript = compileTestRules(request.testRules);
      }

      let finalPreRequestScript = request.preRequestScript;
      if (request.preRequestEditorType === "visual") {
        finalPreRequestScript = compilePreRequestRules(request.preRequestRules);
      }

      if (request.bodyType === "form-data") {
        const formData = new FormData();
        const config = {
          method: request.method,
          url: request.url,
          headers: request.headers,
          params: request.params,
          auth: request.auth,
          envVariables: envVars,
          preRequestScript: finalPreRequestScript,
          testScript: finalTestScript,
        };
        formData.append("__config", JSON.stringify(config));

        for (const f of request.formDataFields ?? []) {
          if (!f.enabled || !f.key) continue;
          if (f.type === "file") {
            if (f.file) formData.append(f.key, f.file);
          } else {
            formData.append(f.key, f.value);
          }
        }

        const res = await fetch("/api/execute", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Request failed");
        setResponse(data);
      } else {
        const resp = await executeRequest(
          { ...request, preRequestScript: finalPreRequestScript, testScript: finalTestScript },
          envVars,
        );
        setResponse({
          ...resp,
          testResults: resp.testResults ?? resp.testResult?.testResults,
        });
      }

      addToHistory(`${request.method} ${request.url}`, request);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Request failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [request, setLoading, setResponse, getActiveEnvironmentVariables, addToHistory]);

  const handleAddToPipeline = useCallback(
    (pipelineId: string, pipelineName: string) => {
      addStep(pipelineId, {
        ...request,
        name: "", // Fallback to Request N in UI
      });
      toast.success(`Request added to ${pipelineName}`, {
        action: {
          label: "Open Pipeline",
          onClick: () => {
            setActivePipeline(pipelineId);
            setView("builder");
            router.push("/pipelines");
          },
        },
      });
    },
    [addStep, request, setActivePipeline, setView, router],
  );

  const handleCreateAndAdd = useCallback(
    (pipelineName: string) => {
      const name = pipelineName.trim() || `New Pipeline ${pipelines.length + 1}`;
      addPipeline(name);
      setTimeout(() => {
        const newId = usePipelineStore.getState().activePipelineId;
        if (newId) {
          handleAddToPipeline(newId, name);
        }
      }, 0);
    },
    [pipelines.length, addPipeline, handleAddToPipeline],
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-[1.25rem] border border-border/40 bg-background/50 p-4 shadow-sm backdrop-blur-sm">
        {/* Method & URL Row */}
        <div className="flex shrink-0 items-center">
          <RequestUrlBar
            method={request.method}
            url={request.url}
            suggestions={urlSuggestions}
            onMethodChange={setMethod}
            onUrlChange={setUrl}
            onSend={send}
            placeholder="Enter URL or {{variable}}/path"
            className="w-full bg-background/80 shadow-inner px-1"
          />
        </div>

        {/* Action Buttons Row - Centered alignment */}
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <ImportCurlDialog
            onImport={(importedRequest) => setRequest(importedRequest)}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 rounded-full border-border/40 bg-background/80 px-4 text-xs font-semibold shadow-sm hover:bg-background"
              >
                <span className="font-mono opacity-60">()</span>
                <span>cURL</span>
              </Button>
            }
          />
          <AddToPipelineDialog
            pipelines={pipelines.map((p) => ({ id: p.id, name: p.name }))}
            onAddToPipeline={handleAddToPipeline}
            onCreateAndAdd={handleCreateAndAdd}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 rounded-full border-border/40 bg-background/80 px-4 text-xs font-semibold shadow-sm hover:bg-background"
              >
                <GitBranch className="h-3.5 w-3.5 opacity-60" />
                <span>Pipeline</span>
              </Button>
            }
          />
          <SaveToCollectionDialog
            request={request}
            response={response}
            defaultName={`${request.method} ${request.url || "Request"}`}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 rounded-full border-border/40 bg-background/80 px-4 text-xs font-semibold shadow-sm hover:bg-background"
              >
                <FolderPlus className="h-3.5 w-3.5 opacity-60" />
                <span>Save</span>
              </Button>
            }
          />
          <Button
            type="button"
            onClick={send}
            disabled={isLoading || !request.url}
            className="h-9 min-w-[110px] gap-2 rounded-full bg-foreground px-5 text-sm font-bold text-background shadow-md transition-all hover:bg-foreground/90 active:scale-[0.98]"
          >
            <Send className="h-3.5 w-3.5" />
            {isLoading ? "Sending..." : "Send"}
          </Button>
        </div>

        {/* Notification / Sync Bar */}
        {collectionSync.isLinked && collectionSync.canSync && (
          <div className="flex items-center gap-2 rounded-xl bg-muted/30 px-3 py-1.5 border border-border/30">
            <div className="flex items-center gap-1.5 border-r border-border/40 pr-2">
              <div
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  collectionSync.isDirty ? "bg-amber-500" : "bg-emerald-500",
                )}
              />
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">
                Sync
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground/60">
              {collectionSync.autoSave ? "Auto-save active" : "Manual sync"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-6 w-6 rounded-md hover:bg-background/80"
              onClick={() => void collectionSync.saveNow("manual")}
              disabled={collectionSync.isSaving || !collectionSync.isDirty}
            >
              <FolderPlus className="h-3 w-3" />
            </Button>
          </div>
        )}

        <div className="mt-2 min-h-0 flex-1">
          <RequestForm
            headers={request.headers}
            params={request.params}
            body={request.body}
            bodyType={request.bodyType}
            formDataFields={request.formDataFields}
            auth={request.auth}
            preRequestEditorType={request.preRequestEditorType}
            testEditorType={request.testEditorType}
            preRequestRules={request.preRequestRules}
            testRules={request.testRules}
            preRequestScript={request.preRequestScript}
            testScript={request.testScript}
            testResults={response?.testResults}
            suggestions={urlSuggestions}
            onChange={(partial) => setRequest(partial)}
            defaultTab="params"
            disabledTabs={disabledTabs}
            className="border-none bg-transparent shadow-none"
          />
        </div>
      </div>
    </div>
  );
}
