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
        "flex items-center gap-3 p-1.5 bg-muted/20 rounded-xl relative overflow-visible",
        className
      )}
    >
      <Select
        value={method}
        onValueChange={(v) => onMethodChange(v as HttpMethod)}
        disabled={disabled}
      >
        <SelectTrigger
          type="button"
          className="w-[110px] h-9 border-none bg-transparent font-bold shrink-0 focus-visible:ring-0"
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

      <TemplateInput
        value={url}
        onChange={onUrlChange}
        suggestions={suggestions}
        placeholder={placeholder}
        disabled={disabled}
        inputClassName="h-9 border-none bg-transparent text-sm focus-visible:ring-0 px-0 font-medium"
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") onSend?.();
        }}
      />
    </div>
  );
}
