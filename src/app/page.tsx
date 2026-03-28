"use client";

import { Activity, PanelLeft, PanelTop, Terminal } from "lucide-react";
import { AnimatePresence } from "motion/react";
import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { CodeGenerator } from "@/components/playground/CodeGenerator";
import { EnvironmentSelector } from "@/components/playground/EnvironmentSelector";
import { PlaygroundSidebar } from "@/components/playground/PlaygroundSidebar";
import { RequestBuilder } from "@/components/playground/RequestBuilder";
import { ResponseViewer } from "@/components/playground/ResponseViewer";
import { AnimatedTabContent } from "@/components/ui/animated-tab-content";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { WorkspaceHeader } from "@/components/ui/workspace-header";
import { WorkspacePane } from "@/components/ui/workspace-pane";
import { useExecutionStore } from "@/stores/useExecutionStore";
import { usePlaygroundStore } from "@/stores/usePlaygroundStore";
import { segmentedTabListClassName, segmentedTabTriggerClassName } from "@/utils/ui/segmentedTabs";
import { cn } from "@/utils";

function RequestPane() {
  return (
    <WorkspacePane className="overflow-hidden rounded-[1.5rem] border border-border/45 bg-background/80 shadow-sm backdrop-blur">
      <WorkspaceHeader
        title="Request Pipeline"
        icon={Terminal}
        className="border-border/40 bg-transparent px-5 py-3"
      >
        <div className="flex items-center gap-1.5 opacity-50">
          <div className="h-1.5 w-1.5 rounded-full bg-foreground/20" />
          <div className="h-1.5 w-1.5 rounded-full bg-foreground/10" />
        </div>
      </WorkspaceHeader>
      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-4 pb-5">
        <RequestBuilder />
      </div>
    </WorkspacePane>
  );
}

function ResponsePane() {
  const response = useExecutionStore((s) => s.activeRawResponse);
  const isLoading = useExecutionStore((s) => s.isLoading);

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
    <WorkspacePane className="overflow-hidden rounded-[1.5rem] border border-border/45 bg-background/80 shadow-sm backdrop-blur">
      <WorkspaceHeader
        title="Response Stream"
        icon={Activity}
        className="border-border/40 bg-transparent px-5 py-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            {status}
          </span>
          <div className={cn("h-2 w-2 rounded-full", dotColor)} />
        </div>
      </WorkspaceHeader>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-4 pb-5">
        <ResponseViewer />
      </div>
    </WorkspacePane>
  );
}

function PlaygroundContent() {
  const storeLayout = usePlaygroundStore((s) => s.responseLayout);
  const setResponseLayout = usePlaygroundStore((s) => s.setResponseLayout);
  const [responseLayout, setResponseLayoutLocal] = useState<"horizontal" | "vertical">(
    "horizontal",
  );
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
            <nav
              className={cn(
                "inline-flex w-full items-stretch justify-around",
                segmentedTabListClassName,
              )}
            >
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
                    className={segmentedTabTriggerClassName(
                      isActive,
                      "h-8 flex-1 items-center justify-center px-4",
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <AnimatePresence mode="wait">
            {mobileTab === "request" && (
              <AnimatedTabContent
                key="request"
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <RequestPane />
                </div>
              </AnimatedTabContent>
            )}

            {mobileTab === "response" && (
              <AnimatedTabContent
                key="response"
                className="flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <ResponsePane />
                </div>
              </AnimatedTabContent>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider open onOpenChange={() => {}}>
      <div className="flex h-full min-h-0 w-full overflow-hidden bg-background/70">
        <PlaygroundSidebar />

        <SidebarInset className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-transparent p-3 pt-2">
          <WorkspacePane className="h-auto shrink-0 flex-row items-center gap-3 rounded-[1.8rem] border border-border/40 bg-background/60 px-5 py-2.5 shadow-[0_2px_20px_-10px_rgba(0,0,0,0.1)] backdrop-blur-xl transition-all duration-300 dark:bg-background/40">
            <div className="flex items-center gap-3">
              <EnvironmentSelector />
            </div>

            <div className="ml-auto flex items-center">
              <CodeGenerator />

              <div className="h-4 w-[1px] bg-border/30 mx-1" />

              <div className="flex items-center gap-2.5 rounded-2xl bg-muted/30 p-1 border border-border/40">
                <span className="pl-2.5 text-[10px] text-muted-foreground/60 font-bold uppercase tracking-[0.15em] select-none">
                  Layout
                </span>
                <div className="flex items-center rounded-xl bg-background/40 p-0.5 shadow-inner">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className={cn(
                      "h-7 w-7 rounded-lg transition-all duration-300",
                      responseLayout === "vertical"
                        ? "bg-background shadow-md text-foreground scale-[1.05]"
                        : "text-muted-foreground opacity-50 hover:opacity-100",
                    )}
                    onClick={() => setResponseLayout("vertical")}
                    title="Vertical Layout"
                  >
                    <PanelTop className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className={cn(
                      "h-7 w-7 rounded-lg transition-all duration-300",
                      responseLayout === "horizontal"
                        ? "bg-background shadow-md text-foreground scale-[1.05]"
                        : "text-muted-foreground opacity-50 hover:opacity-100",
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

          <div className="flex min-h-0 flex-1 gap-3">
            <ResizablePanelGroup
              orientation={effectiveOrientation}
              className="flex-1 min-h-0 gap-3"
            >
              <ResizablePanel defaultSize={50} minSize={30} className="min-h-0">
                <RequestPane />
              </ResizablePanel>

              <ResizableHandle className="w-1.5 rounded-full bg-transparent transition-colors hover:bg-muted/60" />

              <ResizablePanel defaultSize={50} minSize={25} className="min-h-0">
                <ResponsePane />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function PlaygroundPage() {
  return (
    <Suspense fallback={null}>
      <PlaygroundContent />
    </Suspense>
  );
}

export default dynamic(async () => PlaygroundPage, {
  ssr: false,
});
