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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
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
        {isAnalyzing ? (
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Analyzing
          </div>
        ) : null}
      </div>
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {tab === "collection" ? (
        <>
          {collections.length > 0 ? (
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search collections"
            />
          ) : null}
          <ScrollArea className="h-48 rounded-xl border border-border/50 bg-muted/10">
            {filteredCollections.length > 0 ? (
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
            ) : (
              <div className="flex h-full min-h-40 items-center justify-center px-4 text-sm text-muted-foreground">
                {collections.length > 0 ? "No collections found." : "No collections yet."}
              </div>
            )}
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
          <p className="text-sm font-medium">Drop JSON here</p>
          <p className="mt-1 text-xs text-muted-foreground">Or click to choose a file</p>
        </button>
      )}
    </div>
  );
}
