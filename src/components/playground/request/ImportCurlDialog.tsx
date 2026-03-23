"use client";

import { Braces, Loader2, WandSparkles } from "lucide-react";
import type { ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { useCollectionMutations } from "@/lib/collections/useCollections";
import { useEnvironmentStore } from "@/lib/stores/useEnvironmentStore";
import { useSettingsStore } from "@/lib/stores/useSettingsStore";
import { importCurlToRequest } from "@/lib/utils/curl-import";
import { segmentedTabListClassName, segmentedTabTriggerClassName } from "@/lib/ui/segmentedTabs";
import { cn } from "@/lib/utils";
import type { ApiRequest } from "@/types";
import {
  getImportPlaceholder,
  importStructuredCollection,
  IMPORT_MODES,
  type ImportMode,
} from "./importCollectionConfig";
export function ImportCurlDialog({
  onImport,
  trigger,
}: {
  onImport: (request: ApiRequest) => void;
  trigger?: ReactElement;
}) {
  const { dbStatus, dbSchemaReady } = useSettingsStore();
  const { saveCollection, saveRequestsBulk } = useCollectionMutations();
  const importEnvironments = useEnvironmentStore((state) => state.importEnvironments);
  const canCreateCollections = dbStatus === "connected" && dbSchemaReady;
  const modes = useMemo(
    () => IMPORT_MODES.filter((mode) => canCreateCollections || mode.id === "curl"),
    [canCreateCollections],
  );
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ImportMode>("curl");
  const [source, setSource] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const activeMode = modes.find((entry) => entry.id === mode) ?? modes[0];
  const resetForm = () => {
    setCollectionName("");
    setSource("");
    setUploadedFileName("");
  };
  const handleModeChange = (nextMode: ImportMode) => {
    setMode(nextMode);
    resetForm();
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
      if (!activeMode || activeMode.id === "curl") {
        onImport(importCurlToRequest(source));
        toast.success("Request imported");
      } else {
        const importKind = activeMode.id as Exclude<ImportMode, "curl">;
        const imported = importStructuredCollection(activeMode.id, source);
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
              source: { kind: importKind, collectionId: id, ref: `${importKind}:${name}` },
            })),
          );
        }
        toast.success(
          imported.environments.length > 0
            ? `${imported.requests.length} requests and ${imported.environments.length} environment${imported.environments.length > 1 ? "s" : ""} imported`
            : `${imported.requests.length} requests imported into a collection`,
        );
      }
      resetForm();
      setOpen(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Unable to import");
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-2 rounded-lg border-border/40 bg-background px-2.5 text-sm font-medium"
            >
              <Braces className="h-3.5 w-3.5" />
              <span>Import</span>
            </Button>
          )
        }
      />
      <DialogContent className="flex max-h-[min(88vh,760px)] flex-col sm:max-w-2xl">
        <DialogHeader className="shrink-0 space-y-3">
          <DialogTitle>Import Request or Collection</DialogTitle>
          <DialogDescription>
            Paste a cURL command, Postman collection JSON, or OpenAPI/Swagger JSON.
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

        {!canCreateCollections ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/5 px-4 py-3 text-xs text-muted-foreground">
            Connect your database to unlock Postman and OpenAPI collection import.
          </div>
        ) : null}

        {activeMode && activeMode.id !== "curl" ? (
          <ImportCollectionUploadPanel
            activeDescription={activeMode.description}
            collectionName={collectionName}
            getInputProps={getInputProps}
            getRootProps={getRootProps}
            isDragActive={isDragActive}
            onCollectionNameChange={setCollectionName}
            uploadedFileName={uploadedFileName}
          />
        ) : null}

        <div className="min-h-0 flex-1 overflow-hidden">
          <Textarea
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder={getImportPlaceholder(activeMode?.id)}
            className={cn(
              "field-sizing-fixed h-full min-h-[240px] max-h-full resize-none overflow-y-auto rounded-xl font-mono text-[13px] leading-6",
            )}
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
                {activeMode?.id === "curl" ? "Importing..." : "Creating..."}
              </>
            ) : (
              <>
                <WandSparkles className="h-4 w-4" />
                {activeMode?.id === "curl" ? "Import request" : "Create collection"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
