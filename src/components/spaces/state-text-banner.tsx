"use client";

import { useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";

import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";

interface StateTextBannerProps {
  stateText: string | null;
  canEdit: boolean;
  onEdit?: () => void;
}

export function StateTextBanner({
  stateText,
  canEdit,
  onEdit,
}: StateTextBannerProps) {
  const [expanded, setExpanded] = useState(false);

  if (!stateText?.trim()) return null;

  return (
    <div className="border-b border-border bg-muted/30 shrink-0">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-2 w-full px-4 py-2 text-left min-h-[44px]"
        aria-expanded={expanded}
      >
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform shrink-0",
            expanded && "rotate-180",
          )}
        />
        {expanded ? (
          <span className="text-sm font-medium flex-1">
            {labels.spaces.stateText}
          </span>
        ) : (
          <p className="text-sm text-muted-foreground truncate flex-1">
            {stateText.split("\n")[0]}
          </p>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-3">
          <MarkdownRenderer content={stateText} className="text-sm" />
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-8 text-xs text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
            >
              <Pencil className="size-3 mr-1" />
              {labels.spaces.editStateText}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
