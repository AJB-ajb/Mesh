"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ComposeAreaProps = {
  postingOnly?: boolean;
};

export function ComposeArea({ postingOnly = false }: ComposeAreaProps) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"M" | "P">(postingOnly ? "P" : "M");

  return (
    <div className="border-t border-border bg-background px-3 py-2 shrink-0">
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={mode === "M" ? "Message..." : "Write a posting..."}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-input bg-muted/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px] max-h-24"
        />
        {/* M/P toggle */}
        <div
          className={cn(
            "flex items-center rounded-full border border-border overflow-hidden shrink-0",
            postingOnly && "opacity-50 pointer-events-none",
          )}
        >
          <button
            type="button"
            onClick={() => setMode("M")}
            className={cn(
              "px-2.5 py-1.5 text-xs font-semibold transition-colors min-h-[36px]",
              mode === "M"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            disabled={postingOnly}
            aria-label="Message mode"
          >
            M
          </button>
          <button
            type="button"
            onClick={() => setMode("P")}
            className={cn(
              "px-2.5 py-1.5 text-xs font-semibold transition-colors min-h-[36px]",
              mode === "P"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Posting mode"
          >
            P
          </button>
        </div>
        {/* Send */}
        <Button
          size="icon"
          className="size-10 rounded-full shrink-0"
          disabled={!text.trim()}
          aria-label="Send"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
