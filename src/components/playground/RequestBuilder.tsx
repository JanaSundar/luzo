"use client";

import { Plus, Send, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useState } from "react";
import { executeRequest } from "@/app/actions/api-tests";
import { FormDataBodyEditor } from "@/components/playground/FormDataBodyEditor";
import { PreRequestBuilder } from "@/components/playground/PreRequestBuilder";
import { ScriptEditor } from "@/components/playground/ScriptEditor";
import { TestBuilder } from "@/components/playground/TestBuilder";
import { AnimatedTabContent } from "@/components/ui/animated-tab-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAutomationStore } from "@/lib/stores/useAutomationStore";
import { useCollectionStore } from "@/lib/stores/useCollectionStore";
import { usePlaygroundStore } from "@/lib/stores/usePlaygroundStore";
import { cn } from "@/lib/utils";
import { compilePreRequestRules, compileTestRules } from "@/lib/utils/rule-compiler";
import { parsePreRequestScript, parseTestScript } from "@/lib/utils/rule-parser";
import type { HttpMethod, KeyValuePair, PreRequestRule, TestRule } from "@/types";

const PRE_REQUEST_EXAMPLES = `// Example: set a variable
pm.env.set("token", "abc123");

// Modify request
pm.request.headers.upsert("X-Custom", "value");`;

const TEST_EXAMPLES = `// Example: status check
pm.test("Status is 200", function() {
  pm.expect(pm.response.status).to.equal(200);
});

// Example: JSON body
pm.test("Response has success", function() {
  const json = pm.response.json();
  pm.expect(json).to.have.property("success");
});`;

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "text-emerald-500",
  POST: "text-blue-500",
  PUT: "text-amber-500",
  DELETE: "text-red-500",
  PATCH: "text-purple-500",
  HEAD: "text-cyan-500",
  OPTIONS: "text-gray-500",
};

function KeyValueEditor({
  pairs,
  onChange,
  placeholder = "Key",
}: {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  placeholder?: string;
}) {
  const add = () => onChange([...pairs, { key: "", value: "", enabled: true }]);

  const update = (index: number, field: keyof KeyValuePair, value: string | boolean) =>
    onChange(pairs.map((p, i) => (i === index ? { ...p, [field]: value } : p)));

  const remove = (index: number) => onChange(pairs.filter((_, i) => i !== index));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {pairs.map((pair, i) => (
          <div
            key={pair.key || `${pair.value}-${pair.enabled}-${i}`}
            className="flex items-center gap-2"
          >
            <Switch
              checked={pair.enabled}
              onCheckedChange={(v) => update(i, "enabled", v)}
              className="shrink-0"
            />
            <Input
              value={pair.key}
              onChange={(e) => update(i, "key", e.target.value)}
              placeholder={placeholder}
              className="h-8 text-sm"
            />
            <Input
              value={pair.value}
              onChange={(e) => update(i, "value", e.target.value)}
              placeholder="Value"
              className="h-8 text-sm"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => remove(i)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={add}>
        <Plus className="h-3.5 w-3.5" />
        Add
      </Button>
    </div>
  );
}

export function RequestBuilder() {
  const {
    request,
    response,
    isLoading,
    setMethod,
    setUrl,
    setRequest,
    setResponse,
    setLoading,
    getActiveEnvironmentVariables,
  } = usePlaygroundStore();

  const { addToHistory } = useCollectionStore();
  const { isRecording, addStep } = useAutomationStore();

  const [activeTab, setActiveTab] = useState<
    "params" | "headers" | "body" | "auth" | "pre-request" | "tests"
  >("params");

  const send = useCallback(async () => {
    if (!request.url) return;
    setLoading(true);
    setResponse(null);

    try {
      const envVars = getActiveEnvironmentVariables();

      // Compile visual rules on the fly if using visual editor
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

        const res = await fetch("/api/execute", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Request failed");
        setResponse(data);
      } else {
        // use overridden scripts when passing request internally
        const response = await executeRequest(
          {
            ...request,
            preRequestScript: finalPreRequestScript,
            testScript: finalTestScript,
          },
          envVars
        );
        setResponse(response);
      }
      addToHistory(`${request.method} ${request.url}`, request);
    } catch (error: unknown) {
      console.error("Request failed:", error);
    } finally {
      setLoading(false);

      // Capture step if recording is active
      if (isRecording) {
        addStep({
          type: "request",
          name: `${request.method} ${request.url}`,
          method: request.method,
          url: request.url,
          headers: request.headers,
          params: request.params,
          body: request.body,
          bodyType: request.bodyType,
          response: response
            ? {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                body: response.body,
                responseTime: response.time,
              }
            : null,
        });
      }
    }
  }, [
    request,
    setLoading,
    setResponse,
    getActiveEnvironmentVariables,
    addToHistory,
    isRecording,
    addStep,
    response,
  ]);

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={request.method} onValueChange={(v) => setMethod(v as HttpMethod)}>
          <SelectTrigger className="w-[110px] font-mono font-semibold" aria-label="HTTP Method">
            <SelectValue>
              <span className={cn("font-semibold", METHOD_COLORS[request.method])}>
                {request.method}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {HTTP_METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                <span className={cn("font-mono font-semibold", METHOD_COLORS[m])}>{m}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1 flex gap-2">
          <Input
            value={request.url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL or {{variable}}/path"
            className="flex-1 font-mono text-sm"
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") send();
            }}
          />

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="shrink-0">
            <Button onClick={send} disabled={isLoading || !request.url} className="gap-2 min-w-20">
              <Send className="h-4 w-4" />
              {isLoading ? "Sending..." : "Send"}
            </Button>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <nav className="inline-flex justify-around items-center gap-0.5 rounded-full bg-muted/50 p-0.5 border border-border/50 w-full md:w-fit">
          {[
            { id: "params", label: "Params" as const },
            { id: "headers", label: "Headers" as const },
            { id: "body", label: "Body" as const },
            { id: "auth", label: "Auth" as const },
            { id: "pre-request", label: "Pre-request" as const },
            { id: "tests", label: "Tests" as const },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const count =
              tab.id === "params"
                ? request.params.filter((p) => p.enabled && p.key).length
                : tab.id === "headers"
                  ? request.headers.filter((h) => h.enabled && h.key).length
                  : 0;
            const showCheck =
              tab.id === "tests" && !!(response?.testResults && response.testResults.length > 0);

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  "relative flex h-7 items-center px-2 md:px-4 text-[8px] md:text-[11px] uppercase tracking-wider font-semibold transition-all rounded-full outline-none",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="request-tabs-pill"
                    className="absolute inset-0 bg-primary rounded-full shadow-sm"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {tab.label}
                  {count > 0 && (
                    <span className="rounded-full bg-foreground/15 px-1.5 text-[10px] font-bold">
                      {count}
                    </span>
                  )}
                  {showCheck && (
                    <span className="rounded-full bg-foreground/15 px-1.5 text-[10px] font-bold">
                      ✓
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>

        {activeTab === "params" && (
          <div className="mt-4">
            <AnimatedTabContent>
              <KeyValueEditor
                pairs={request.params}
                onChange={(params) => setRequest({ params })}
                placeholder="Parameter"
              />
            </AnimatedTabContent>
          </div>
        )}

        {activeTab === "headers" && (
          <div className="mt-4">
            <AnimatedTabContent>
              <KeyValueEditor
                pairs={request.headers}
                onChange={(headers) => setRequest({ headers })}
                placeholder="Header"
              />
            </AnimatedTabContent>
          </div>
        )}

        {activeTab === "body" && (
          <div className="mt-4 space-y-4 flex-1 min-h-0">
            <AnimatedTabContent className="flex-1 min-h-0 flex flex-col">
              <div className="space-y-4">
                <Select
                  value={request.bodyType}
                  onValueChange={(v) => {
                    const bodyType = v as typeof request.bodyType;
                    setRequest({
                      bodyType,
                      body: bodyType === "form-data" ? null : request.body,
                      formDataFields:
                        bodyType === "form-data" && !request.formDataFields?.length
                          ? []
                          : request.formDataFields,
                    });
                  }}
                >
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="raw">Raw</SelectItem>
                    <SelectItem value="form-data">Form Data</SelectItem>
                    <SelectItem value="x-www-form-urlencoded">URL Encoded</SelectItem>
                  </SelectContent>
                </Select>

                {request.bodyType === "form-data" && (
                  <FormDataBodyEditor
                    fields={request.formDataFields ?? []}
                    onChange={(formDataFields) => setRequest({ formDataFields })}
                  />
                )}

                {request.bodyType !== "none" && request.bodyType !== "form-data" && (
                  <div className="space-y-2 flex-1 min-h-0 flex flex-col">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{request.bodyType === "json" ? "JSON body" : "Raw body"}</span>
                      {request.bodyType === "json" && (
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => {
                            const current = request.body ?? "";
                            if (!current.trim()) return;
                            try {
                              const parsed = JSON.parse(current);
                              setRequest({
                                body: JSON.stringify(parsed, null, 2),
                              });
                            } catch {
                              // ignore parse errors
                            }
                          }}
                        >
                          Prettify
                        </button>
                      )}
                    </div>
                    <div className="flex-1 min-h-0 max-h-[40vh] overflow-y-auto">
                      <Textarea
                        value={request.body ?? ""}
                        onChange={(e) => setRequest({ body: e.target.value })}
                        placeholder={
                          request.bodyType === "json" ? '{\n  "key": "value"\n}' : "Request body..."
                        }
                        className="font-mono text-sm h-full min-h-32"
                      />
                    </div>
                  </div>
                )}
              </div>
            </AnimatedTabContent>
          </div>
        )}

        {activeTab === "auth" && (
          <div className="mt-4">
            <AnimatedTabContent>
              <div className="space-y-5">
                <Select
                  value={request.auth.type}
                  onValueChange={(v) =>
                    setRequest({ auth: { type: v as typeof request.auth.type } })
                  }
                >
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Auth</SelectItem>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                    <SelectItem value="api-key">API Key</SelectItem>
                  </SelectContent>
                </Select>

                {request.auth.type === "bearer" && (
                  <Input
                    value={request.auth.bearer?.token ?? ""}
                    onChange={(e) =>
                      setRequest({
                        auth: {
                          type: "bearer",
                          bearer: { token: e.target.value },
                        },
                      })
                    }
                    placeholder="Bearer token"
                    className="font-mono text-sm"
                  />
                )}

                {request.auth.type === "basic" && (
                  <div className="flex gap-2">
                    <Input
                      value={request.auth.basic?.username ?? ""}
                      onChange={(e) =>
                        setRequest({
                          auth: {
                            type: "basic",
                            basic: {
                              username: e.target.value,
                              password: request.auth.basic?.password ?? "",
                            },
                          },
                        })
                      }
                      placeholder="Username"
                      className="text-sm"
                    />
                    <Input
                      type="password"
                      value={request.auth.basic?.password ?? ""}
                      onChange={(e) =>
                        setRequest({
                          auth: {
                            type: "basic",
                            basic: {
                              username: request.auth.basic?.username ?? "",
                              password: e.target.value,
                            },
                          },
                        })
                      }
                      placeholder="Password"
                      className="text-sm"
                    />
                  </div>
                )}

                {request.auth.type === "api-key" && (
                  <div className="flex gap-2">
                    <Input
                      value={request.auth.apiKey?.key ?? ""}
                      onChange={(e) =>
                        setRequest({
                          auth: {
                            type: "api-key",
                            apiKey: {
                              key: e.target.value,
                              value: request.auth.apiKey?.value ?? "",
                              placement: request.auth.apiKey?.placement ?? "header",
                            },
                          },
                        })
                      }
                      placeholder="Header name"
                      className="text-sm"
                    />
                    <Input
                      value={request.auth.apiKey?.value ?? ""}
                      onChange={(e) =>
                        setRequest({
                          auth: {
                            type: "api-key",
                            apiKey: {
                              key: request.auth.apiKey?.key ?? "",
                              value: e.target.value,
                              placement: request.auth.apiKey?.placement ?? "header",
                            },
                          },
                        })
                      }
                      placeholder="API key value"
                      className="font-mono text-sm"
                    />
                  </div>
                )}
              </div>
            </AnimatedTabContent>
          </div>
        )}

        {activeTab === "pre-request" && (
          <div className="mt-4 flex flex-col flex-1 min-h-0">
            <ScriptEditor<PreRequestRule>
              label="Setup actions before the run"
              description={
                <>
                  Access <code className="font-mono">pm.request</code>,{" "}
                  <code className="font-mono">pm.env</code>,{" "}
                  <code className="font-mono">pm.variables</code>.
                </>
              }
              editorType={request.preRequestEditorType || "visual"}
              script={request.preRequestScript ?? ""}
              rules={request.preRequestRules || []}
              onEditorTypeChange={(type) => setRequest({ preRequestEditorType: type })}
              onScriptChange={(script, rules) =>
                setRequest({
                  preRequestScript: script,
                  preRequestRules: rules as PreRequestRule[],
                })
              }
              VisualBuilder={PreRequestBuilder}
              compileRules={compilePreRequestRules}
              parseScript={parsePreRequestScript}
              placeholder={PRE_REQUEST_EXAMPLES}
            />
          </div>
        )}

        {activeTab === "tests" && (
          <div className="mt-4 flex flex-col flex-1 min-h-0">
            <ScriptEditor<TestRule>
              label="Assertions after the response"
              description={
                <>
                  Use <code className="font-mono">pm.test()</code>,{" "}
                  <code className="font-mono">pm.response</code>,{" "}
                  <code className="font-mono">pm.expect()</code> for assertions.
                </>
              }
              editorType={request.testEditorType || "visual"}
              script={request.testScript ?? ""}
              rules={request.testRules || []}
              onEditorTypeChange={(type) => setRequest({ testEditorType: type })}
              onScriptChange={(script, rules) =>
                setRequest({ testScript: script, testRules: rules as TestRule[] })
              }
              VisualBuilder={TestBuilder}
              compileRules={compileTestRules}
              parseScript={parseTestScript}
              placeholder={TEST_EXAMPLES}
            />
          </div>
        )}
      </div>
    </div>
  );
}
