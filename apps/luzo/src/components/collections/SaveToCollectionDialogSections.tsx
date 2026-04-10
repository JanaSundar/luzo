"use client";

import { FolderPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CollectionsUnavailableState({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="space-y-4 rounded-xl border border-dashed border-border/60 bg-muted/5 p-6 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted/10">
        <FolderPlus className="h-5 w-5 text-muted-foreground/40" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold uppercase tracking-widest">Connect Database</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Collections require a database connection to persist requests across sessions. Your
          current request is saved in your local history.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 border-primary/20 transition-all hover:bg-primary/5 hover:text-primary"
        onClick={onOpenSettings}
      >
        Open Settings
      </Button>
    </div>
  );
}

export function NewCollectionSection({
  name,
  description,
  isPending,
  onNameChange,
  onDescriptionChange,
  onCreate,
}: {
  name: string;
  description: string;
  isPending: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        New collection
      </p>
      <Input
        placeholder="Collection name"
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
      />
      <Textarea
        placeholder="Optional description"
        value={description}
        onChange={(event) => onDescriptionChange(event.target.value)}
        rows={3}
      />
      <div className="flex justify-end">
        <Button
          type="button"
          variant="secondary"
          className="min-w-36 justify-center"
          onClick={onCreate}
          disabled={isPending || !name.trim()}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create collection"
          )}
        </Button>
      </div>
    </div>
  );
}
