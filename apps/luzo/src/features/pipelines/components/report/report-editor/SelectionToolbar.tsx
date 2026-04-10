"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bold,
  Italic,
  List,
  Loader2,
  PlusSquare,
  Sparkles,
  Strikethrough,
  Underline,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils";
import type { SelectionOverlayState } from "./types";

interface SelectionToolbarProps {
  aiConfigured: boolean;
  askAiOpen: boolean;
  canAddSection: boolean;
  instruction: string;
  isApplyingAi: boolean;
  isBoldActive: boolean;
  isItalicActive: boolean;
  isListActive: boolean;
  isStrikeActive: boolean;
  isUnderlineActive: boolean;
  position: SelectionOverlayState;
  title: string;
  onAddSection: () => void;
  onBold: () => void;
  onInstructionChange: (value: string) => void;
  onItalic: () => void;
  onList: () => void;
  onOpenChange: (open: boolean) => void;
  onApply: () => void;
  onStrike: () => void;
  onUnderline: () => void;
}

export function SelectionToolbar({
  aiConfigured,
  askAiOpen,
  canAddSection,
  instruction,
  isApplyingAi,
  isBoldActive,
  isItalicActive,
  isListActive,
  isStrikeActive,
  isUnderlineActive,
  position,
  title,
  onAddSection,
  onBold,
  onInstructionChange,
  onItalic,
  onList,
  onOpenChange,
  onApply,
  onStrike,
  onUnderline,
}: SelectionToolbarProps) {
  return (
    <div
      className="fixed z-50 -translate-x-1/2 -translate-y-[calc(100%+18px)]"
      style={{ left: position.left, top: position.top }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {!askAiOpen ? (
          <motion.div
            key="formatting-toolbar"
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="flex items-center gap-2 rounded-full border border-border/50 bg-background/95 px-2 py-1.5 shadow-lg backdrop-blur-sm"
          >
            <ToolbarIconButton active={isBoldActive} label="Bold" onClick={onBold}>
              <Bold className="h-3.5 w-3.5" />
            </ToolbarIconButton>
            <ToolbarIconButton active={isItalicActive} label="Italic" onClick={onItalic}>
              <Italic className="h-3.5 w-3.5" />
            </ToolbarIconButton>
            <ToolbarIconButton active={isStrikeActive} label="Strike through" onClick={onStrike}>
              <Strikethrough className="h-3.5 w-3.5" />
            </ToolbarIconButton>
            <ToolbarIconButton active={isUnderlineActive} label="Underline" onClick={onUnderline}>
              <Underline className="h-3.5 w-3.5" />
            </ToolbarIconButton>
            <ToolbarIconButton active={isListActive} label="Bullet list" onClick={onList}>
              <List className="h-3.5 w-3.5" />
            </ToolbarIconButton>
            {canAddSection ? (
              <>
                <div className="h-5 w-px bg-border/50" />
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={onAddSection}
                >
                  <PlusSquare className="h-3.5 w-3.5" />
                  Add section
                </button>
              </>
            ) : null}
            <div className="h-5 w-px bg-border/50" />
            <button
              type="button"
              disabled={!aiConfigured}
              title={aiConfigured ? "Ask AI" : "Configure AI provider to use Ask AI"}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors",
                aiConfigured
                  ? "text-foreground hover:bg-muted"
                  : "text-muted-foreground opacity-75",
              )}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => aiConfigured && onOpenChange(true)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Ask AI
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="ask-ai-panel"
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-[360px] rounded-3xl border border-border/50 bg-popover/98 p-4 text-popover-foreground shadow-2xl ring-1 ring-foreground/10 backdrop-blur"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Ask AI
            </p>
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
              Editing selection inside {title}.
            </p>
            <Textarea
              value={instruction}
              onChange={(event) => onInstructionChange(event.target.value)}
              className="field-sizing-fixed mt-3 min-h-[80px] resize-none overflow-y-auto rounded-2xl text-sm"
              placeholder="Make it clearer, shorter, more technical, or adjust tone..."
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onInstructionChange("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                onClick={onApply}
                disabled={isApplyingAi || !instruction.trim()}
              >
                {isApplyingAi ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Apply
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToolbarIconButton({
  active,
  children,
  label,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors",
        active ? "bg-foreground text-background" : "text-foreground hover:bg-muted",
      )}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
