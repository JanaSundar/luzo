"use client";

import { FileUp, Plus, Trash2 } from "lucide-react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { LIMITS } from "@/lib/utils/security";
import type { FormDataField } from "@/types";

interface FormDataBodyEditorProps {
  fields: FormDataField[];
  onChange: (fields: FormDataField[]) => void;
}

export function FormDataBodyEditor({ fields, onChange }: FormDataBodyEditorProps) {
  const addField = (type: "text" | "file") =>
    onChange([
      ...fields,
      { key: "", type, value: "", enabled: true, ...(type === "file" ? {} : {}) },
    ]);

  const update = (index: number, updates: Partial<FormDataField>) =>
    onChange(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)));

  const remove = (index: number) => onChange(fields.filter((_, i) => i !== index));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8"
          onClick={() => addField("text")}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Text
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8"
          onClick={() => addField("file")}
        >
          <Plus className="h-3.5 w-3.5" />
          Add File
        </Button>
      </div>

      <div className="space-y-2">
        {fields.map((field, i) => (
          <div
            key={
              field.key || field.fileName || field.file?.name || `${field.type}-${field.value}-${i}`
            }
            className="flex items-center gap-2"
          >
            <Switch
              checked={field.enabled}
              onCheckedChange={(v) => update(i, { enabled: v })}
              className="shrink-0"
            />
            <Input
              value={field.key}
              onChange={(e) => update(i, { key: e.target.value })}
              placeholder="Field name"
              className="h-8 text-sm w-40 shrink-0"
            />
            {field.type === "text" ? (
              <Input
                value={field.value}
                onChange={(e) => update(i, { value: e.target.value })}
                placeholder="Value"
                className="h-8 text-sm flex-1 min-w-0"
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
              className="h-8 w-8 shrink-0"
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
    [onFileChange]
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
        console.warn(`File exceeds maximum size of ${mb}MB`);
      }
    },
  });

  const clearFile = () => onFileChange(undefined);

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex flex-1 items-center gap-2 h-8 min-w-0 rounded-md border border-dashed px-2 cursor-pointer transition-colors",
        isDragActive
          ? "border-primary bg-primary/10"
          : "border-muted-foreground/40 hover:border-muted-foreground/60 hover:bg-muted/50",
        field.file && "border-primary/50 bg-primary/5"
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
