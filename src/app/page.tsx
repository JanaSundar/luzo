"use client";

import { Activity, PanelLeft, PanelTop, Terminal } from "lucide-react";
import { motion } from "motion/react";
import { Suspense, useEffect, useState } from "react";
import { CodeGenerator } from "@/components/playground/CodeGenerator";
import { EnvironmentSelector } from "@/components/playground/EnvironmentSelector";
import { RequestBuilder } from "@/components/playground/RequestBuilder";
import { ResponseViewer } from "@/components/playground/ResponseViewer";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";
import { WorkspaceHeader } from "@/components/ui/workspace-header";
import { WorkspacePane } from "@/components/ui/workspace-pane";
import { getPersistedLayout, usePlaygroundStore } from "@/lib/stores/usePlaygroundStore";
import { cn } from "@/lib/utils";

function RequestPane() {
  return (
    <WorkspacePane>
      <WorkspaceHeader title="Request Pipeline" icon={Terminal}>
        <div className="flex items-center gap-1.5 opacity-50">
          <div className="h-1.5 w-1.5 rounded-full bg-foreground/20" />
          <div className="h-1.5 w-1.5 rounded-full bg-foreground/10" />
        </div>
      </WorkspaceHeader>
      <div className="flex-1 min-h-0 overflow-auto p-5 custom-scrollbar">
        <RequestBuilder />
      </div>
    </WorkspacePane>
  );
}

function ResponsePane() {
  const response = usePlaygroundStore((s) => s.response);
  const isLoading = usePlaygroundStore((s) => s.isLoading);

  const status = isLoading ? "LOADING" : response ? `${response.status}` : "READY";

  const dotColor = isLoading
    ? "bg-yellow-500"
    : response
      ? response.status >= 400
        ? "bg-red-500"
        : response.status >= 300
          ? "bg-yellow-500"
          : "bg-green-500"
      : "bg-muted-foreground";

  return (
    <WorkspacePane>
      <WorkspaceHeader title="Response Stream" icon={Activity}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            {status}
          </span>
          <div className={cn("h-2 w-2 rounded-full", dotColor)} />
        </div>
      </WorkspaceHeader>
      <div className="flex-1 min-h-0 overflow-hidden p-5 flex flex-col bg-background/40">
        <ResponseViewer />
      </div>
    </WorkspacePane>
  );
}

function PlaygroundContent() {
  const storeLayout = usePlaygroundStore((s) => s.responseLayout);
  const setResponseLayout = usePlaygroundStore((s) => s.setResponseLayout);
  const [responseLayout, setResponseLayoutLocal] = useState(getPersistedLayout);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"request" | "response">("request");

  useEffect(() => {
    setResponseLayoutLocal(storeLayout);
  }, [storeLayout]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsSmallScreen(event.matches);
    };

    handleChange(mq);
    mq.addEventListener("change", handleChange as (e: MediaQueryListEvent) => void);

    return () => {
      mq.removeEventListener("change", handleChange as (e: MediaQueryListEvent) => void);
    };
  }, []);

  const effectiveOrientation = isSmallScreen ? "vertical" : responseLayout;

  if (isSmallScreen) {
    return (
      <div className="flex flex-col flex-1">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b bg-muted/50">
          <EnvironmentSelector />
          <Separator orientation="vertical" className="h-6" />
          <CodeGenerator />
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          <div className="px-4 mt-3 mb-1 shrink-0">
            <nav className="inline-flex justify-around items-center gap-0.5 rounded-full bg-muted/50 p-0.5 border border-border/50 w-full">
              {[
                { id: "request", label: "Request" },
                { id: "response", label: "Response" },
              ].map((tab) => {
                const isActive = mobileTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMobileTab(tab.id as "request" | "response")}
                    className={cn(
                      "relative flex h-7 flex-1 items-center justify-center px-4 text-[11px] uppercase tracking-wider font-semibold transition-all rounded-full outline-none",
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="mobile-tabs-pill"
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

          {mobileTab === "request" && (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-hidden">
                <RequestPane />
              </div>
            </div>
          )}

          {mobileTab === "response" && (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-hidden">
                <ResponsePane />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 p-3 pt-2 gap-3 min-h-0 overflow-hidden">
      <WorkspacePane className="h-auto flex-row items-center gap-3 px-6 py-2 rounded-2xl shrink-0">
        <div className="flex items-center gap-3">
          <EnvironmentSelector />
          <div className="h-4 w-[1px] bg-border/40 mx-2" />
          <CodeGenerator />
        </div>

        <div className="ml-auto flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              Layout
            </span>
            <div className="flex items-center p-1 bg-muted/50 rounded-lg border border-border">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 w-7 p-0 rounded-md transition-all",
                  responseLayout === "vertical"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground"
                )}
                onClick={() => setResponseLayout("vertical")}
                title="Vertical Layout"
              >
                <PanelTop className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 w-7 p-0 rounded-md transition-all",
                  responseLayout === "horizontal"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground"
                )}
                onClick={() => setResponseLayout("horizontal")}
                title="Horizontal Layout"
              >
                <PanelLeft className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </WorkspacePane>

      <div className="flex-1 min-h-0 flex gap-3">
        <ResizablePanelGroup orientation={effectiveOrientation} className="flex-1 min-h-0 gap-3">
          <ResizablePanel defaultSize={55} minSize={30} className="min-h-0">
            <RequestPane />
          </ResizablePanel>

          <ResizableHandle className="bg-transparent w-1.5 hover:bg-muted/50 transition-colors rounded-full" />

          <ResizablePanel defaultSize={45} minSize={25} className="min-h-0">
            <ResponsePane />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense fallback={null}>
      <PlaygroundContent />
    </Suspense>
  );
}
