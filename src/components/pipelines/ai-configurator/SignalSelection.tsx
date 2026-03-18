"use client";

import {
  AlertCircle,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Info,
  Lock,
  Search,
  Square,
} from "lucide-react";
import { useMemo, useState } from "react";
import { maskSensitiveValue } from "@/lib/pipeline/sensitivity";
import { usePipelineDebugStore } from "@/lib/stores/usePipelineDebugStore";
import { cn } from "@/lib/utils";
import type { ContextVariable, SignalGroup } from "@/types/pipeline-debug";

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
          (v) => v.path.toLowerCase().includes(q) || v.label.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.variables.length > 0);
  }, [signalGroups, searchQuery]);

  const selectedCount = selectedSignals.length;
  const totalCount = signalGroups.reduce((sum, g) => sum + g.variables.length, 0);
  const sensitiveCount = signalGroups.reduce(
    (sum, g) => sum + g.variables.filter((v) => v.sensitivity === "high").length,
    0
  );

  const hasSignals = signalGroups.length > 0;

  return (
    <div className="bg-background border rounded-xl shadow-sm">
      <div className="p-4 border-b bg-muted/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Context Signals
          </h3>
          <Info className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
        </div>

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
            placeholder="Filter signals..."
            className="flex h-8 w-full rounded-lg border border-input bg-muted/20 pl-9 pr-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
    </div>
  );
}

function SignalGroupPanel({
  group,
  expanded,
  onToggleExpand,
  selectedSignals,
  onToggleSignal,
  showSensitive,
}: {
  group: SignalGroup;
  expanded: boolean;
  onToggleExpand: () => void;
  selectedSignals: string[];
  onToggleSignal: (path: string) => void;
  showSensitive: boolean;
}) {
  const selectedInGroup = group.variables.filter((v) => selectedSignals.includes(v.path)).length;

  return (
    <div className="border-b border-muted/30 last:border-0">
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/10 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
        <span
          className={cn(
            "font-mono text-[10px] font-bold shrink-0",
            group.method === "GET"
              ? "text-emerald-500"
              : group.method === "POST"
                ? "text-blue-500"
                : group.method === "PUT"
                  ? "text-amber-500"
                  : group.method === "DELETE"
                    ? "text-red-500"
                    : "text-foreground"
          )}
        >
          {group.method}
        </span>
        <span className="text-xs font-medium truncate flex-1">{group.stepName}</span>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {selectedInGroup}/{group.variables.length}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-0.5">
          {group.variables.map((variable) => (
            <SignalRow
              key={variable.path}
              variable={variable}
              selected={selectedSignals.includes(variable.path)}
              onToggle={() => onToggleSignal(variable.path)}
              showSensitive={showSensitive}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SignalRow({
  variable,
  selected,
  onToggle,
  showSensitive,
}: {
  variable: ContextVariable;
  selected: boolean;
  onToggle: () => void;
  showSensitive: boolean;
}) {
  const isHidden = variable.sensitivity === "high" && !showSensitive;

  const displayValue = useMemo(() => {
    if (variable.value == null) return "null";
    if (variable.sensitivity === "high" && !showSensitive) {
      return maskSensitiveValue(String(variable.value));
    }
    const str =
      typeof variable.value === "object" ? JSON.stringify(variable.value) : String(variable.value);
    return str.length > 50 ? `${str.slice(0, 50)}…` : str;
  }, [variable.value, variable.sensitivity, showSensitive]);

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isHidden}
      className={cn(
        "w-full flex items-start gap-2 p-2 rounded-md text-left transition-all",
        selected ? "bg-primary/5" : "hover:bg-muted/20",
        isHidden && "opacity-50 cursor-not-allowed"
      )}
    >
      {selected ? (
        <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
      ) : (
        <Square className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium truncate">{variable.label}</span>
          {variable.sensitivity === "high" && (
            <Lock className="h-2.5 w-2.5 text-amber-500 shrink-0" />
          )}
        </div>
        <span className="text-[10px] font-mono text-muted-foreground truncate block">
          {isHidden ? "🔒 Sensitive data hidden" : displayValue}
        </span>
      </div>
    </button>
  );
}
