"use client";

import { Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportCollectionToPostman } from "@/lib/exporters/pipeline-postman";
import { exportCollectionToOpenApi } from "@/lib/exporters/pipeline-openapi";
import { downloadTextFile, slugifyFilenamePart } from "@/lib/reports/export-download";
import type { Collection } from "@/types";

interface CollectionExportMenuProps {
  collection: Collection;
  disabled?: boolean;
}

export function CollectionExportMenu({ collection, disabled }: CollectionExportMenuProps) {
  const slug = slugifyFilenamePart(collection.name, "collection");

  const handlePostman = () => {
    downloadTextFile(
      exportCollectionToPostman(collection),
      `${slug}.postman_collection.json`,
      "application/json",
    );
  };

  const handleOpenApi = () => {
    downloadTextFile(
      exportCollectionToOpenApi(collection),
      `${slug}.openapi.json`,
      "application/json",
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        render={
          <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8">
            <Share className="h-3.5 w-3.5" />
            Export
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
