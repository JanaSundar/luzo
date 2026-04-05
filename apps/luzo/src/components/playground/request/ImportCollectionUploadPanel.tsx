"use client";

import { FolderPlus, Upload, X } from "lucide-react";
import type { DropzoneInputProps, DropzoneRootProps } from "react-dropzone";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ImportCollectionUploadPanelProps {
  activeDescription: string;
  collectionName: string;
  getInputProps: <T extends DropzoneInputProps>(props?: T) => T;
  getRootProps: <T extends DropzoneRootProps>(props?: T) => T;
  inputResetKey?: string;
  isDragActive: boolean;
  onCollectionNameChange: (value: string) => void;
  onRemoveFile?: () => void;
  uploadedFileName: string;
}

export function ImportCollectionUploadPanel({
  activeDescription,
  collectionName,
  getInputProps,
  getRootProps,
  inputResetKey,
  isDragActive,
  onCollectionNameChange,
  onRemoveFile,
  uploadedFileName,
}: ImportCollectionUploadPanelProps) {
  return (
    <div className="shrink-0 rounded-xl border border-border/50 bg-muted/10 p-3">
      <div className="flex items-start gap-3">
        <FolderPlus className="mt-0.5 h-4 w-4 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Create collection</p>
          <p className="text-xs text-muted-foreground">{activeDescription}</p>
        </div>
      </div>
      <Input
        value={collectionName}
        onChange={(event) => onCollectionNameChange(event.target.value)}
        placeholder="Optional collection name override"
        className="mt-3"
      />
      <div
        {...getRootProps()}
        className={cn(
          "mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3 py-2 transition-colors",
          isDragActive
            ? "border-primary bg-primary/10"
            : "border-muted-foreground/30 bg-background/60 hover:border-muted-foreground/50 hover:bg-muted/40",
          uploadedFileName && "border-primary/45 bg-primary/5",
        )}
      >
        <input key={inputResetKey} {...getInputProps()} />
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
          <Upload className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {uploadedFileName || (isDragActive ? "Drop JSON file here" : "Upload JSON file")}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {uploadedFileName || "Drop or click to load a Postman or OpenAPI JSON file."}
          </p>
        </div>
        {uploadedFileName && onRemoveFile ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRemoveFile();
            }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            aria-label="Remove uploaded file"
            title="Remove file"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
