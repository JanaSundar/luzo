"use client";

import type { Editor, JSONContent } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  reportListToDoc,
  reportTextToDoc,
  serializeDocToList,
  serializeDocToText,
  type ReportEditorSectionKey,
} from "@/features/reports/report-editor";
import { cn } from "@/utils";
import { SelectionToolbar } from "./SelectionToolbar";
import type { SelectionOverlayState } from "./types";

interface EditorCardProps {
  title: string;
  description?: string;
  placeholder: string;
  value: string | string[];
  sectionKey: ReportEditorSectionKey;
  aiConfigured: boolean;
  mode: "text" | "list";
  onTextChange?: (value: string) => void;
  onListChange?: (value: string[]) => void;
  onAskAi: (input: {
    sectionKey: ReportEditorSectionKey;
    sectionTitle: string;
    selectedText: string;
    sectionContent: string;
    reportContext: string;
    instruction: string;
  }) => Promise<string>;
  reportContext: string;
  titleEditor?: ReactNode;
  titleStyle?: string;
  dragHandle?: ReactNode;
}

export function EditorCard({
  title,
  description,
  placeholder,
  value,
  sectionKey,
  aiConfigured,
  mode,
  onTextChange,
  onListChange,
  onAskAi,
  reportContext,
  titleEditor,
  titleStyle,
  dragHandle,
}: EditorCardProps) {
  const [selection, setSelection] = useState<SelectionOverlayState | null>(null);
  const [askAiOpen, setAskAiOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [isApplyingAi, setIsApplyingAi] = useState(false);
  const doc = useMemo<JSONContent>(
    () => (mode === "list" ? reportListToDoc(value as string[]) : reportTextToDoc(value as string)),
    [mode, value],
  );

  const updateSelection = useCallback((instance: Editor | null) => {
    if (!instance) {
      setSelection(null);
      setAskAiOpen(false);
      return;
    }

    const { from, to, empty } = instance.state.selection;
    const selectedText = instance.state.doc.textBetween(from, to, "\n").trim();

    if (empty || !selectedText || !instance.isFocused) {
      setSelection(null);
      setAskAiOpen(false);
      return;
    }

    const start = instance.view.coordsAtPos(from);
    const end = instance.view.coordsAtPos(to);
    setSelection({
      from,
      to,
      text: selectedText,
      left: (start.left + end.right) / 2,
      top: Math.min(start.top, end.top) - 8,
    });
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        blockquote: false,
        codeBlock: false,
        dropcursor: false,
        gapcursor: false,
        heading: false,
        horizontalRule: false,
        orderedList: false,
        bulletList: {},
        listItem: {},
      }),
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: doc,
    editorProps: {
      attributes: {
        class:
          mode === "list"
            ? "report-editor-content report-editor-list min-h-[180px] px-5 py-4 text-[15px] leading-8 text-foreground focus:outline-none"
            : cn(
                "report-editor-content min-h-[180px] px-5 py-4 text-[15px] leading-8 text-foreground focus:outline-none",
                titleStyle ?? "font-medium",
              ),
      },
    },
    onUpdate: ({ editor: instance }) => {
      if (mode === "list") onListChange?.(serializeDocToList(instance.getJSON()));
      else onTextChange?.(serializeDocToText(instance.getJSON()));
      updateSelection(instance);
    },
    onSelectionUpdate: ({ editor: instance }) => updateSelection(instance),
    onBlur: () => {
      if (!askAiOpen) setSelection(null);
    },
  });

  useEffect(() => {
    if (!editor) return;

    const currentValue =
      mode === "list"
        ? JSON.stringify(serializeDocToList(editor.getJSON()))
        : serializeDocToText(editor.getJSON());
    const nextValue = mode === "list" ? JSON.stringify(value) : (value as string);
    if (currentValue === nextValue) return;

    editor.commands.setContent(doc, { emitUpdate: false });
  }, [doc, editor, mode, value]);

  const handleApplyAi = useCallback(async () => {
    if (!editor || !selection || !instruction.trim()) return;

    setIsApplyingAi(true);
    try {
      const replacement = await onAskAi({
        sectionKey,
        sectionTitle: title,
        selectedText: selection.text,
        sectionContent: mode === "list" ? (value as string[]).join("\n") : (value as string),
        reportContext,
        instruction: instruction.trim(),
      });

      editor
        .chain()
        .focus()
        .insertContentAt({ from: selection.from, to: selection.to }, replacement)
        .run();
      setAskAiOpen(false);
      setInstruction("");
      setSelection(null);
      toast.success("Applied AI edit");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply AI edit");
    } finally {
      setIsApplyingAi(false);
    }
  }, [editor, instruction, mode, onAskAi, reportContext, sectionKey, selection, title, value]);

  const handleAddSection = useCallback(() => {
    if (!editor || mode !== "text") return;

    editor
      .chain()
      .focus("end")
      .insertContent([
        { type: "paragraph" },
        { type: "paragraph", content: [{ type: "text", text: "New section" }] },
        { type: "paragraph", content: [{ type: "text", text: "Write here." }] },
      ])
      .run();
  }, [editor, mode]);

  return (
    <section className="group relative overflow-visible rounded-[1.5rem] px-2 py-2 transition-colors hover:bg-muted/10">
      <div className="flex items-center gap-3 px-3 pb-2">
        {dragHandle ? (
          <div className="flex h-8 items-center opacity-55 transition-opacity group-hover:opacity-100">
            {dragHandle}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          {titleEditor ? (
            titleEditor
          ) : (
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">
              {title}
            </p>
          )}
          {description ? (
            <p className="mt-1 text-xs font-mono text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>

      <div className="relative rounded-[1.35rem] bg-transparent transition-colors group-focus-within:bg-muted/5">
        <EditorContent
          editor={editor}
          className={cn(
            "min-h-[180px] [&_.ProseMirror]:min-h-[180px] [&_.ProseMirror]:focus:outline-none",
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground/55 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
            "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:space-y-2 [&_.ProseMirror_ul]:pl-6",
            "[&_.ProseMirror_li_p]:my-0 [&_.ProseMirror_p]:my-0 [&_.ProseMirror_p+p]:mt-4",
          )}
        />

        {selection ? (
          <SelectionToolbar
            aiConfigured={aiConfigured}
            askAiOpen={askAiOpen}
            canAddSection={mode === "text"}
            instruction={instruction}
            isApplyingAi={isApplyingAi}
            isBoldActive={Boolean(editor?.isActive("bold"))}
            isItalicActive={Boolean(editor?.isActive("italic"))}
            isListActive={Boolean(editor?.isActive("bulletList"))}
            isStrikeActive={Boolean(editor?.isActive("strike"))}
            isUnderlineActive={Boolean(editor?.isActive("underline"))}
            position={selection}
            title={title}
            onAddSection={handleAddSection}
            onBold={() => editor?.chain().focus().toggleBold().run()}
            onInstructionChange={setInstruction}
            onItalic={() => editor?.chain().focus().toggleItalic().run()}
            onList={() => editor?.chain().focus().toggleBulletList().run()}
            onOpenChange={setAskAiOpen}
            onApply={() => void handleApplyAi()}
            onStrike={() => editor?.chain().focus().toggleStrike().run()}
            onUnderline={() => editor?.chain().focus().toggleUnderline().run()}
          />
        ) : null}
      </div>
    </section>
  );
}
