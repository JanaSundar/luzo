"use client";

import { Play, Save } from "lucide-react";
import { SaveToCollectionDialog } from "@/components/collections/SaveToCollectionDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";
import { METHOD_BG_COLORS } from "@/utils/http";
import {
  isStrippedRequestNameEqualToUrl,
  stripMethodPrefixFromRequestName,
} from "@/utils/requestDisplayName";
import type { SavedRequest } from "@/types";

export function CollectionsHistorySection({
  history,
  onOpenRequest,
}: {
  history: SavedRequest[];
  onOpenRequest: (request: SavedRequest["request"]) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-3">
        {history.map((entry) => {
          const title = stripMethodPrefixFromRequestName(entry.name, entry.request.method);
          const hideUrlLine = isStrippedRequestNameEqualToUrl(
            entry.name,
            entry.request.method,
            entry.request.url,
          );
          return (
            <div
              key={entry.id}
              className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={cn(
                        "font-mono text-[10px] font-semibold",
                        METHOD_BG_COLORS[entry.request.method],
                      )}
                    >
                      {entry.request.method}
                    </Badge>
                    <p className="font-medium break-all">{title}</p>
                  </div>
                  {!hideUrlLine && (
                    <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                      {entry.request.url}
                    </p>
                  )}
                  <p className="mt-2 text-[11px] uppercase tracking-widest text-muted-foreground/80">
                    Captured {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => onOpenRequest(entry.request)}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Run again
                  </Button>
                  <SaveToCollectionDialog
                    request={entry.request}
                    defaultName={entry.name}
                    trigger={
                      <Button type="button" size="sm" variant="outline" className="gap-2">
                        <Save className="h-3.5 w-3.5" />
                        Save
                      </Button>
                    }
                  />
                </div>
              </div>
            </div>
          );
        })}
        {history.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-6 text-sm text-muted-foreground">
            History is empty until you run requests from the Playground.
          </p>
        )}
      </div>
    </section>
  );
}
