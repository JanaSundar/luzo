"use client";

import { FormDataBodyEditor } from "@/components/playground/FormDataBodyEditor";
import { JsonBodyEditor } from "@/components/playground/JsonBodyEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApiRequest, FormDataField } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";

interface RequestBodyPanelProps {
  body: string | null;
  bodyType: ApiRequest["bodyType"];
  formDataFields?: FormDataField[];
  suggestions?: VariableSuggestion[];
  onChange: (partial: {
    body?: string | null;
    bodyType?: ApiRequest["bodyType"];
    formDataFields?: FormDataField[];
  }) => void;
}

export function RequestBodyPanel({
  body,
  bodyType,
  formDataFields,
  suggestions = [],
  onChange,
}: RequestBodyPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 items-center gap-3 rounded-lg border border-border/40 bg-muted/10 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Body
        </span>
        <Select
          value={bodyType}
          onValueChange={(v) => {
            const newType = v as ApiRequest["bodyType"];
            onChange({
              bodyType: newType,
              body: newType === "form-data" ? null : body,
              formDataFields:
                newType === "form-data" && !formDataFields?.length ? [] : formDataFields,
            });
          }}
        >
          <SelectTrigger className="h-8 w-40 border-border/40 bg-background text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="raw">Raw</SelectItem>
            <SelectItem value="form-data">Form Data</SelectItem>
            <SelectItem value="x-www-form-urlencoded">URL Encoded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {bodyType === "form-data" && (
        <FormDataBodyEditor
          fields={formDataFields ?? []}
          onChange={(updated) => onChange({ formDataFields: updated })}
          suggestions={suggestions}
        />
      )}

      {bodyType !== "none" && bodyType !== "form-data" && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="mb-2 shrink-0 text-[11px] font-medium text-muted-foreground">
            {bodyType === "json" ? "JSON body" : "Raw body"}
          </div>
          <JsonBodyEditor
            value={body ?? ""}
            onChange={(val) => onChange({ body: val })}
            suggestions={suggestions}
            placeholder={bodyType === "json" ? '{\n  "key": "value"\n}' : "Request body..."}
            className="h-full"
            mode={bodyType === "json" ? "json" : "text"}
          />
        </div>
      )}
    </div>
  );
}
