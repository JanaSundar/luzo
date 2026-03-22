"use client";

import { useCombobox } from "downshift";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type Ref,
  type TextareaHTMLAttributes,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { TemplateValueOverlay } from "@/components/ui/TemplateValueOverlay";
import { TemplateVariableMenu } from "@/components/ui/TemplateVariableMenu";
import { applyTemplateSelection, getActiveTemplateToken } from "@/lib/utils/templateTokens";
import { cn } from "@/lib/utils";
import type { VariableSuggestion } from "@/types/pipeline-debug";

export function TemplateTextarea({
  value,
  onChange,
  suggestions,
  textareaClassName,
  className,
  ...props
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> & {
  value: string;
  onChange: (value: string) => void;
  suggestions: VariableSuggestion[];
  textareaClassName?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPosRef = useRef(0);
  const [items, setItems] = useState<VariableSuggestion[]>([]);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => setMounted(true), []);

  const updateMenuPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const rect = textarea.getBoundingClientRect();
    setMenuStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 240),
      maxWidth: "calc(100vw - 16px)",
      zIndex: 9999,
    });
  }, []);

  const refreshItems = useCallback(
    (nextValue: string, cursorPos: number) => {
      const active = getActiveTemplateToken(nextValue, cursorPos);
      if (!active) return setItems([]);
      const query = active.token.toLowerCase();
      setItems(
        suggestions
          .filter(
            (suggestion) =>
              suggestion.path.toLowerCase().includes(query) ||
              suggestion.label.toLowerCase().includes(query),
          )
          .slice(0, 10),
      );
    },
    [suggestions],
  );

  const { isOpen, getMenuProps, getItemProps, getInputProps, highlightedIndex, closeMenu } =
    useCombobox<VariableSuggestion>({
      items,
      itemToString: (item) => item?.path ?? "",
      onSelectedItemChange: ({ selectedItem }) => {
        if (!selectedItem) return;
        const nextValue = applyTemplateSelection(value, cursorPosRef.current, selectedItem.path);
        onChange(nextValue);
        requestAnimationFrame(() => {
          textareaRef.current?.focus();
          const nextPos =
            nextValue.indexOf(selectedItem.path, cursorPosRef.current - selectedItem.path.length) +
            selectedItem.path.length +
            2;
          textareaRef.current?.setSelectionRange(nextPos, nextPos);
        });
      },
      stateReducer: (_state, { type, changes }) =>
        type === useCombobox.stateChangeTypes.InputKeyDownEscape
          ? { ...changes, isOpen: false }
          : { ...changes, inputValue: value },
    });

  const textareaProps = useMemo(
    () =>
      getInputProps(
        {
          ref: textareaRef as unknown as Ref<HTMLInputElement>,
          value,
          onChange: (event) => {
            const target = event.target as HTMLTextAreaElement;
            const nextValue = target.value;
            const cursorPos = target.selectionStart ?? nextValue.length;
            cursorPosRef.current = cursorPos;
            onChange(nextValue);
            refreshItems(nextValue, cursorPos);
          },
          onClick: (event) => {
            const target = event.currentTarget as HTMLTextAreaElement;
            cursorPosRef.current = target.selectionStart ?? 0;
            refreshItems(value, cursorPosRef.current);
          },
          onKeyDown: (event) => {
            const target = event.currentTarget as HTMLTextAreaElement;
            cursorPosRef.current = target.selectionStart ?? 0;
            if (event.key === "Escape" && isOpen) {
              event.stopPropagation();
              closeMenu();
            }
            props.onKeyDown?.(event as unknown as ReactKeyboardEvent<HTMLTextAreaElement>);
          },
        },
        { suppressRefError: true },
      ) as TextareaHTMLAttributes<HTMLTextAreaElement>,
    [closeMenu, getInputProps, isOpen, onChange, props, refreshItems, value],
  );

  useEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
    window.addEventListener("scroll", updateMenuPosition, true);
    window.addEventListener("resize", updateMenuPosition);
    return () => {
      window.removeEventListener("scroll", updateMenuPosition, true);
      window.removeEventListener("resize", updateMenuPosition);
    };
  }, [isOpen, updateMenuPosition]);

  const menu = (
    <TemplateVariableMenu
      items={items}
      highlightedIndex={highlightedIndex}
      getItemProps={getItemProps}
      getMenuProps={getMenuProps}
      isOpen={isOpen}
      style={menuStyle}
    />
  );

  return (
    <div className={cn("relative w-full", className)}>
      {value ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-md">
          <div style={{ transform: `translateY(-${scrollTop}px)` }}>
            <TemplateValueOverlay
              value={value}
              suggestions={suggestions}
              className="min-h-[80px] whitespace-pre-wrap break-words px-3 py-2 font-mono text-sm leading-6"
              onVariableMouseDown={(event) => {
                event.preventDefault();
                textareaRef.current?.focus();
              }}
            />
          </div>
        </div>
      ) : null}
      <textarea
        {...props}
        {...textareaProps}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          value && "text-transparent caret-foreground",
          textareaClassName,
        )}
      />
      {mounted ? createPortal(menu, document.body) : menu}
    </div>
  );
}
