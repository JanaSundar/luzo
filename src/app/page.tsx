"use client";

import { Activity, ChevronRight, PanelLeft, PanelTop, Terminal, Wand2 } from "lucide-react";
import { motion } from "motion/react";
import { Suspense, useEffect, useState } from "react";
import { AutomationPanel } from "@/components/playground/AutomationPanel";
import { CodeGenerator } from "@/components/playground/CodeGenerator";
import { EnvironmentSelector } from "@/components/playground/EnvironmentSelector";
import { RequestBuilder } from "@/components/playground/RequestBuilder";
import { ResponseViewer } from "@/components/playground/ResponseViewer";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";
import { getPersistedLayout, usePlaygroundStore } from "@/lib/stores/usePlaygroundStore";
import { cn } from "@/lib/utils";

function RequestPane() {
  return (
    <div className="h-full flex flex-col min-h-0 glass border-0 rounded-xl overflow-hidden shadow-premium transition-all duration-300">
      <div className="px-5 py-3 border-b border-border/40 bg-muted/50 flex items-center justify-between shrink-0">
        <div className="flex items-center">
          <Terminal className="h-3.5 w-3.5 mr-2.5 opacity-70" />
          <span className="text-[11px] font-bold uppercase tracking-widest opacity-80">
            Request Pipeline
          </span>
        </div>
        <div className="flex items-center gap-1.5 opacity-50">
          <div className="h-1.5 w-1.5 rounded-full bg-foreground/20" />
          <div className="h-1.5 w-1.5 rounded-full bg-foreground/10" />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-5 custom-scrollbar">
        <RequestBuilder />
      </div>
    </div>
  );
}

function ResponsePane() {
  return (
    <div className="h-full flex flex-col min-h-0 glass border-0 rounded-xl overflow-hidden shadow-premium transition-all duration-300">
      <div className="px-5 py-3 border-b border-border/40 bg-muted/50 flex items-center justify-between shrink-0">
        <div className="flex items-center">
          <Activity className="h-3.5 w-3.5 mr-2.5 opacity-70" />
          <span className="text-[11px] font-bold uppercase tracking-widest opacity-80">
            Response Stream
          </span>
        </div>
        <div className="h-4 w-[1px] bg-border/40 mx-2" />
        <span className="text-[10px] text-muted-foreground font-mono">IDLE</span>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden p-5 flex flex-col bg-background/40">
        <ResponseViewer />
      </div>
    </div>
  );
}

function PlaygroundContent() {
  const storeLayout = usePlaygroundStore((s) => s.responseLayout);
  const setResponseLayout = usePlaygroundStore((s) => s.setResponseLayout);
  // Use persisted value on first paint to avoid vertical→horizontal flicker on reload
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
  const [showAutomation, setShowAutomation] = useState(false);

  // Optimized, easy-to-scan layout for mobile/tablet using tabs (no duplicated pane code)
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

  // Desktop layout with resizable panes
  return (
    <div className="flex flex-col flex-1 p-3 gap-3">
      <div className="flex items-center gap-3 px-6 py-2 glass rounded-2xl border-0 shadow-premium">
        <div className="flex items-center gap-3">
          <EnvironmentSelector />
          <div className="h-4 w-[1px] bg-border/40 mx-2" />
          <CodeGenerator />
        </div>

        <div className="ml-auto flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
              Layout
            </span>
            <div className="flex items-center p-1 bg-muted/50 rounded-lg border border-border/40">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 w-7 p-0 rounded-md transition-all",
                  responseLayout === "vertical"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground opacity-50"
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
                    : "text-muted-foreground opacity-50"
                )}
                onClick={() => setResponseLayout("horizontal")}
                title="Horizontal Layout"
              >
                <PanelLeft className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-border/40" />

          <div className="flex items-center gap-2 group cursor-help transition-opacity hover:opacity-100 opacity-60">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Automation Ready
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-3">
        {/* Main Workspace */}
        <ResizablePanelGroup orientation={effectiveOrientation} className="flex-1 min-h-0 gap-3">
          <ResizablePanel defaultSize={55} minSize={30} className="min-h-0">
            <RequestPane />
          </ResizablePanel>

          <ResizableHandle className="bg-transparent w-1.5 hover:bg-muted/50 transition-colors rounded-full" />

          <ResizablePanel defaultSize={45} minSize={25} className="min-h-0">
            <ResponsePane />
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* AI QA Automation Prep: Sidebar */}
        {!isSmallScreen && (
          <div
            className={cn(
              "h-full glass border-0 rounded-2xl flex transition-all duration-500 shadow-premium overflow-hidden shrink-0",
              showAutomation ? "w-80 opacity-100" : "w-12 opacity-80"
            )}
            style={{ flexBasis: showAutomation ? "320px" : "48px" }}
          >
            {showAutomation ? (
              <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 h-8 w-8 rounded-full z-20 hover:bg-muted/50"
                  onClick={() => setShowAutomation(false)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <AutomationPanel />
              </div>
            ) : (
              <div className="w-12 h-full flex flex-col items-center py-4 gap-6 opacity-40 hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-muted/50"
                  onClick={() => setShowAutomation(true)}
                  title="Open Automation"
                >
                  <Wand2 className="h-4 w-4 text-primary" />
                </Button>
                <div className="flex-1 w-[1px] bg-border/40" />
                <div className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-30 select-none">
                  Automation
                </div>
              </div>
            )}
          </div>
        )}
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
