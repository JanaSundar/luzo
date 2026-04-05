"use client";

import { FileUp, Plus, Trash2 } from "lucide-react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TemplateInput } from "@/components/ui/template-input";
import { cn } from "@/lib/utils";
import { LIMITS } from "@/lib/utils/security";
import type { FormDataField } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";

interface FormDataBodyEditorProps {
  fields: FormDataField[];
  onChange: (fields: FormDataField[]) => void;
  suggestions?: VariableSuggestion[];
}

export function FormDataBodyEditor({
  fields,
  onChange,
  suggestions = [],
}: FormDataBodyEditorProps) {
  const addField = (type: "text" | "file") =>
    onChange([...fields, { key: "", type, value: "", enabled: true }]);

  const update = (index: number, updates: Partial<FormDataField>) =>
    onChange(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)));

  const remove = (index: number) => onChange(fields.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-lg border-border/40 bg-background"
          onClick={() => addField("text")}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Text
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-lg border-border/40 bg-background"
          onClick={() => addField("file")}
        >
          <Plus className="h-3.5 w-3.5" />
          Add File
        </Button>
      </div>

      <div className="space-y-2">
        {fields.map((field, i) => (
          <div
            key={i}
            className="grid items-center gap-3 rounded-lg border border-border/40 bg-muted/10 p-3 sm:grid-cols-[auto_160px_minmax(0,1fr)_auto]"
          >
            <Switch
              checked={field.enabled}
              onCheckedChange={(v) => update(i, { enabled: v })}
              className="shrink-0"
            />
            <TemplateInput
              value={field.key}
              onChange={(v) => update(i, { key: v })}
              suggestions={suggestions}
              placeholder="Field name"
              inputClassName="h-9 w-full shrink-0 rounded-md border border-border/40 bg-background px-3 text-sm"
            />
            {field.type === "text" ? (
              <TemplateInput
                value={field.value}
                onChange={(v) => update(i, { value: v })}
                suggestions={suggestions}
                placeholder="Value"
                inputClassName="h-9 min-w-0 flex-1 rounded-md border border-border/40 bg-background px-3 text-sm"
              />
            ) : (
              <FileDropzone
                field={field}
                onFileChange={(file) =>
                  update(i, {
                    file,
                    fileName: file?.name,
                  })
                }
              />
            )}
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
    </div>
  );
}

function FileDropzone({
  field,
  onFileChange,
}: {
  field: FormDataField;
  onFileChange: (file: File | undefined) => void;
}) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFileChange(acceptedFiles[0]);
    },
    [onFileChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    multiple: false,
    maxSize: LIMITS.MAX_FILE_SIZE_BYTES,
    onDropRejected: (rejections) => {
      const err = rejections[0]?.errors[0];
      if (err?.code === "file-too-large") {
        const mb = LIMITS.MAX_FILE_SIZE_BYTES / 1024 / 1024;
        toast.error(`File exceeds maximum size of ${mb}MB`);
      }
    },
  });

  const clearFile = () => onFileChange(undefined);

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 transition-colors",
        isDragActive
          ? "border-primary bg-primary/10"
          : "border-muted-foreground/40 hover:border-muted-foreground/60 hover:bg-muted/50",
        field.file && "border-primary/50 bg-primary/5",
      )}
    >
      <input {...getInputProps()} />
      <FileUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      {field.file ? (
        <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
          <span className="truncate text-sm">{field.file.name}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {(field.file.size / 1024).toFixed(1)} KB
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              clearFile();
            }}
          >
            Remove
          </Button>
        </div>
      ) : (
        <span className="truncate text-sm text-muted-foreground">
          {isDragActive ? "Drop here..." : "Drop file or click"}
        </span>
      )}
    </div>
  );
}
