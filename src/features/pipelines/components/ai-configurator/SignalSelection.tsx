"use client";

import { AlertCircle, Eye, EyeOff, Info, Lock, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePipelineDebugStore } from "@/stores/usePipelineDebugStore";
import { SignalGroupPanel } from "./SignalSelectionRows";

interface SignalSelectionProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function SignalSelection({ searchQuery, onSearchChange }: SignalSelectionProps) {
  const {
    signalGroups,
    selectedSignals,
    toggleSignal,
    toggleAllSignals,
    showSensitive,
    setShowSensitive,
  } = usePipelineDebugStore();

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (stepId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return signalGroups;
    const q = searchQuery.toLowerCase();
    return signalGroups
      .map((g) => ({
        ...g,
        variables: g.variables.filter(
          (v) => v.path.toLowerCase().includes(q) || v.label.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.variables.length > 0);
  }, [signalGroups, searchQuery]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setExpandedGroups(new Set(filteredGroups.map((group) => group.stepId)));
      return;
    }
    if (signalGroups.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set(signalGroups.slice(0, 2).map((group) => group.stepId)));
    }
  }, [expandedGroups.size, filteredGroups, searchQuery, signalGroups]);

  const selectedCount = selectedSignals.length;
  const totalCount = signalGroups.reduce((sum, g) => sum + g.variables.length, 0);
  const sensitiveCount = signalGroups.reduce(
    (sum, g) => sum + g.variables.filter((v) => v.sensitivity === "high").length,
    0,
  );

  const hasSignals = signalGroups.length > 0;

  return (
    <section className="overflow-hidden rounded-[1.4rem] border border-border/50 bg-background/80 shadow-sm backdrop-blur">
      <div className="border-b border-border/40 bg-muted/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
            Context Signals
          </h3>
          <Info className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Keep only signals that help explain failures, latency, or risk.
        </p>

        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">
            {selectedCount}/{totalCount} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleAllSignals(true)}
              className="font-bold text-primary hover:text-primary/80 transition-colors"
            >
              All
            </button>
            <span className="text-muted-foreground">|</span>
            <button
              type="button"
              onClick={() => toggleAllSignals(false)}
              className="font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              None
            </button>
          </div>
        </div>

        {sensitiveCount > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] text-amber-600">
              <Lock className="h-3 w-3" />
              <span className="font-bold">
                {sensitiveCount} sensitive field{sensitiveCount !== 1 ? "s" : ""} hidden
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowSensitive(!showSensitive)}
              className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              {showSensitive ? (
                <>
                  <EyeOff className="h-3 w-3" /> Hide
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3" /> Reveal
                </>
              )}
            </button>
          </div>
        )}

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by request, label, or path..."
            className="flex h-9 w-full rounded-xl border border-border/50 bg-background pl-9 pr-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="max-h-[550px] overflow-auto custom-scrollbar">
        {!hasSignals ? (
          <div className="p-6 text-center">
            <AlertCircle className="h-6 w-6 mx-auto text-muted-foreground opacity-30 mb-2" />
            <p className="text-xs text-muted-foreground">Run the pipeline to generate signals</p>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <SignalGroupPanel
              key={group.stepId}
              group={group}
              expanded={expandedGroups.has(group.stepId)}
              onToggleExpand={() => toggleGroup(group.stepId)}
              selectedSignals={selectedSignals}
              onToggleSignal={toggleSignal}
              showSensitive={showSensitive}
            />
          ))
        )}
      </div>
    </section>
  );
}
