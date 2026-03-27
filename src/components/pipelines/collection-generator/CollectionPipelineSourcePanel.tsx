"use client";

import { Database, Loader2, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { segmentedTabListClassName, segmentedTabTriggerClassName } from "@/utils/ui/segmentedTabs";
import { cn } from "@/utils";
import type { Collection } from "@/types";

type SourceTab = "collection" | "upload";

interface CollectionPipelineSourcePanelProps {
  collections: Collection[];
  error: string | null;
  isAnalyzing: boolean;
  onAnalyzeCollection: (collectionId: string) => void;
  onAnalyzeUpload: (text: string, fileName?: string) => void;
  selectedCollectionId: string;
  setSelectedCollectionId: (value: string) => void;
}

export function CollectionPipelineSourcePanel({
  collections,
  error,
  isAnalyzing,
  onAnalyzeCollection,
  onAnalyzeUpload,
  selectedCollectionId,
  setSelectedCollectionId,
}: CollectionPipelineSourcePanelProps) {
  const [tab, setTab] = useState<SourceTab>(collections.length > 0 ? "collection" : "upload");
  const [search, setSearch] = useState("");
  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      onAnalyzeUpload(await file.text(), file.name);
    },
    [onAnalyzeUpload],
  );
  const { getInputProps, getRootProps, isDragActive } = useDropzone({
    accept: { "application/json": [".json"] },
    maxFiles: 1,
    multiple: false,
    onDrop,
  });
  const filteredCollections = collections.filter((collection) =>
    `${collection.name} ${collection.description ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const helperText =
    error ??
    (tab === "collection"
      ? "Choose a stored collection to generate the draft instantly."
      : "Upload Postman, OpenAPI, or Luzo JSON to generate a draft.");

  return (
    <div className="grid gap-4 border-b border-border/50 pb-4 lg:grid-cols-[260px_1fr]">
      <div className="space-y-3">
        <div className={segmentedTabListClassName}>
          {(["collection", "upload"] as const).map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setTab(entry)}
              className={segmentedTabTriggerClassName(
                tab === entry,
                "h-8 flex-1 text-xs capitalize",
              )}
            >
              {entry}
            </button>
          ))}
        </div>
        {tab === "collection" ? (
          <>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search collections"
            />
            <ScrollArea className="h-48 rounded-xl border border-border/50 bg-muted/10">
              <div className="p-2">
                {filteredCollections.map((collection) => (
                  <button
                    key={collection.id}
                    type="button"
                    onClick={() => {
                      setSelectedCollectionId(collection.id);
                      onAnalyzeCollection(collection.id);
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                      collection.id === selectedCollectionId
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/40",
                    )}
                  >
                    <Database className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{collection.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {collection.requests.length} requests
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <button
            type="button"
            {...getRootProps()}
            className={cn(
              "flex h-48 w-full flex-col items-center justify-center rounded-xl border border-dashed px-5 text-center transition-colors",
              isDragActive
                ? "border-primary bg-primary/10"
                : "border-border/60 bg-muted/10 hover:bg-muted/20",
            )}
          >
            <input {...getInputProps()} />
            <Upload className="mb-3 h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-medium">Drop Postman or Luzo JSON here</p>
            <p className="mt-1 text-xs text-muted-foreground">Or click to choose a file</p>
          </button>
        )}
      </div>

      <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
        {isAnalyzing ? (
          <div className="flex h-full min-h-40 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="space-y-1 text-center">
              <p>Analyzing collection</p>
              <p className="text-xs">
                Parsing requests, tracing variables, and validating the graph.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold">1. Choose a source</p>
              <p className="text-xs text-muted-foreground">
                Luzo will infer names, dependencies, and runnable order before anything is created.
              </p>
            </div>
            <div
              className={cn(
                "rounded-lg border px-3 py-2 text-sm",
                error
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-border/50 bg-background/70 text-muted-foreground",
              )}
            >
              {helperText}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-border/40 bg-background/70 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Detect
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Links between requests and reused values.
                </p>
              </div>
              <div className="rounded-lg border border-border/40 bg-background/70 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Review
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Edit names, order, and step grouping.
                </p>
              </div>
              <div className="rounded-lg border border-border/40 bg-background/70 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Create
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Open the result directly in the builder.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
