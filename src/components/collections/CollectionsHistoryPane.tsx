"use client";

import { Clock3 } from "lucide-react";
import { CollectionsHistorySection } from "@/components/collections/CollectionsHistorySection";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkspaceHeader } from "@/components/ui/workspace-header";
import { WorkspacePane } from "@/components/ui/workspace-pane";
import { ACTION_BUTTON_CLASSES } from "@/lib/utils";
import type { Collection } from "@/types";

interface CollectionsHistoryPaneProps {
  history: Collection["requests"];
  historyCount: number;
  onClearHistory: () => void;
  onOpenRequest: (request: Collection["requests"][number]["request"]) => void;
}

export function CollectionsHistoryPane({
  history,
  historyCount,
  onClearHistory,
  onOpenRequest,
}: CollectionsHistoryPaneProps) {
  return (
    <WorkspacePane border>
      <WorkspaceHeader title="History" icon={Clock3} status={`${historyCount} items`}>
        {historyCount > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={ACTION_BUTTON_CLASSES}
            onClick={onClearHistory}
          >
            Clear
          </Button>
        ) : null}
      </WorkspaceHeader>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          <CollectionsHistorySection history={history} onOpenRequest={onOpenRequest} />
        </div>
      </ScrollArea>
    </WorkspacePane>
  );
}
