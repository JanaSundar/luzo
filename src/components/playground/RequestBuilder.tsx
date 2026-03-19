"use client";

import { GitBranch, Send } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { executeRequest } from "@/app/actions/api-tests";
import { SaveToCollectionDialog } from "@/components/collections/SaveToCollectionDialog";
import { RequestForm } from "@/components/shared/RequestForm";
import type { TabId } from "@/components/shared/RequestFormTabs";
import { RequestUrlBar } from "@/components/shared/RequestUrlBar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useEnvironmentStore } from "@/lib/stores/useEnvironmentStore";
import { useExecutionStore } from "@/lib/stores/useExecutionStore";
import { useHistoryStore } from "@/lib/stores/useHistoryStore";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import { usePlaygroundStore } from "@/lib/stores/usePlaygroundStore";
import { compilePreRequestRules, compileTestRules } from "@/lib/utils/rule-compiler";
import type { VariableSuggestion } from "@/types/pipeline-debug";

export function RequestBuilder() {
  const { request, setMethod, setUrl, setRequest } = usePlaygroundStore();
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

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");

  // Build env variable suggestions for {{}} autocomplete in the URL bar
  const urlSuggestions = useMemo<VariableSuggestion[]>(() => {
    const envVars = getActiveEnvironmentVariables();
    return Object.keys(envVars).map((key) => ({
      path: key,
      label: `env: ${key}`,
      type: "env" as const,
      stepId: "",
    }));
  }, [getActiveEnvironmentVariables]);

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
          envVars
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
      setIsAddDialogOpen(false);
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
    [addStep, request, setActivePipeline, setView, router]
  );

  const handleCreateAndAdd = useCallback(() => {
    const name = newPipelineName.trim() || `New Pipeline ${pipelines.length + 1}`;
    addPipeline(name);
    setTimeout(() => {
      const newId = usePipelineStore.getState().activePipelineId;
      if (newId) {
        handleAddToPipeline(newId, name);
        setNewPipelineName("");
      }
    }, 0);
  }, [newPipelineName, pipelines.length, addPipeline, handleAddToPipeline]);

  return (
    <div className="flex flex-col gap-6 w-full min-h-0 pb-10">
      {/* URL Bar */}
      <div className="bg-background border rounded-xl shadow-sm">
        <div className="flex items-center gap-3 p-4 bg-muted/10">
          <RequestUrlBar
            method={request.method}
            url={request.url}
            suggestions={urlSuggestions}
            onMethodChange={setMethod}
            onUrlChange={setUrl}
            onSend={send}
            placeholder="Enter URL or {{variable}}/path"
            className="flex-1 bg-transparent p-0"
          />

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="shrink-0 pl-4 border-l border-muted/30 flex items-center gap-2"
          >
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 border-muted/30 hover:bg-muted text-muted-foreground"
                    title="Add to Pipeline"
                  >
                    <GitBranch className="h-3.5 w-3.5" />
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add to Pipeline</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Existing Pipelines
                    </label>
                    <div className="max-h-[200px] overflow-y-auto border rounded-md divide-y custom-scrollbar">
                      {pipelines.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No pipelines found
                        </div>
                      ) : (
                        pipelines.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-2 hover:bg-muted/50"
                          >
                            <span className="text-sm font-medium truncate flex-1 pr-2">
                              {p.name}
                            </span>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => handleAddToPipeline(p.id, p.name)}
                              className="text-[10px] font-bold uppercase"
                            >
                              Add
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="pt-4 border-t space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Create New Pipeline
                    </label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Pipeline name..."
                        value={newPipelineName}
                        onChange={(e) => setNewPipelineName(e.target.value)}
                        className="h-9 text-sm"
                        onKeyDown={(e) => e.key === "Enter" && handleCreateAndAdd()}
                      />
                      <Button size="sm" onClick={handleCreateAndAdd} className="h-9 font-bold">
                        Create & Add
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose
                    render={
                      <Button type="button" variant="outline">
                        Close
                      </Button>
                    }
                  />
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <SaveToCollectionDialog
              request={request}
              defaultName={`${request.method} ${request.url || "Request"}`}
            />

            <Button
              type="button"
              onClick={send}
              disabled={isLoading || !request.url}
              className="gap-2 min-w-[100px] h-9 bg-foreground text-background hover:bg-foreground/90 font-bold"
            >
              <Send className="h-3.5 w-3.5" />
              {isLoading ? "Sending..." : "Send"}
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Request Form Tabs */}
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
      />
    </div>
  );
}
