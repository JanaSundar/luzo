"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { TemplateInput } from "@/components/ui/template-input";
import type { KeyValuePair } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";

interface KeyValueEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  placeholder?: string;
  suggestions?: VariableSuggestion[];
}

export function KeyValueEditor({
  pairs,
  onChange,
  placeholder = "Parameter",
  suggestions = [],
}: KeyValueEditorProps) {
  const add = () => onChange([...pairs, { key: "", value: "", enabled: true }]);

  const update = (index: number, field: keyof KeyValuePair, value: string | boolean) =>
    onChange(pairs.map((p, i) => (i === index ? { ...p, [field]: value } : p)));

  const remove = (index: number) => onChange(pairs.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col gap-4">
      {/* Table Headers - Matches Image Precisely */}
      <div className="grid grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)_3rem] items-center gap-4 px-2 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
        <span className="text-center" />
        <span>{placeholder}</span>
        <span>Value</span>
        <span className="sr-only">Actions</span>
      </div>

      <div className="flex flex-col gap-2">
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
                <TemplateInput
                  value={pair.value}
                  onChange={(v) => update(i, "value", v)}
                  suggestions={suggestions}
                  placeholder="Value"
                  inputClassName="h-9 w-full border-none bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-transparent"
                  className="w-full"
                />
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

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-lg border-border/40 bg-background/60 px-3 text-xs font-semibold hover:bg-background"
          aria-label="Add key-value row"
          onClick={add}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </div>
  );
}
