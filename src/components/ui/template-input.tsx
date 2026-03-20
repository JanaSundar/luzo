"use client";

import { useCombobox } from "downshift";
import { type InputHTMLAttributes, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { VariableSuggestion } from "@/types/pipeline-debug";

const TRIGGER = "{{";
const CLOSE = "}}";

interface TemplateInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value"
> {
  value: string;
  onChange: (value: string) => void;
  suggestions: VariableSuggestion[];
  inputClassName?: string;
}

function getActiveToken(value: string, cursorPos: number): { token: string; start: number } | null {
  const textBefore = value.slice(0, cursorPos);
  const triggerIdx = textBefore.lastIndexOf(TRIGGER);
  if (triggerIdx === -1) return null;

  const between = textBefore.slice(triggerIdx + TRIGGER.length);
  if (between.includes("}")) return null;

  return { token: between, start: triggerIdx };
}

function applySelection(value: string, cursorPos: number, selected: string): string {
  const active = getActiveToken(value, cursorPos);
  if (!active) return value;

  const before = value.slice(0, active.start);
  const after = value.slice(cursorPos);
  return `${before}${TRIGGER}${selected}${CLOSE}${after}`;
}

export function TemplateInput({
  value,
  onChange,
  suggestions,
  inputClassName,
  className,
  ...props
}: TemplateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<VariableSuggestion[]>([]);
  const [mounted, setMounted] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const cursorPosRef = useRef(0);

  useEffect(() => setMounted(true), []);

  const updateDropdownPos = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 240),
      maxWidth: "calc(100vw - 16px)",
      zIndex: 9999,
    });
  }, []);

  const refreshItems = useCallback(
    (val: string, cursor: number) => {
      const active = getActiveToken(val, cursor);
      if (!active) {
        setItems([]);
        return;
      }
      const query = active.token.toLowerCase();
      const filtered = suggestions
        .filter(
          (s) => s.path.toLowerCase().includes(query) || s.label.toLowerCase().includes(query),
        )
        .slice(0, 10);
      setItems(filtered);
    },
    [suggestions],
  );

  const { isOpen, getMenuProps, getInputProps, getItemProps, highlightedIndex, closeMenu } =
    useCombobox<VariableSuggestion>({
      items,
      itemToString: (item) => item?.path ?? "",
      onSelectedItemChange: ({ selectedItem }) => {
        if (!selectedItem) return;
        const cursor = cursorPosRef.current;
        const newValue = applySelection(value, cursor, selectedItem.path);
        onChange(newValue);

        requestAnimationFrame(() => {
          if (!inputRef.current) return;
          const active = getActiveToken(value, cursor);
          if (active) {
            const newPos = active.start + TRIGGER.length + selectedItem.path.length + CLOSE.length;
            inputRef.current.setSelectionRange(newPos, newPos);
          }
        });
      },
      stateReducer: (_state, { type, changes }) => {
        if (
          type === useCombobox.stateChangeTypes.InputKeyDownEnter ||
          type === useCombobox.stateChangeTypes.ItemClick
        ) {
          return { ...changes, isOpen: false, inputValue: "" };
        }
        if (type === useCombobox.stateChangeTypes.InputKeyDownEscape) {
          return { ...changes, isOpen: false };
        }
        return { ...changes, inputValue: value };
      },
    });

  useEffect(() => {
    if (!isOpen) return;
    updateDropdownPos();
    window.addEventListener("scroll", updateDropdownPos, true);
    window.addEventListener("resize", updateDropdownPos);
    return () => {
      window.removeEventListener("scroll", updateDropdownPos, true);
      window.removeEventListener("resize", updateDropdownPos);
    };
  }, [isOpen, updateDropdownPos]);

  const inputProps = getInputProps({
    ...props,
    ref: inputRef,
    value,
    onChange: (e) => {
      const val = e.target.value;
      const cursor = e.target.selectionStart ?? val.length;
      cursorPosRef.current = cursor;
      onChange(val);
      refreshItems(val, cursor);
    },
    onKeyDown: (e) => {
      cursorPosRef.current = (e.target as HTMLInputElement).selectionStart ?? 0;
      if (e.key === "Escape" && isOpen) {
        e.stopPropagation();
        closeMenu();
      }
      if (props.onKeyDown) props.onKeyDown(e);
    },
    onClick: (e) => {
      cursorPosRef.current = (e.target as HTMLInputElement).selectionStart ?? 0;
      refreshItems(value, cursorPosRef.current);
    },
  });

  const groups = groupSuggestions(items);

  const menuContent = (
    <div
      {...getMenuProps()}
      style={dropdownStyle}
      className={cn(
        "min-w-[240px] max-w-sm",
        "bg-popover text-popover-foreground border rounded-lg shadow-lg overflow-hidden",
        "max-h-64 overflow-y-auto",
        (!isOpen || items.length === 0) && "hidden",
      )}
    >
      {isOpen && groups.length > 0 && (
        <div className="p-1">
          {groups.map((group) => (
            <div key={group.stepId}>
              {group.stepId && (
                <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mt-1">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const globalIdx = items.indexOf(item);
                return (
                  <div
                    key={item.path}
                    {...getItemProps({ item, index: globalIdx })}
                    className={cn(
                      "flex flex-col gap-0.5 px-2 py-1.5 rounded-md cursor-pointer text-xs transition-colors",
                      highlightedIndex === globalIdx
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <span className="font-mono text-[11px] leading-tight">{item.path}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <input
        {...inputProps}
        className={cn(
          "flex h-9 w-full rounded-md bg-transparent px-3 py-1 text-sm font-mono transition-colors",
          "placeholder:text-muted-foreground",
          "focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          inputClassName,
        )}
      />
      {mounted ? createPortal(menuContent, document.body) : menuContent}
    </div>
  );
}

function groupSuggestions(items: VariableSuggestion[]): Array<{
  stepId: string;
  label: string;
  items: VariableSuggestion[];
}> {
  const map = new Map<string, { label: string; items: VariableSuggestion[] }>();

  for (const item of items) {
    const key = item.stepId || "__env__";
    if (!map.has(key)) {
      map.set(key, {
        label: item.stepId ? item.stepId : "Environment",
        items: [],
      });
    }
    map.get(key)?.items.push(item);
  }

  return Array.from(map.entries()).map(([stepId, g]) => ({
    stepId,
    ...g,
  }));
}
