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
  placeholder = "Key",
  suggestions = [],
}: KeyValueEditorProps) {
  const add = () => onChange([...pairs, { key: "", value: "", enabled: true }]);

  const update = (index: number, field: keyof KeyValuePair, value: string | boolean) =>
    onChange(pairs.map((p, i) => (i === index ? { ...p, [field]: value } : p)));

  const remove = (index: number) => onChange(pairs.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      <div className="hidden grid-cols-[auto_minmax(0,0.9fr)_minmax(0,1.1fr)_auto] items-center gap-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:grid">
        <span>On</span>
        <span>{placeholder}</span>
        <span>Value</span>
        <span className="sr-only">Actions</span>
      </div>
      <div className="space-y-2">
        {pairs.map((pair, i) => (
          <div
            key={i}
            className="grid items-center gap-3 rounded-lg border border-border/40 bg-muted/10 p-3 sm:grid-cols-[auto_minmax(0,0.9fr)_minmax(0,1.1fr)_auto]"
          >
            <Switch
              checked={pair.enabled}
              onCheckedChange={(v) => update(i, "enabled", v)}
              className="shrink-0"
            />
            <div className="min-w-0">
              <Input
                value={pair.key}
                onChange={(e) => update(i, "key", e.target.value)}
                placeholder={placeholder}
                className="h-9 w-full border-border/40 bg-background text-sm"
              />
            </div>
            <div className="min-w-0">
              {suggestions.length > 0 ? (
                <TemplateInput
                  value={pair.value}
                  onChange={(v) => update(i, "value", v)}
                  suggestions={suggestions}
                  placeholder="Value"
                  inputClassName="h-9 w-full rounded-md border border-border/40 bg-background px-3 text-sm"
                  className="w-full"
                />
              ) : (
                <Input
                  value={pair.value}
                  onChange={(e) => update(i, "value", e.target.value)}
                  placeholder="Value"
                  className="h-9 w-full border-border/40 bg-background text-sm"
                />
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground hover:bg-background hover:text-foreground"
              onClick={() => remove(i)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 rounded-lg border-border/40 bg-background"
        aria-label="Add key-value row"
        onClick={add}
      >
        <Plus className="h-3.5 w-3.5" />
        Add
      </Button>
    </div>
  );
}
