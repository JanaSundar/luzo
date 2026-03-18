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
    <div className="space-y-4">
      <div className="space-y-2">
        {pairs.map((pair, i) => (
          <div key={i} className="flex items-center gap-2">
            <Switch
              checked={pair.enabled}
              onCheckedChange={(v) => update(i, "enabled", v)}
              className="shrink-0"
            />
            <div className="flex-1 min-w-0">
              <Input
                value={pair.key}
                onChange={(e) => update(i, "key", e.target.value)}
                placeholder={placeholder}
                className="h-8 text-sm w-full"
              />
            </div>
            <div className="flex-1 min-w-0">
              {suggestions.length > 0 ? (
                <TemplateInput
                  value={pair.value}
                  onChange={(v) => update(i, "value", v)}
                  suggestions={suggestions}
                  placeholder="Value"
                  inputClassName="h-8 text-sm border border-input rounded-md bg-background px-3 w-full"
                  className="w-full"
                />
              ) : (
                <Input
                  value={pair.value}
                  onChange={(e) => update(i, "value", e.target.value)}
                  placeholder="Value"
                  className="h-8 text-sm w-full"
                />
              )}
            </div>
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
