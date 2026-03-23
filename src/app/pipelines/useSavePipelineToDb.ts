"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useSettingsStore } from "@/lib/stores/useSettingsStore";
import type { Pipeline } from "@/types";

export function useSavePipelineToDb() {
  const dbUrl = useSettingsStore((state) => state.dbUrl);
  const [isSaving, setIsSaving] = useState(false);

  const savePipelineToDb = async (pipeline: Pipeline | null) => {
    if (!pipeline) return;
    setIsSaving(true);

    try {
      const response = await fetch("/api/db/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dbUrl,
          action: "save-pipeline",
          id: pipeline.id,
          name: pipeline.name,
          data: pipeline,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save pipeline");
      toast.success("Pipeline saved to DB");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save pipeline");
    } finally {
      setIsSaving(false);
    }
  };

  return { isSaving, savePipelineToDb };
}
