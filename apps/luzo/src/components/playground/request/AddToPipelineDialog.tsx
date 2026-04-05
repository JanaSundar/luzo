"use client";

import { GitBranch } from "lucide-react";
import type { ReactElement } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function AddToPipelineDialog({
  pipelines,
  onAddToPipeline,
  onCreateAndAdd,
  trigger,
}: {
  pipelines: Array<{ id: string; name: string }>;
  onAddToPipeline: (id: string, name: string) => void;
  onCreateAndAdd: (name: string) => void;
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-2 rounded-lg border-border/40 bg-background px-3 text-sm font-medium"
              title="Add to Pipeline"
            >
              <GitBranch className="h-3.5 w-3.5" />
              Pipeline
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Pipeline</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Existing pipelines
            </label>
            <div className="max-h-[220px] overflow-y-auto rounded-xl border border-border/50">
              {pipelines.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No pipelines yet
                </div>
              ) : (
                pipelines.map((pipeline) => (
                  <div
                    key={pipeline.id}
                    className="flex items-center justify-between border-b border-border/40 px-3 py-2 last:border-0"
                  >
                    <span className="truncate pr-2 text-sm font-medium">{pipeline.name}</span>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        onAddToPipeline(pipeline.id, pipeline.name);
                        setOpen(false);
                      }}
                    >
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="space-y-2 border-t border-border/40 pt-4">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Create new
            </label>
            <div className="flex gap-2">
              <Input
                value={newPipelineName}
                onChange={(event) => setNewPipelineName(event.target.value)}
                placeholder="Pipeline name"
                className="h-9"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onCreateAndAdd(newPipelineName);
                    setNewPipelineName("");
                    setOpen(false);
                  }
                }}
              />
              <Button
                size="sm"
                className="h-9"
                onClick={() => {
                  onCreateAndAdd(newPipelineName);
                  setNewPipelineName("");
                  setOpen(false);
                }}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose
            render={
              <Button type="button" variant="outline">
                Close
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
