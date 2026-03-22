"use client";

import { FolderPlus, GitBranch, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { executeRequest } from "@/app/actions/api-tests";
import { SaveToCollectionDialog } from "@/components/collections/SaveToCollectionDialog";
import { AddToPipelineDialog } from "@/components/playground/request/AddToPipelineDialog";
import { RequestForm } from "@/components/shared/RequestForm";
import type { TabId } from "@/components/shared/RequestFormTabs";
import { RequestUrlBar } from "@/components/shared/RequestUrlBar";
import { Button } from "@/components/ui/button";
import { useEnvironmentStore } from "@/lib/stores/useEnvironmentStore";
import { useExecutionStore } from "@/lib/stores/useExecutionStore";
import { useHistoryStore } from "@/lib/stores/useHistoryStore";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import { usePlaygroundStore } from "@/lib/stores/usePlaygroundStore";
import { buildEnvironmentVariableSuggestions } from "@/lib/utils/variableMetadata";
import { compilePreRequestRules, compileTestRules } from "@/lib/utils/rule-compiler";

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

  // Build env variable suggestions for {{}} autocomplete in the URL bar
  const urlSuggestions = useMemo(() => {
    const values = Object.fromEntries(
      environmentVariables
        .filter((variable) => variable.enabled)
        .map((variable) => [variable.key, variable.value]),
    );
    return buildEnvironmentVariableSuggestions(values);
  }, [environmentVariables]);

  // Disable body tab for GET and HEAD requests (per HTTP standards - these methods should not have request body)
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
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <RequestUrlBar
          method={request.method}
          url={request.url}
          suggestions={urlSuggestions}
          onMethodChange={setMethod}
          onUrlChange={setUrl}
          onSend={send}
          placeholder="Enter URL or {{variable}}/path"
          className="min-w-[min(100%,30rem)] flex-[999_1_42rem] bg-transparent p-0"
        />
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
          <AddToPipelineDialog
            pipelines={pipelines.map((pipeline) => ({ id: pipeline.id, name: pipeline.name }))}
            onAddToPipeline={handleAddToPipeline}
            onCreateAndAdd={handleCreateAndAdd}
            trigger={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-2 rounded-lg border-border/40 bg-background px-2.5 text-sm font-medium"
              >
                <GitBranch className="h-3.5 w-3.5" />
                <span>Pipeline</span>
              </Button>
            }
          />
          <SaveToCollectionDialog
            request={request}
            defaultName={`${request.method} ${request.url || "Request"}`}
            trigger={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-2 rounded-lg border-border/40 bg-background px-2.5 text-sm font-medium"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                <span>Save</span>
              </Button>
            }
          />
          <Button
            type="button"
            onClick={send}
            disabled={isLoading || !request.url}
            className="h-9 min-w-[110px] gap-2 rounded-lg bg-foreground text-background hover:bg-foreground/90"
          >
            <Send className="h-3.5 w-3.5" />
            {isLoading ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>

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
        className="min-h-0 flex-1"
      />
    </div>
  );
}
