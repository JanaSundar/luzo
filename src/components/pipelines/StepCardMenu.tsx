"use client";

import { Copy, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StepCardMenuProps {
  onDuplicate: () => void;
  onDelete: () => void;
}

export function StepCardMenu({ onDuplicate, onDelete }: StepCardMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-xs" className="h-7 w-7">
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem onClick={onDuplicate} className="gap-2 text-xs font-medium">
          <Copy className="h-3.5 w-3.5" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDelete}
          className="gap-2 text-xs font-medium text-destructive focus:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
