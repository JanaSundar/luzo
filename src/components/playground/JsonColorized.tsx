"use client";

import { JsonView } from "@/components/ui/JsonView";

export function JsonColorized({ text, highlight }: { text: string; highlight?: string }) {
  return <JsonView text={text} searchQuery={highlight} />;
}
