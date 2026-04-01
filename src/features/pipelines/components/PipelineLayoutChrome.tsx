"use client";

import { Pencil, Plus } from "lucide-react";

export function PipelineMobileSidebarToggle({
  sidebarOpen,
  onToggle,
}: {
  sidebarOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className="fixed bottom-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg lg:hidden"
        onClick={onToggle}
      >
        <Pencil className="h-4 w-4" />
      </button>

      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm lg:hidden"
          onClick={onToggle}
          onKeyDown={() => {}}
          role="button"
          tabIndex={-1}
        />
      ) : null}
    </>
  );
}

export function PipelineLayoutEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
      <div className="rounded-full bg-muted/30 p-4">
        <Plus className="h-8 w-8 opacity-20" />
      </div>
      <p className="text-sm">Select or create a pipeline to get started</p>
    </div>
  );
}
