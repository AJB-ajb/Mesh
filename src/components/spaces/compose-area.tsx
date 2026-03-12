"use client";

import { useState, useCallback, useRef, type KeyboardEvent } from "react";
import { Send } from "lucide-react";

import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { useSendSpaceMessage, type SendPayload } from "@/lib/hooks/use-send-space-message";

interface ComposeAreaProps {
  spaceId: string;
  senderId: string;
  senderName: string | null;
  postingOnly?: boolean;
}

export function ComposeArea({
  spaceId,
  senderId,
  senderName,
  postingOnly = false,
}: ComposeAreaProps) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"M" | "P">(postingOnly ? "P" : "M");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { send, isSending } = useSendSpaceMessage({
    spaceId,
    senderId,
    senderName,
  });

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    let payload: SendPayload;
    if (mode === "M") {
      payload = { mode: "message", content: trimmed };
    } else {
      payload = { mode: "posting", text: trimmed };
    }

    const ok = await send(payload);
    if (ok) {
      setText("");
      textareaRef.current?.focus();
    }
  }, [text, mode, send, isSending]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="border-t border-border bg-background px-3 py-2 shrink-0">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === "M"
              ? labels.spaces.composeMessage
              : labels.spaces.composePosting
          }
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
            aria-label={labels.spaces.messageMode}
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
            aria-label={labels.spaces.postingMode}
          >
            P
          </button>
        </div>

        {/* Send button */}
        <Button
          size="icon"
          className="size-10 rounded-full shrink-0"
          disabled={!text.trim() || isSending}
          onClick={handleSend}
          aria-label={labels.spaces.send}
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
