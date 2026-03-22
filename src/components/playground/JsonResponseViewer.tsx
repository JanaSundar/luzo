"use client";

import { forwardRef } from "react";
import { JsonView, type JsonViewProps, type JsonViewRef } from "@/components/ui/JsonView";

export type JsonResponseViewerProps = JsonViewProps;
export type JsonResponseViewerRef = JsonViewRef;

export const JsonResponseViewer = forwardRef<JsonResponseViewerRef, JsonResponseViewerProps>(
  function JsonResponseViewer(props, ref) {
    return <JsonView ref={ref} {...props} />;
  },
);
