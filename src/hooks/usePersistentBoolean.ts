"use client";

import { useEffect, useState } from "react";

export function usePersistentBoolean(key: string, initialValue = false) {
  const [value, setValue] = useState<boolean>(() => {
    if (typeof window === "undefined") return initialValue;
    const stored = window.localStorage.getItem(key);
    return stored === null ? initialValue : stored === "true";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, String(value));
  }, [key, value]);

  return [value, setValue] as const;
}
