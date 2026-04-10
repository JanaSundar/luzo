"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { KeyValuePair } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import { TemplateInput } from "@/components/ui/template-input";
import { FieldLabel, SectionHeading } from "./shared";

function createKeyValuePair(): KeyValuePair {
  return { enabled: true, key: "", value: "" };
}

export function KeyValueListEditor({
  addLabel,
  disabled,
  emptyText,
  items,
  keyPlaceholder,
  suggestions,
  title,
  valuePlaceholder,
  onChange,
}: {
  addLabel: string;
  disabled: boolean;
  emptyText: string;
  items: KeyValuePair[];
  keyPlaceholder: string;
  suggestions: VariableSuggestion[];
  title: string;
  valuePlaceholder: string;
  onChange: (items: KeyValuePair[]) => void;
}) {
  const updateItem = (index: number, patch: Partial<KeyValuePair>) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  return (
    <div className="space-y-4">
      <SectionHeading title={title} description="Keep request metadata lightweight and readable." />

      <div className="space-y-3">
        {items.length === 0 ? <p className="text-sm text-muted-foreground">{emptyText}</p> : null}

        {items.map((item, index) => (
          <div
            key={`${title}-${index}`}
            className="grid min-w-0 grid-cols-[20px_minmax(0,1fr)_28px] gap-3 border-b border-border/40 pb-3"
          >
            <input
              aria-label={`${title} enabled ${index + 1}`}
              checked={item.enabled}
              className="mt-8 h-4 w-4 accent-foreground"
              disabled={disabled}
              type="checkbox"
              onChange={(event) => updateItem(index, { enabled: event.target.checked })}
            />

            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 min-w-0">
                <FieldLabel>Key</FieldLabel>
                <Input
                  className="rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent px-0 shadow-none focus-visible:border-border"
                  disabled={disabled}
                  placeholder={keyPlaceholder}
                  value={item.key}
                  onChange={(event) => updateItem(index, { key: event.target.value })}
                />
              </div>
              <div className="space-y-1.5 min-w-0">
                <FieldLabel>Value</FieldLabel>
                <TemplateInput
                  disabled={disabled}
                  inputClassName="rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent px-0 shadow-none focus-visible:border-border"
                  overlayClassName="px-0"
                  placeholder={valuePlaceholder}
                  suggestions={suggestions}
                  value={item.value}
                  onChange={(value) => updateItem(index, { value })}
                />
              </div>
            </div>

            <Button
              aria-label={`Remove ${title} ${index + 1}`}
              className="mt-8"
              disabled={disabled}
              size="icon-xs"
              type="button"
              variant="ghost"
              onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        disabled={disabled}
        size="sm"
        type="button"
        variant="ghost"
        onClick={() => onChange([...items, createKeyValuePair()])}
      >
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}
