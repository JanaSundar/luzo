"use client";

import { Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCollectionMutations } from "@/lib/collections/useCollections";
import { cn } from "@/lib/utils";
import { METHOD_BG_COLORS } from "@/lib/utils/http";
import type { Collection } from "@/types";

interface CollectionsRequestsSectionProps {
  activeCollection: Collection | null;
  requests: Collection["requests"];
  onOpenRequest: (request: Collection["requests"][number]["request"]) => void;
}

export function CollectionsRequestsSection({
  activeCollection,
  requests,
  onOpenRequest,
}: CollectionsRequestsSectionProps) {
  const { deleteRequest } = useCollectionMutations();

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Collection Requests</h2>
          <p className="text-xs text-muted-foreground">
            Editable requests stored in your connected database
          </p>
        </div>
        <span className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {requests.length} saved
        </span>
      </div>
      {activeCollection ? (
        <div className="space-y-3">
          {requests.map((savedRequest) => (
            <div
              key={savedRequest.id}
              className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={cn(
                        "font-mono text-[10px] font-semibold",
                        METHOD_BG_COLORS[savedRequest.request.method]
                      )}
                    >
                      {savedRequest.request.method}
                    </Badge>
                    <p className="font-medium">{savedRequest.name}</p>
                  </div>
                  <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                    {savedRequest.request.url}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-widest text-muted-foreground/80">
                    Updated {new Date(savedRequest.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => onOpenRequest(savedRequest.request)}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Open
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-2 text-destructive"
                    onClick={async () => {
                      await deleteRequest.mutateAsync(savedRequest.id);
                      toast.success("Request removed");
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {requests.length === 0 && (
            <EmptyNotice text="This collection does not have any saved requests yet." />
          )}
        </div>
      ) : (
        <EmptyNotice text="Select a collection to view its saved requests." />
      )}
    </section>
  );
}

function EmptyNotice({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-6 text-sm text-muted-foreground">
      {text}
    </p>
  );
}
