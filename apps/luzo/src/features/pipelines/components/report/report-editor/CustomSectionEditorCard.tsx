"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { NarrativeCustomSection } from "@/types/pipeline-report";
import { TextSectionEditorCard } from "./SectionCards";
import type { ReportEditorProps } from "./types";

interface CustomSectionEditorCardProps {
  aiConfigured: boolean;
  dragHandle: React.ReactNode;
  onAskAi: ReportEditorProps["onAskAi"];
  onContentChange: (value: string) => void;
  onRemove: () => void;
  onTitleChange: (value: string) => void;
  reportContext: string;
  section: NarrativeCustomSection;
  sectionKey: `custom:${string}`;
}

export function CustomSectionEditorCard({
  aiConfigured,
  dragHandle,
  onAskAi,
  onContentChange,
  onRemove,
  onTitleChange,
  reportContext,
  section,
  sectionKey,
}: CustomSectionEditorCardProps) {
  return (
    <TextSectionEditorCard
      title={section.title}
      placeholder="Write your new section"
      value={section.content}
      sectionKey={sectionKey}
      aiConfigured={aiConfigured}
      onChange={onContentChange}
      onAskAi={onAskAi}
      reportContext={reportContext}
      dragHandle={dragHandle}
      titleEditor={
        <div className="flex min-w-0 items-center gap-2">
          <Input
            value={section.title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="h-8 flex-1 rounded-full border-border/40 bg-background text-sm font-semibold"
            placeholder="Section title"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={onRemove}
            title="Delete section"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      }
    />
  );
}
