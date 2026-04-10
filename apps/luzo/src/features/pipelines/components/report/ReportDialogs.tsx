"use client";

import React from "react";
import { Sparkles, Wand2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface RefiningSectionState {
  key: string;
  title: string;
  content: string;
}

interface EditingSectionState {
  key: string;
  title: string;
  content: string | string[];
}

interface RefinementDialogProps {
  section: RefiningSectionState | null;
  instruction: string;
  isRefining: boolean;
  onInstructionChange: (val: string) => void;
  onRefine: () => void;
  onClose: () => void;
}

interface EditDialogProps {
  section: EditingSectionState | null;
  onSectionChange: (section: EditingSectionState | null) => void;
  onSave: () => void;
  onClose: () => void;
}

export function RefinementDialog({
  section,
  instruction,
  isRefining,
  onInstructionChange,
  onRefine,
  onClose,
}: RefinementDialogProps) {
  return (
    <Dialog open={!!section} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Refine {section?.title}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Current Content
            </label>
            <div className="max-h-32 overflow-y-auto rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
              {section?.content}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Refinement Instructions
            </label>
            <Textarea
              placeholder="e.g., Make it more technical, highlight the latency spikes..."
              value={instruction}
              onChange={(e) => onInstructionChange(e.target.value)}
              className="field-sizing-fixed max-h-[22dvh] min-h-[100px] resize-none overflow-y-auto"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isRefining}>
            Cancel
          </Button>
          <Button
            onClick={onRefine}
            disabled={isRefining || !instruction.trim()}
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isRefining ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            Refine Section
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditDialog({ section, onSectionChange, onSave, onClose }: EditDialogProps) {
  return (
    <Dialog open={!!section} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Edit {section?.title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 py-4">
          <Textarea
            value={Array.isArray(section?.content) ? section?.content.join("\n") : section?.content}
            onChange={(e) =>
              onSectionChange(section ? { ...section, content: e.target.value } : null)
            }
            className="field-sizing-fixed min-h-[180px] max-h-[60dvh] resize-none overflow-y-auto font-mono text-sm"
            rows={14}
            placeholder="Enter markdown content..."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { RefiningSectionState, EditingSectionState };
