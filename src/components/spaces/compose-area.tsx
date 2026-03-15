"use client";

import { useState, useCallback, useRef } from "react";
import { Send, Plus, X, BarChart3, Clock, FileText } from "lucide-react";

import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import {
  ComposeEditor,
  type ComposeEditorHandle,
} from "@/components/editor/compose-editor";
import {
  useSendSpaceMessage,
  type SendPayload,
} from "@/lib/hooks/use-send-space-message";
import {
  PostingComposeFields,
  INITIAL_POSTING_FIELDS,
  type PostingFields,
} from "./posting-compose-fields";
import { CreatePollDialog } from "./cards/create-poll-dialog";
import { CreateTimeProposalDialog } from "./cards/create-time-proposal-dialog";
import { useSpaceCards } from "@/lib/hooks/use-space-cards";
import type { PollData, TimeProposalData } from "@/lib/supabase/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ComposeAreaProps {
  spaceId: string;
  senderId: string;
  senderName: string | null;
  postingOnly?: boolean;
  onTyping?: () => void;
  onStopTyping?: () => void;
}

export function ComposeArea({
  spaceId,
  senderId,
  senderName,
  postingOnly = false,
  onTyping,
  onStopTyping,
}: ComposeAreaProps) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"M" | "P">(postingOnly ? "P" : "M");
  const [postingFields, setPostingFields] = useState<PostingFields>(
    INITIAL_POSTING_FIELDS,
  );
  const [showPollDialog, setShowPollDialog] = useState(false);
  const [showTimeProposalDialog, setShowTimeProposalDialog] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const editorRef = useRef<ComposeEditorHandle>(null);

  const { createCard } = useSpaceCards(spaceId);
  const { send, isSending } = useSendSpaceMessage({
    spaceId,
    senderId,
    senderName,
  });

  const effectiveMode = postingOnly ? "P" : mode;

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    let payload: SendPayload;
    if (effectiveMode === "M") {
      payload = { mode: "message", content: trimmed };
    } else {
      payload = {
        mode: "posting",
        text: trimmed,
        category: postingFields.category,
        capacity: postingFields.capacity,
        deadline: postingFields.deadline,
        visibility: postingFields.visibility,
        autoAccept: postingFields.autoAccept,
        tags: postingFields.tags,
      };
    }

    onStopTyping?.();
    const ok = await send(payload);
    if (ok) {
      setText("");
      setPostingFields(INITIAL_POSTING_FIELDS);
      // Auto-reset to message mode after sending a posting
      if (!postingOnly) setMode("M");
      editorRef.current?.focus();
    }
  }, [
    text,
    effectiveMode,
    postingFields,
    send,
    isSending,
    postingOnly,
    onStopTyping,
  ]);

  const handleCreatePoll = useCallback(
    async (pollData: PollData) => {
      await createCard("poll", pollData);
    },
    [createCard],
  );

  const handleCreateTimeProposal = useCallback(
    async (proposalData: TimeProposalData) => {
      await createCard("time_proposal", proposalData);
    },
    [createCard],
  );

  const editorContext = effectiveMode === "M" ? "message" : "posting";

  return (
    <div className="border-t border-border bg-background px-4 py-2 shrink-0">
      <div className="flex items-end gap-2">
        <div className="flex-1 min-w-0">
          <ComposeEditor
            ref={editorRef}
            context={editorContext}
            className={effectiveMode === "M" ? "cm-compact" : undefined}
            content={text}
            onChange={(v) => {
              setText(v);
              onTyping?.();
            }}
            onSubmit={handleSend}
            placeholder={
              effectiveMode === "M"
                ? labels.spaces.composeMessage
                : labels.spaces.composePosting
            }
            onTypingChange={(typing) => {
              if (!typing) onStopTyping?.();
            }}
          />
        </div>

        {/* + / × button — hidden in posting-only mode */}
        {!postingOnly &&
          (effectiveMode === "P" ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-full shrink-0"
              aria-label={labels.cards.dismissPosting}
              onClick={() => {
                setMode("M");
                setPostingFields(INITIAL_POSTING_FIELDS);
              }}
            >
              <X className="size-4" />
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 rounded-full shrink-0"
                  aria-label={labels.cards.createCardButton}
                >
                  <Plus className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top">
                <DropdownMenuItem onClick={() => setMode("P")}>
                  <FileText className="size-4 mr-2" />
                  {labels.cards.createPosting}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setDialogKey((k) => k + 1);
                    setShowPollDialog(true);
                  }}
                >
                  <BarChart3 className="size-4 mr-2" />
                  {labels.cards.createPoll}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setDialogKey((k) => k + 1);
                    setShowTimeProposalDialog(true);
                  }}
                >
                  <Clock className="size-4 mr-2" />
                  {labels.cards.createTimeProposal}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ))}

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

      {/* Posting fields — shown when in P mode */}
      {effectiveMode === "P" && (
        <div className="mt-2">
          <PostingComposeFields
            fields={postingFields}
            onChange={setPostingFields}
          />
        </div>
      )}

      <CreatePollDialog
        key={`poll-${dialogKey}`}
        open={showPollDialog}
        onOpenChange={setShowPollDialog}
        onSubmit={handleCreatePoll}
      />
      <CreateTimeProposalDialog
        key={`time-${dialogKey}`}
        open={showTimeProposalDialog}
        onOpenChange={setShowTimeProposalDialog}
        onSubmit={handleCreateTimeProposal}
      />
    </div>
  );
}
