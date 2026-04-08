"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TemplateInput } from "@/components/ui/template-input";
import { TemplateTextarea } from "@/components/ui/template-textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FormDataField } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import { FieldLabel, SectionHeading } from "./shared";

const BODY_TYPES = [
  { value: "none", label: "None" },
  { value: "json", label: "JSON" },
  { value: "raw", label: "Raw" },
  { value: "form-data", label: "Form Data" },
  { value: "x-www-form-urlencoded", label: "URL Encoded" },
] as const;

function createFormDataField(): FormDataField {
  return { enabled: true, key: "", type: "text", value: "" };
}

export function BodyEditor({
  body,
  bodyLocked,
  bodyType,
  disabled,
  formDataFields,
  suggestions,
  onChange,
}: {
  body: string | null;
  bodyLocked: boolean;
  bodyType: (typeof BODY_TYPES)[number]["value"];
  disabled: boolean;
  formDataFields: FormDataField[];
  suggestions: VariableSuggestion[];
  onChange: (
    patch: Partial<{ body: string | null; bodyType: string; formDataFields: FormDataField[] }>,
  ) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionHeading
        title="Body"
        description={
          bodyLocked
            ? "GET and HEAD requests usually skip the request body."
            : "Write the request payload directly in the inspector."
        }
      />

      <div className="space-y-2">
        <FieldLabel>Body Type</FieldLabel>
        <Select
          disabled={disabled || bodyLocked}
          value={bodyType}
          onValueChange={(nextBodyType) => {
            if (!nextBodyType) return;
            const resolvedBodyType = nextBodyType as (typeof BODY_TYPES)[number]["value"];
            onChange({
              body: resolvedBodyType === "form-data" ? null : body,
              bodyType: resolvedBodyType,
              formDataFields: resolvedBodyType === "form-data" ? formDataFields : formDataFields,
            });
          }}
        >
          <SelectTrigger className="w-full rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 shadow-none focus-visible:border-foreground/30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            {BODY_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!bodyLocked && bodyType === "form-data" ? (
        <FormDataEditor
          disabled={disabled}
          fields={formDataFields}
          suggestions={suggestions}
          onChange={onChange}
        />
      ) : null}

      {!bodyLocked && bodyType !== "none" && bodyType !== "form-data" ? (
        <div className="space-y-2">
          <FieldLabel htmlFor="request-body-editor">Payload</FieldLabel>
          <TemplateTextarea
            id="request-body-editor"
            disabled={disabled}
            placeholder={
              bodyType === "json"
                ? '{\n  "key": "value"\n}'
                : bodyType === "x-www-form-urlencoded"
                  ? "name=luzo&mode=debug"
                  : "Raw request body"
            }
            suggestions={suggestions}
            textareaClassName="min-h-[220px] rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 font-mono text-sm shadow-none focus-visible:border-foreground/30 focus-visible:bg-transparent"
            value={body ?? ""}
            onChange={(bodyValue) => onChange({ body: bodyValue })}
          />
        </div>
      ) : null}
    </div>
  );
}

function FormDataEditor({
  disabled,
  fields,
  suggestions,
  onChange,
}: {
  disabled: boolean;
  fields: FormDataField[];
  suggestions: VariableSuggestion[];
  onChange: (patch: { formDataFields: FormDataField[] }) => void;
}) {
  const updateField = (index: number, patch: Partial<FormDataField>) => {
    onChange({
      formDataFields: fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field,
      ),
    });
  };

  return (
    <div className="space-y-3">
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">No form-data fields yet.</p>
      ) : null}

      {fields.map((field, index) => (
        <div key={`form-field-${index}`} className="space-y-3 border-b border-border/40 pb-4">
          <div className="grid min-w-0 grid-cols-[20px_minmax(0,1fr)_120px_28px] gap-3">
            <input
              aria-label={`Form field enabled ${index + 1}`}
              checked={field.enabled}
              className="mt-8 h-4 w-4 accent-foreground"
              disabled={disabled}
              type="checkbox"
              onChange={(event) => updateField(index, { enabled: event.target.checked })}
            />

            <div className="space-y-1.5 min-w-0">
              <FieldLabel>Key</FieldLabel>
              <Input
                className="rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent px-0 shadow-none focus-visible:border-border"
                disabled={disabled}
                placeholder="file"
                value={field.key}
                onChange={(event) => updateField(index, { key: event.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <FieldLabel>Type</FieldLabel>
              <Select
                disabled={disabled}
                value={field.type}
                onValueChange={(type) =>
                  updateField(index, {
                    file: undefined,
                    fileName: "",
                    type: type as FormDataField["type"],
                    value: type === "file" ? "" : field.value,
                  })
                }
              >
                <SelectTrigger className="w-full rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent px-0 shadow-none focus-visible:border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="file">File</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              aria-label={`Remove form field ${index + 1}`}
              className="mt-8"
              disabled={disabled}
              size="icon-xs"
              type="button"
              variant="ghost"
              onClick={() =>
                onChange({ formDataFields: fields.filter((_, fieldIndex) => fieldIndex !== index) })
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {field.type === "text" ? (
            <div className="space-y-1.5">
              <FieldLabel>Value</FieldLabel>
              <TemplateInput
                disabled={disabled}
                inputClassName="rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent px-0 shadow-none focus-visible:border-border"
                overlayClassName="px-0"
                placeholder="Field value"
                suggestions={suggestions}
                value={field.value}
                onChange={(value) => updateField(index, { value })}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <FieldLabel>File</FieldLabel>
              <input
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
                disabled={disabled}
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  updateField(index, { file, fileName: file?.name ?? "" });
                }}
              />
              {field.fileName ? (
                <p className="text-xs text-muted-foreground">Selected: {field.fileName}</p>
              ) : null}
            </div>
          )}
        </div>
      ))}

      <Button
        disabled={disabled}
        size="sm"
        type="button"
        variant="ghost"
        onClick={() =>
          onChange({
            formDataFields: [...fields, createFormDataField()],
          })
        }
      >
        <Plus className="h-3.5 w-3.5" />
        Add field
      </Button>
    </div>
  );
}
