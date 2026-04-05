"use client";

import { Braces, FolderPlus, Loader2 } from "lucide-react";
import type { ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { JsonBodyEditor } from "@/components/playground/JsonBodyEditor";
import { ImportCollectionUploadPanel } from "@/components/playground/request/ImportCollectionUploadPanel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCollectionMutations } from "@/lib/collections/useCollections";
import { useEnvironmentStore } from "@/lib/stores/useEnvironmentStore";
import { segmentedTabListClassName, segmentedTabTriggerClassName } from "@/lib/ui/segmentedTabs";
import { cn } from "@/lib/utils";
import {
  getImportPlaceholder,
  importStructuredCollection,
  IMPORT_MODES,
  type ImportMode,
} from "@/components/playground/request/importCollectionConfig";

type StructuredImportMode = Exclude<ImportMode, "curl">;
const DEFAULT_IMPORT_MODE = {
  id: "postman",
  label: "Postman",
  description: "Create a DB-backed collection from JSON.",
} as const;

interface ImportCollectionDialogProps {
  onImported?: (collectionId: string) => void;
  trigger?: ReactElement;
}

export function ImportCollectionDialog({ onImported, trigger }: ImportCollectionDialogProps) {
  const { saveCollection, saveRequestsBulk } = useCollectionMutations();
  const importEnvironments = useEnvironmentStore((state) => state.importEnvironments);
  const modes = useMemo(
    () =>
      IMPORT_MODES.filter(
        (mode): mode is (typeof IMPORT_MODES)[number] & { id: StructuredImportMode } =>
          mode.id !== "curl",
      ),
    [],
  );
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<StructuredImportMode>("postman");
  const [source, setSource] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [fileInputResetKey, setFileInputResetKey] = useState(0);

  const activeMode = modes.find((entry) => entry.id === mode) ?? modes[0] ?? DEFAULT_IMPORT_MODE;

  const resetForm = () => {
    setCollectionName("");
    setSource("");
    setUploadedFileName("");
    setFileInputResetKey((current) => current + 1);
    setMode("postman");
  };

  const clearUploadedFile = () => {
    setUploadedFileName("");
    setSource("");
    setFileInputResetKey((current) => current + 1);
  };

  const handleModeChange = (nextMode: StructuredImportMode) => {
    setMode(nextMode);
    clearUploadedFile();
  };

  const handleFileUpload = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      try {
        const text = await file.text();
        setSource(text);
        setUploadedFileName(file.name);
        if (!collectionName.trim()) {
          setCollectionName(
            file.name
              .replace(/\.json$/i, "")
              .replace(/[._-]+/g, " ")
              .trim(),
          );
        }
      } catch {
        toast.error("Unable to read that JSON file");
      }
    },
    [collectionName],
  );

  const { getInputProps, getRootProps, isDragActive } = useDropzone({
    accept: { "application/json": [".json"] },
    maxFiles: 1,
    multiple: false,
    noClick: false,
    onDrop: (acceptedFiles) => {
      void handleFileUpload(acceptedFiles[0]);
    },
    onDropRejected: () => {
      toast.error("Upload a valid JSON file");
    },
  });

  const handleImport = async () => {
    try {
      const imported = importStructuredCollection(mode, source);
      const id = crypto.randomUUID();
      const name = collectionName.trim() || imported.name;

      await saveCollection.mutateAsync({
        id,
        name,
        description: imported.description,
      });

      await saveRequestsBulk.mutateAsync({
        collectionId: id,
        requests: imported.requests.map((entry) => ({
          id: crypto.randomUUID(),
          collectionId: id,
          name: entry.name,
          request: entry.request,
        })),
      });

      if (imported.environments.length > 0) {
        importEnvironments(
          imported.environments.map((environment) => ({
            ...environment,
            source: { kind: mode, collectionId: id, ref: `${mode}:${name}` },
          })),
        );
      }

      toast.success(
        imported.environments.length > 0
          ? `${imported.requests.length} requests and ${imported.environments.length} environment${imported.environments.length > 1 ? "s" : ""} imported`
          : `${imported.requests.length} requests imported into a collection`,
      );

      onImported?.(id);
      resetForm();
      setOpen(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Unable to import");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogTrigger
        render={
          trigger ?? (
            <Button type="button" size="icon" variant="outline" className="h-8 w-8">
              <Braces className="h-4 w-4" />
            </Button>
          )
        }
      />
      <DialogContent className="flex h-[min(88dvh,760px)] flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader className="shrink-0 space-y-3">
          <DialogTitle>Import Collection</DialogTitle>
          <DialogDescription>
            Import a Postman collection or OpenAPI/Swagger JSON into collections.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-[36px] shrink-0 items-center">
          <div
            role="tablist"
            className={cn("min-w-0 max-w-full overflow-x-auto", segmentedTabListClassName)}
          >
            {modes.map((entry) => {
              const active = mode === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleModeChange(entry.id)}
                  className={segmentedTabTriggerClassName(
                    active,
                    "h-8 shrink-0 whitespace-nowrap text-xs",
                  )}
                >
                  {entry.label}
                </button>
              );
            })}
          </div>
        </div>

        <ImportCollectionUploadPanel
          activeDescription={activeMode.description}
          collectionName={collectionName}
          getInputProps={getInputProps}
          getRootProps={getRootProps}
          inputResetKey={`${mode}-${fileInputResetKey}`}
          isDragActive={isDragActive}
          onCollectionNameChange={setCollectionName}
          onRemoveFile={clearUploadedFile}
          uploadedFileName={uploadedFileName}
        />

        <div className="min-h-[320px] flex-1 overflow-hidden">
          <JsonBodyEditor
            value={source}
            onChange={setSource}
            placeholder={getImportPlaceholder(mode)}
            className="h-full min-h-0"
          />
        </div>

        <DialogFooter className="shrink-0">
          <DialogClose
            render={
              <Button type="button" variant="outline">
                Cancel
              </Button>
            }
          />
          <Button
            type="button"
            className="gap-2"
            onClick={() => void handleImport()}
            disabled={saveCollection.isPending || saveRequestsBulk.isPending || !source.trim()}
          >
            {saveCollection.isPending || saveRequestsBulk.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FolderPlus className="h-4 w-4" />
                Create collection
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
