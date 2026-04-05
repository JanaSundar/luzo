"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ExportFormat } from "@/types/pipeline-debug";

interface ReportExportMenuProps {
  disabled?: boolean;
  onExport: (format: ExportFormat) => void;
}

const FORMATS: Array<{ id: ExportFormat; label: string }> = [
  { id: "pdf", label: "Export PDF" },
  { id: "json", label: "Export JSON" },
  { id: "markdown", label: "Export Markdown" },
];

export function ReportExportMenu({ disabled, onExport }: ReportExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        render={
          <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8 font-bold">
            <FileDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-40">
        {FORMATS.map((format) => (
          <DropdownMenuItem
            key={format.id}
            onClick={() => onExport(format.id)}
            className="text-xs font-medium"
          >
            {format.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
