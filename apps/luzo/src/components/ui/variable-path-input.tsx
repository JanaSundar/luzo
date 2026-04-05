"use client";

import { useCombobox } from "downshift";
import { type InputHTMLAttributes, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TemplateVariableMenu } from "@/components/ui/TemplateVariableMenu";
import {
  DEFAULT_TEMPLATE_MENU_POSITION,
  getTemplateMenuPosition,
  type TemplateMenuPosition,
} from "@/lib/utils/templateMenuPosition";
import { cn } from "@/utils";
import type { VariableSuggestion } from "@/types/pipeline-debug";

export function VariablePathInput({
  value,
  onChange,
  suggestions,
  className,
  inputClassName,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  value: string;
  onChange: (value: string) => void;
  suggestions: VariableSuggestion[];
  inputClassName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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
    (query: string) => {
      const normalized = query.trim().toLowerCase();
      const nextItems = suggestions
        .filter(
          (suggestion) =>
            normalized.length === 0 ||
            suggestion.path.toLowerCase().includes(normalized) ||
            suggestion.label.toLowerCase().includes(normalized),
        )
        .slice(0, 10);
      setItems(nextItems);
      return nextItems;
    },
    [suggestions],
  );

  const {
    isOpen,
    highlightedIndex,
    getMenuProps,
    getItemProps,
    getInputProps,
    openMenu,
    closeMenu,
  } = useCombobox<VariableSuggestion>({
    items,
    itemToString: (item) => item?.path ?? "",
    inputValue: value,
    onSelectedItemChange: ({ selectedItem }) => {
      if (!selectedItem) return;
      onChange(selectedItem.path);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        const cursorPos = selectedItem.path.length;
        inputRef.current?.setSelectionRange(cursorPos, cursorPos);
      });
    },
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
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <input
        {...getInputProps({
          ...props,
          ref: inputRef,
          value,
          onFocus: () => {
            const nextItems = refreshItems(value);
            if (nextItems.length > 0) openMenu();
          },
          onChange: (event) => {
            const nextValue = event.target.value;
            onChange(nextValue);
            const nextItems = refreshItems(nextValue);
            if (nextItems.length > 0) openMenu();
            else closeMenu();
          },
          onClick: () => {
            const nextItems = refreshItems(value);
            if (nextItems.length > 0) openMenu();
          },
          onKeyDown: (event) => {
            if (event.key === "Escape" && isOpen) {
              event.stopPropagation();
              closeMenu();
            }
            props.onKeyDown?.(event);
          },
        })}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono transition-colors placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          inputClassName,
        )}
      />
      {mounted ? createPortal(menu, document.body) : menu}
    </div>
  );
}
