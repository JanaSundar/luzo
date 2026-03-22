"use client";

import { type RefObject, useEffect, useState } from "react";

export function useIsTruncated<T extends HTMLElement>(ref: RefObject<T | null>) {
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      setIsTruncated(element.scrollWidth > element.clientWidth + 1);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [ref]);

  return isTruncated;
}
