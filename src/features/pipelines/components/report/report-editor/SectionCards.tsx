"use client";

import type { ReactNode } from "react";
import type { ReportEditorSectionKey } from "@/features/reports/report-editor";
import { EditorCard } from "./EditorCard";
import type { ReportEditorProps } from "./types";

export function TextSectionEditorCard({
  title,
  description,
  placeholder,
  value,
  sectionKey,
  aiConfigured,
  onChange,
  onAskAi,
  reportContext,
  titleEditor,
  titleStyle,
  dragHandle,
}: {
  title: string;
  description?: string;
  placeholder: string;
  value: string;
  sectionKey: ReportEditorSectionKey;
  aiConfigured: boolean;
  onChange: (value: string) => void;
  onAskAi: ReportEditorProps["onAskAi"];
  reportContext: string;
  titleEditor?: ReactNode;
  titleStyle?: string;
  dragHandle?: ReactNode;
}) {
  return (
    <EditorCard
      title={title}
      description={description}
      placeholder={placeholder}
      value={value}
      sectionKey={sectionKey}
      aiConfigured={aiConfigured}
      mode="text"
      onTextChange={onChange}
      onAskAi={onAskAi}
      reportContext={reportContext}
      titleEditor={titleEditor}
      titleStyle={titleStyle}
      dragHandle={dragHandle}
    />
  );
}

export function ListSectionEditorCard({
  title,
  placeholder,
  items,
  sectionKey,
  aiConfigured,
  onChange,
  onAskAi,
  reportContext,
  dragHandle,
}: {
  title: string;
  placeholder: string;
  items: string[];
  sectionKey: Extract<ReportEditorSectionKey, "insights" | "recommendations" | "risks">;
  aiConfigured: boolean;
  onChange: (items: string[]) => void;
  onAskAi: ReportEditorProps["onAskAi"];
  reportContext: string;
  dragHandle?: ReactNode;
}) {
  return (
    <EditorCard
      title={title}
      placeholder={placeholder}
      value={items}
      sectionKey={sectionKey}
      aiConfigured={aiConfigured}
      mode="list"
      onListChange={onChange}
      onAskAi={onAskAi}
      reportContext={reportContext}
      dragHandle={dragHandle}
    />
  );
}
