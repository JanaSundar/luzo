"use client";

import { useCombobox } from "downshift";
import { type InputHTMLAttributes, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TemplateValueOverlay } from "@/components/ui/TemplateValueOverlay";
import { TemplateVariableMenu } from "@/components/ui/TemplateVariableMenu";
import {
  DEFAULT_TEMPLATE_MENU_POSITION,
  getTemplateMenuPosition,
  type TemplateMenuPosition,
} from "@/utils/templateMenuPosition";
import { applyTemplateSelection, getActiveTemplateToken } from "@/utils/templateTokens";
import { cn } from "@/utils";
import type { VariableSuggestion } from "@/types/pipeline-debug";

export function TemplateInput({
  value,
  onChange,
  suggestions,
  inputClassName,
  overlayClassName,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  value: string;
  onChange: (value: string) => void;
  suggestions: VariableSuggestion[];
  inputClassName?: string;
  overlayClassName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorPosRef = useRef(0);
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

  const { isOpen, getMenuProps, getInputProps, getItemProps, highlightedIndex, closeMenu } =
    useCombobox<VariableSuggestion>({
      items,
      itemToString: (item) => item?.path ?? "",
      onSelectedItemChange: ({ selectedItem }) => {
        if (!selectedItem) return;
        const nextValue = applyTemplateSelection(value, cursorPosRef.current, selectedItem.path);
        onChange(nextValue);
        requestAnimationFrame(() => {
          inputRef.current?.focus();
          const nextPos =
            nextValue.indexOf(selectedItem.path, cursorPosRef.current - selectedItem.path.length) +
            selectedItem.path.length +
            2;
          inputRef.current?.setSelectionRange(nextPos, nextPos);
        });
      },
      stateReducer: (_state, { type, changes }) =>
        type === useCombobox.stateChangeTypes.InputKeyDownEscape
          ? { ...changes, isOpen: false }
          : { ...changes, inputValue: value },
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
      items={items}
      highlightedIndex={highlightedIndex}
      getItemProps={getItemProps}
      getMenuProps={getMenuProps}
      isOpen={isOpen}
      position={menuPosition ?? DEFAULT_TEMPLATE_MENU_POSITION}
    />
  );

  return (
    <div ref={containerRef} className={cn("group/template-input relative w-full", className)}>
      {value ? (
        <TemplateValueOverlay
          value={value}
          suggestions={suggestions}
          className={cn(
            "flex items-center px-3 font-mono text-sm transition-opacity group-focus-within/template-input:opacity-0",
            overlayClassName,
          )}
          onVariableMouseDown={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
        />
      ) : null}
      <input
        {...getInputProps({
          ...props,
          ref: inputRef,
          value,
          onChange: (event) => {
            const nextValue = event.target.value;
            const cursorPos = event.target.selectionStart ?? nextValue.length;
            cursorPosRef.current = cursorPos;
            onChange(nextValue);
            refreshItems(nextValue, cursorPos);
          },
          onClick: (event) => {
            cursorPosRef.current = event.currentTarget.selectionStart ?? 0;
            refreshItems(value, cursorPosRef.current);
          },
          onKeyDown: (event) => {
            cursorPosRef.current = event.currentTarget.selectionStart ?? 0;
            if (event.key === "Escape" && isOpen) {
              event.stopPropagation();
              closeMenu();
            }
            props.onKeyDown?.(event);
          },
        })}
        className={cn(
          "flex h-9 w-full rounded-md bg-transparent px-3 py-1 text-sm font-mono transition-colors placeholder:text-muted-foreground selection:bg-foreground selection:text-background focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          value && "text-transparent caret-foreground focus:text-foreground",
          inputClassName,
        )}
      />
      {mounted ? createPortal(menu, document.body) : menu}
    </div>
  );
}
