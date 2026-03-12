"use client";

import { useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { cn } from "@/lib/utils";

type StateTextBannerProps = {
  text: string;
  defaultExpanded?: boolean;
};

export function StateTextBanner({
  text,
  defaultExpanded = false,
}: StateTextBannerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border-b border-border bg-muted/30">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-4 py-2 text-left min-h-[44px]"
        aria-expanded={expanded}
      >
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform shrink-0",
            expanded && "rotate-180",
          )}
        />
        {!expanded ? (
          <p className="text-sm text-muted-foreground truncate flex-1">
            {text.split("\n")[0]}
          </p>
        ) : (
          <span className="text-sm font-medium flex-1">Description</span>
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-3">
          <MarkdownRenderer content={text} className="text-sm" />
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-8 text-xs text-muted-foreground"
          >
            <Pencil className="size-3 mr-1" />
            Edit
          </Button>
        </div>
      )}
    </div>
  );
}
