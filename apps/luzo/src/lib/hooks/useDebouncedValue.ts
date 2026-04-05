import { useEffect, useState } from "react";

/**
 * Returns a debounced version of the value. Updates are delayed by `delayMs`
 * after the last change. Useful for search inputs to avoid running expensive
 * operations on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
