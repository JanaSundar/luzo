"use client";

import type { ReactNode } from "react";

export function EditorCardHeader({
  title,
  description,
  titleEditor,
  dragHandle,
}: {
  title: string;
  description?: string;
  titleEditor?: ReactNode;
  dragHandle?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-3 pb-2">
      {dragHandle ? (
        <div className="flex h-8 items-center opacity-55 transition-opacity group-hover:opacity-100">
          {dragHandle}
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        {titleEditor ? (
          titleEditor
        ) : (
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">
            {title}
          </p>
        )}
        {description ? (
          <p className="mt-1 text-xs font-mono text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
