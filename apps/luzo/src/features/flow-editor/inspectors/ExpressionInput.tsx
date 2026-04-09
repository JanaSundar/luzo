"use client";

import { useCombobox } from "downshift";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TemplateVariableMenu } from "@/components/ui/TemplateVariableMenu";
import {
  DEFAULT_TEMPLATE_MENU_POSITION,
  getTemplateMenuPosition,
  type TemplateMenuPosition,
} from "@/utils/templateMenuPosition";
import type { VariableSuggestion } from "@/types/pipeline-debug";

export function ExpressionInput({
  ariaLabel,
  disabled,
  onChange,
  placeholder,
  suggestions,
  value,
}: {
  ariaLabel: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions: VariableSuggestion[];
  value: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef(0);
  const [items, setItems] = useState<VariableSuggestion[]>([]);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState<TemplateMenuPosition | null>(null);

  useEffect(() => setMounted(true), []);

  const updateMenuPosition = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPosition(getTemplateMenuPosition(rect));
  }, []);

  const refreshItems = useCallback(
    (nextValue: string, cursorPos: number) => {
      const active = getActiveExpressionToken(nextValue, cursorPos);
      if (!active || active.token.length < 1) {
        // No active token: show the first suggestion per alias so users can
        // discover all available step aliases without needing to type first.
        const seenAliases = new Set<string>();
        const overview: typeof suggestions = [];
        for (const s of suggestions) {
          const key = s.stepId || s.path;
          if (!seenAliases.has(key)) {
            seenAliases.add(key);
            overview.push(s);
          }
          if (overview.length >= 20) break;
        }
        setItems(overview);
        return;
      }

      const query = active.token.toLowerCase();
      setItems(
        suggestions
          .filter(
            (suggestion) =>
              suggestion.path.toLowerCase().includes(query) ||
              suggestion.label.toLowerCase().includes(query),
          )
          .slice(0, 30),
      );
    },
    [suggestions],
  );

  // Re-sync displayed items when suggestions change (e.g. a new upstream connection was added).
  // refreshItems captures the latest suggestions, so its identity changes whenever suggestions changes.
  useEffect(() => {
    refreshItems(value, cursorRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshItems]);

  const { isOpen, getInputProps, getItemProps, getMenuProps, highlightedIndex, closeMenu } =
    useCombobox({
      items,
      inputValue: value,
      itemToString: (item) => item?.path ?? "",
      onSelectedItemChange: ({ selectedItem }) => {
        if (!selectedItem) return;
        const nextValue = applyExpressionSelection(value, cursorRef.current, selectedItem.path);
        onChange(nextValue);
        requestAnimationFrame(() => {
          textareaRef.current?.focus();
          const nextPos = nextValue.lastIndexOf(selectedItem.path) + selectedItem.path.length;
          textareaRef.current?.setSelectionRange(nextPos, nextPos);
        });
      },
      stateReducer: (_state, { type, changes }) =>
        type === useCombobox.stateChangeTypes.InputKeyDownEscape
          ? { ...changes, isOpen: false }
          : changes,
    });

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
      getItemProps={getItemProps}
      getMenuProps={getMenuProps}
      highlightedIndex={highlightedIndex}
      isOpen={isOpen}
      items={items}
      position={menuPosition ?? DEFAULT_TEMPLATE_MENU_POSITION}
    />
  );

  return (
    <div ref={containerRef} className="relative">
      <textarea
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(getInputProps({
          ref: textareaRef as any,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
            const nextValue = event.target.value;
            const cursor = event.target.selectionStart ?? nextValue.length;
            cursorRef.current = cursor;
            onChange(nextValue);
            refreshItems(nextValue, cursor);
          },
          onClick: (event: React.MouseEvent<HTMLInputElement>) => {
            cursorRef.current = (event.target as HTMLInputElement).selectionStart ?? value.length;
            refreshItems(value, cursorRef.current);
            updateMenuPosition();
          },
          onFocus: (event: React.FocusEvent<HTMLInputElement>) => {
            cursorRef.current = (event.target as HTMLInputElement).selectionStart ?? value.length;
            refreshItems(value, cursorRef.current);
            updateMenuPosition();
          },
          onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
            cursorRef.current = (event.target as HTMLInputElement).selectionStart ?? value.length;
            if (event.key === "Escape" && isOpen) {
              event.stopPropagation();
              closeMenu();
            }
          },
        }) as unknown as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        aria-label={ariaLabel}
        className="flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-transparent focus-visible:ring-0 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm"
        disabled={disabled}
        placeholder={placeholder}
        rows={8}
        value={value}
      />
      {mounted ? createPortal(menu, document.body) : menu}
    </div>
  );
}

function getActiveExpressionToken(value: string, cursorPos: number) {
  const before = value.slice(0, cursorPos);
  const match = before.match(/([A-Za-z0-9_.[\]-]+)$/);
  if (!match) return null;
  return {
    token: match[1] ?? "",
    start: cursorPos - (match[1]?.length ?? 0),
  };
}

function applyExpressionSelection(value: string, cursorPos: number, selected: string) {
  const active = getActiveExpressionToken(value, cursorPos);
  if (!active) return value;
  return `${value.slice(0, active.start)}${selected}${value.slice(cursorPos)}`;
}
