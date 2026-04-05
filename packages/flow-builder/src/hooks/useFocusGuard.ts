import type { RefObject } from "react";
import { useEffect, useState } from "react";

export function useFocusGuard(canvasRef: RefObject<HTMLElement | null>) {
  const [isEditingInNode, setIsEditingInNode] = useState(false);

  useEffect(() => {
    const root = canvasRef.current;
    if (!root) return;

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const editable =
        target.matches("input, textarea, select, [contenteditable='true'], [role='textbox']") ||
        target.closest("[data-flow-editable='true']");

      setIsEditingInNode(Boolean(editable));
    };

    const handleFocusOut = () => {
      requestAnimationFrame(() => {
        const active = document.activeElement as HTMLElement | null;
        if (!active || !root.contains(active)) {
          setIsEditingInNode(false);
          return;
        }

        const editable =
          active.matches("input, textarea, select, [contenteditable='true'], [role='textbox']") ||
          active.closest("[data-flow-editable='true']");

        setIsEditingInNode(Boolean(editable));
      });
    };

    root.addEventListener("focusin", handleFocusIn);
    root.addEventListener("focusout", handleFocusOut);

    return () => {
      root.removeEventListener("focusin", handleFocusIn);
      root.removeEventListener("focusout", handleFocusOut);
    };
  }, [canvasRef]);

  return { isEditingInNode };
}
