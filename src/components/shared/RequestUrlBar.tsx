"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TemplateInput } from "@/components/ui/template-input";
import { cn } from "@/lib/utils";
import { HTTP_METHODS, METHOD_COLORS } from "@/lib/utils/http";
import type { HttpMethod } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";

interface RequestUrlBarProps {
  method: HttpMethod;
  url: string;
  suggestions: VariableSuggestion[];
  onMethodChange: (method: HttpMethod) => void;
  onUrlChange: (url: string) => void;
  onSend?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function RequestUrlBar({
  method,
  url,
  suggestions,
  onMethodChange,
  onUrlChange,
  onSend,
  placeholder = "https://api.example.com/v1/...",
  className,
  disabled = false,
}: RequestUrlBarProps) {
  return (
    <div
      className={cn(
        "relative flex min-w-0 items-center gap-0 overflow-visible rounded-lg border border-border/50 bg-background p-1 transition-colors focus-within:border-foreground/20",
        className,
      )}
    >
      <Select
        value={method}
        onValueChange={(v) => onMethodChange(v as HttpMethod)}
        disabled={disabled}
      >
        <SelectTrigger
          type="button"
          aria-label="HTTP Method"
          className="h-10 w-[90px] shrink-0 rounded-md border-0 bg-transparent px-3 font-mono text-[12px] font-semibold tracking-[0.08em] hover:bg-transparent focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent"
        >
          <SelectValue>
            <span className={cn(METHOD_COLORS[method])}>{method}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {HTTP_METHODS.map((m) => (
            <SelectItem key={m} value={m}>
              <span className={cn("font-mono font-bold", METHOD_COLORS[m])}>{m}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="hidden h-6 w-px shrink-0 bg-border/45 sm:block" />

      <div className="min-w-0 flex-1 rounded-md bg-transparent">
        <TemplateInput
          value={url}
          onChange={onUrlChange}
          suggestions={suggestions}
          placeholder={placeholder}
          disabled={disabled}
          className="min-w-0"
          overlayClassName="px-3 text-sm font-medium"
          inputClassName="h-10 border-0 bg-transparent px-3 text-sm font-medium placeholder:text-muted-foreground/70 focus-visible:ring-0"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") onSend?.();
          }}
        />
      </div>
    </div>
  );
}
