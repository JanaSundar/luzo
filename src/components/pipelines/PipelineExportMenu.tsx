"use client";

import { Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportPipelineToPostman } from "@/features/exporters/pipeline-postman";
import { exportPipelineToOpenApi } from "@/features/exporters/pipeline-openapi";
import { downloadTextFile, slugifyFilenamePart } from "@/features/reports/export-download";
import type { Pipeline } from "@/types";

interface PipelineExportMenuProps {
  pipeline: Pipeline;
  disabled?: boolean;
}

export function PipelineExportMenu({ pipeline, disabled }: PipelineExportMenuProps) {
  const slug = slugifyFilenamePart(pipeline.name, "pipeline");

  const handlePostman = () => {
    downloadTextFile(
      exportPipelineToPostman(pipeline),
      `${slug}.postman_collection.json`,
      "application/json",
    );
  };

  const handleOpenApi = () => {
    downloadTextFile(exportPipelineToOpenApi(pipeline), `${slug}.openapi.json`, "application/json");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        render={
          <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8 font-bold">
            <Share className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export Pipeline</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handlePostman} className="text-xs font-medium">
          Export as Postman Collection
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenApi} className="text-xs font-medium">
          Export as OpenAPI Spec
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
