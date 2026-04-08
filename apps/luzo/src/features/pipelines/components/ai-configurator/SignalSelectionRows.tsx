"use client";

import { CheckSquare, ChevronDown, ChevronRight, Lock, Square } from "lucide-react";
import { useMemo } from "react";
import { maskSensitiveValue } from "@/features/pipeline/sensitivity";
import { cn } from "@/utils";
import type { ContextVariable, SignalGroup } from "@/types/pipeline-debug";

export function SignalGroupPanel({
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
    <div className="border-b border-border/35 last:border-0">
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/10"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <span
          className={cn(
            "shrink-0 font-mono text-[10px] font-bold",
            group.method === "GET"
              ? "text-emerald-500"
              : group.method === "POST"
                ? "text-blue-500"
                : group.method === "PUT"
                  ? "text-amber-500"
                  : group.method === "DELETE"
                    ? "text-red-500"
                    : "text-foreground",
          )}
        >
          {group.method}
        </span>
        <span className="flex-1 truncate text-xs font-medium">{group.stepName}</span>
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {selectedInGroup}/{group.variables.length}
        </span>
      </button>

      {expanded ? (
        <div className="space-y-1 px-3 pb-3">
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
      ) : null}
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
    return str.length > 50 ? `${str.slice(0, 50)}...` : str;
  }, [showSensitive, variable.sensitivity, variable.value]);

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isHidden}
      className={cn(
        "flex w-full items-start gap-2 rounded-xl p-2.5 text-left transition-colors",
        selected ? "bg-foreground/[0.04]" : "hover:bg-muted/20",
        isHidden && "cursor-not-allowed opacity-50",
      )}
    >
      {selected ? (
        <CheckSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      ) : (
        <Square className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[11px] font-medium">{variable.label}</span>
          {variable.sensitivity === "high" ? (
            <Lock className="h-2.5 w-2.5 shrink-0 text-amber-500" />
          ) : null}
        </div>
        <span className="block truncate font-mono text-[10px] text-muted-foreground">
          {isHidden ? "Sensitive data hidden" : displayValue}
        </span>
      </div>
    </button>
  );
}
