"use client";

import { useMemo, useState } from "react";
import { BookmarkPlus } from "lucide-react";
import { toast } from "sonner";
import { useTemplateMutations } from "@/features/templates/useTemplates";
import { inferTemplateInputSchema } from "@/features/templates/template-utils";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { Pipeline, TemplateDefinition } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface SaveTemplateDialogProps {
  pipeline: Pipeline | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SaveTemplateDialog({
  pipeline,
  open: controlledOpen,
  onOpenChange,
}: SaveTemplateDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Custom");
  const [tags, setTags] = useState("");
  const dbReady = useSettingsStore(
    (state) => state.dbStatus === "connected" && state.dbSchemaReady,
  );
  const mutation = useTemplateMutations().saveTemplate;
  const inferredInputs = useMemo(
    () => (pipeline ? inferTemplateInputSchema(pipeline) : []),
    [pipeline],
  );

  const canSave = useMemo(
    () => dbReady && pipeline && pipeline.steps.length > 0 && name.trim().length > 0,
    [dbReady, name, pipeline],
  );

  const open = controlledOpen ?? uncontrolledOpen;

  const handleOpenChange = (nextOpen: boolean) => {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
    if (nextOpen && pipeline) {
      setName(`${pipeline.name} Template`);
      setDescription(pipeline.description ?? "");
      setCategory("Custom");
      setTags("");
    }
  };

  const handleSave = async () => {
    if (!pipeline || !canSave) return;
    const template: TemplateDefinition = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim() || "Custom",
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      complexity: pipeline.steps.length >= 4 ? "intermediate" : "starter",
      sourceType: "user",
      pipelineDefinition: pipeline,
      inputSchema: inferredInputs,
      sampleOutputs: [],
      assumptions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await mutation.mutateAsync(template);
      handleOpenChange(false);
      toast.success("Template saved to your connected database");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save template");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {controlledOpen === undefined ? (
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 font-bold"
              disabled={!dbReady || !pipeline}
            />
          }
        >
          <BookmarkPlus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Save as Template</span>
        </DialogTrigger>
      ) : null}
      <DialogContent className="flex h-[min(80dvh,640px)] max-w-xl flex-col overflow-hidden p-0">
        <DialogHeader>
          <div className="border-b border-border/50 bg-muted/20 px-6 py-5">
            <DialogTitle>Save as Template</DialogTitle>
          </div>
        </DialogHeader>
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="template-name">Name</Label>
              <Input id="template-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="template-category">Category</Label>
              <Input
                id="template-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="template-tags">Tags</Label>
              <Input
                id="template-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="auth, polling, smoke-test"
              />
            </div>
            <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Detected Template Inputs</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {
                      "Luzo will parameterize unresolved `{{variable}}` placeholders when this template is instantiated."
                    }
                  </p>
                </div>
                <span className="rounded-full border border-border/50 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  {inferredInputs.length}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {inferredInputs.length > 0 ? (
                  inferredInputs.map((field) => (
                    <span
                      key={field.key}
                      className="rounded-full border border-border/50 bg-background px-2.5 py-1 text-[11px] text-foreground"
                    >
                      {field.label}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No external template inputs were detected.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="m-1 shrink-0">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canSave || mutation.isPending}>
            Save Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
