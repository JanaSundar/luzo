"use client";

import { Copy, MoreVertical, Play, PlayCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StepCardMenuProps {
  onRunFromHere: () => void;
  onRunFromHereFresh: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function StepCardMenu({
  onRunFromHere,
  onRunFromHereFresh,
  onDuplicate,
  onDelete,
}: StepCardMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-xs" className="h-7 w-7">
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={onRunFromHere} className="gap-2 text-xs font-medium">
          <Play className="h-3.5 w-3.5" /> Run from here
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onRunFromHereFresh} className="gap-2 text-xs font-medium">
          <PlayCircle className="h-3.5 w-3.5" /> Run fresh
        </DropdownMenuItem>
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
