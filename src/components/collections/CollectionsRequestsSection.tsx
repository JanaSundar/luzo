"use client";

import { Loader2, Play, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { useCollectionMutations } from "@/lib/collections/useCollections";
import { ACTION_BUTTON_CLASSES, cn } from "@/lib/utils";
import { METHOD_BG_COLORS } from "@/lib/utils/http";
import {
  isStrippedRequestNameEqualToUrl,
  stripMethodPrefixFromRequestName,
} from "@/lib/utils/requestDisplayName";
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [skipDeleteConfirm, setSkipDeleteConfirm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  return (
    <section className="space-y-3">
      {activeCollection ? (
        <div className="space-y-3">
          {requests.map((savedRequest) => {
            const title = stripMethodPrefixFromRequestName(
              savedRequest.name,
              savedRequest.request.method,
            );
            const hideUrlLine = isStrippedRequestNameEqualToUrl(
              savedRequest.name,
              savedRequest.request.method,
              savedRequest.request.url,
            );
            return (
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
                          METHOD_BG_COLORS[savedRequest.request.method],
                        )}
                      >
                        {savedRequest.request.method}
                      </Badge>
                      <p className="font-medium break-all">{title}</p>
                    </div>
                    {!hideUrlLine && (
                      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                        {savedRequest.request.url}
                      </p>
                    )}
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
                      className={ACTION_BUTTON_CLASSES}
                      disabled={deleteRequest.isPending}
                      onClick={() => {
                        setPendingDelete({ id: savedRequest.id, name: savedRequest.name });
                        setShowDeleteDialog(true);
                      }}
                    >
                      {deleteRequest.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      {deleteRequest.isPending ? "..." : "Delete"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          {requests.length === 0 && (
            <EmptyNotice text="This collection does not have any saved requests yet." />
          )}
        </div>
      ) : (
        <EmptyNotice text="Select a collection to view its saved requests." />
      )}

      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Request"
        itemName={pendingDelete?.name}
        skipConfirmTemp={skipDeleteConfirm}
        onSkipConfirmChange={setSkipDeleteConfirm}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await deleteRequest.mutateAsync(pendingDelete.id);
          toast.success("Request removed");
          if (skipDeleteConfirm) setSkipDeleteConfirm(true);
          setShowDeleteDialog(false);
          setPendingDelete(null);
        }}
      />
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
