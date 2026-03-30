"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { TemplateInput } from "@/components/ui/template-input";
import { LineageFieldSummary } from "@/features/request-editor/components/LineageFieldSummary";
import type { KeyValuePair } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import type { VariableReferenceEdge } from "@/types/worker-results";

interface KeyValueEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  placeholder?: string;
  suggestions?: VariableSuggestion[];
  fieldNamespace?: string;
  lineageByField?: Record<string, VariableReferenceEdge[]>;
}

export function KeyValueEditor({
  pairs: incomingPairs,
  onChange,
  placeholder = "Parameter",
  suggestions = [],
  fieldNamespace,
  lineageByField = {},
}: KeyValueEditorProps) {
  const pairs =
    incomingPairs.length === 0 ? [{ key: "", value: "", enabled: true }] : incomingPairs;

  const update = (index: number, field: keyof KeyValuePair, value: string | boolean) => {
    let updatedPairs = pairs.map((p, i) => (i === index ? { ...p, [field]: value } : p));

    if (index === pairs.length - 1 && typeof value === "string" && value.trim() !== "") {
      updatedPairs.push({ key: "", value: "", enabled: true });
    }

    if (updatedPairs.length >= 2) {
      const last = updatedPairs[updatedPairs.length - 1];
      const secondLast = updatedPairs[updatedPairs.length - 2];
      const isLastEmpty = last.key.trim() === "" && last.value.trim() === "";
      const isSecondLastEmpty = secondLast.key.trim() === "" && secondLast.value.trim() === "";

      if (isLastEmpty && isSecondLastEmpty) {
        updatedPairs.pop();
      }
    }

    onChange(updatedPairs);
  };

  const remove = (index: number) => {
    const next = pairs.filter((_, i) => i !== index);
    onChange(next.length === 0 ? [{ key: "", value: "", enabled: true }] : next);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      {/* Table Headers - Matches Image Precisely */}
      <div className="grid grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)_3rem] items-center gap-4 px-2 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
        <span className="text-center" />
        <span>{placeholder}</span>
        <span>Value</span>
        <span className="sr-only">Actions</span>
      </div>

      <div className="custom-scrollbar flex flex-1 flex-col gap-2 overflow-y-auto px-1">
        {pairs.map((pair, i) => (
          <div
            key={i}
            className="group grid items-center gap-4 rounded-xl border border-border/30 bg-background/40 p-2.5 transition-all hover:border-border/60 hover:bg-background/80 sm:grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)_3rem]"
          >
            <div className="flex justify-center">
              <Switch
                checked={pair.enabled}
                onCheckedChange={(v) => update(i, "enabled", v)}
                className="scale-90"
              />
            </div>
            <div className="min-w-0">
              <Input
                value={pair.key}
                onChange={(e) => update(i, "key", e.target.value)}
                placeholder={placeholder}
                className="h-9 w-full border-none bg-transparent text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-transparent px-0"
              />
            </div>
            <div className="min-w-0">
              {suggestions.length > 0 ? (
                <div className="min-w-0">
                  <TemplateInput
                    value={pair.value}
                    onChange={(v) => update(i, "value", v)}
                    suggestions={suggestions}
                    placeholder="Value"
                    inputClassName="h-9 w-full border-none bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-transparent"
                    className="w-full"
                  />
                  <LineageFieldSummary
                    incoming={
                      fieldNamespace && pair.key.trim()
                        ? (lineageByField[`${fieldNamespace}.${pair.key.trim()}`] ?? [])
                        : []
                    }
                  />
                </div>
              ) : (
                <Input
                  value={pair.value}
                  onChange={(e) => update(i, "value", e.target.value)}
                  placeholder="Value"
                  className="h-9 w-full border-none bg-transparent text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-transparent px-0"
                />
              )}
            </div>
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => remove(i)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
