"use client";

import { useState, useCallback, useRef } from "react";
import {
  Send,
  Plus,
  X,
  BarChart3,
  Clock,
  FileText,
  UserCheck,
  ListTodo,
  MapPin,
} from "lucide-react";

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
import { CreateRsvpDialog } from "./cards/create-rsvp-dialog";
import { CreateTaskClaimDialog } from "./cards/create-task-claim-dialog";
import { CreateLocationDialog } from "./cards/create-location-dialog";
import { CardSuggestionChip } from "./card-suggestion-chip";
import { useSpaceCards } from "@/lib/hooks/use-space-cards";
import type {
  PollData,
  TimeProposalData,
  RsvpData,
  TaskClaimData,
  LocationData,
} from "@/lib/supabase/types";
import type { CardSuggestion } from "@/lib/ai/card-suggest";
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
  /** Follow-up suggestion from vote/resolve responses (decline-and-suggest, chained flow) */
  followUpSuggestion?: CardSuggestion | null;
  /** Called when the follow-up suggestion is consumed or dismissed */
  onClearFollowUp?: () => void;
}

export function ComposeArea({
  spaceId,
  senderId,
  senderName,
  postingOnly = false,
  onTyping,
  onStopTyping,
  followUpSuggestion,
  onClearFollowUp,
}: ComposeAreaProps) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"M" | "P">(postingOnly ? "P" : "M");
  const [postingFields, setPostingFields] = useState<PostingFields>(
    INITIAL_POSTING_FIELDS,
  );
  const [showPollDialog, setShowPollDialog] = useState(false);
  const [showTimeProposalDialog, setShowTimeProposalDialog] = useState(false);
  const [showRsvpDialog, setShowRsvpDialog] = useState(false);
  const [showTaskClaimDialog, setShowTaskClaimDialog] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [localSuggestion, setLocalSuggestion] = useState<CardSuggestion | null>(
    null,
  );
  // Store prefilled data separately so it survives suggestion dismissal
  const [prefill, setPrefill] = useState<CardSuggestion["prefill"] | null>(
    null,
  );
  const editorRef = useRef<ComposeEditorHandle>(null);

  // Displayed suggestion: follow-up prop takes precedence over local
  const suggestion = followUpSuggestion?.suggested_type
    ? followUpSuggestion
    : localSuggestion;
  const setSuggestion = useCallback(
    (s: CardSuggestion | null) => {
      setLocalSuggestion(s);
      // Clear the follow-up prop if we're dismissing or replacing
      if (!s) onClearFollowUp?.();
    },
    [onClearFollowUp],
  );

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

      // After sending a message, check for card suggestions
      if (effectiveMode === "M") {
        fetch(`/api/spaces/${spaceId}/cards/suggest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.suggestion?.suggested_type) {
              setSuggestion(data.suggestion);
            }
          })
          .catch(() => {
            // Suggestions are best-effort
          });
      }
    }
  }, [
    text,
    effectiveMode,
    postingFields,
    send,
    isSending,
    postingOnly,
    onStopTyping,
    spaceId,
    setSuggestion,
  ]);

  const handleCreatePoll = useCallback(
    async (pollData: PollData) => {
      await createCard("poll", pollData);
      setSuggestion(null);
      setPrefill(null);
    },
    [createCard, setSuggestion],
  );

  const handleCreateTimeProposal = useCallback(
    async (proposalData: TimeProposalData) => {
      await createCard("time_proposal", proposalData);
      setSuggestion(null);
      setPrefill(null);
    },
    [createCard, setSuggestion],
  );

  const handleCreateRsvp = useCallback(
    async (rsvpData: RsvpData) => {
      await createCard("rsvp", rsvpData);
      setSuggestion(null);
      setPrefill(null);
    },
    [createCard, setSuggestion],
  );

  const handleCreateTaskClaim = useCallback(
    async (taskData: TaskClaimData) => {
      await createCard("task_claim", taskData);
      setSuggestion(null);
      setPrefill(null);
    },
    [createCard, setSuggestion],
  );

  const handleCreateLocation = useCallback(
    async (locationData: LocationData) => {
      await createCard("location", locationData);
      setSuggestion(null);
      setPrefill(null);
    },
    [createCard, setSuggestion],
  );

  const handleAcceptSuggestion = useCallback(
    (s: CardSuggestion) => {
      // Store prefilled data before clearing suggestion so dialogs can use it
      setPrefill(s.prefill);
      setDialogKey((k) => k + 1);
      switch (s.suggested_type) {
        case "poll":
          setShowPollDialog(true);
          break;
        case "time_proposal":
          setShowTimeProposalDialog(true);
          break;
        case "rsvp":
          setShowRsvpDialog(true);
          break;
        case "task_claim":
          setShowTaskClaimDialog(true);
          break;
        case "location":
          setShowLocationDialog(true);
          break;
      }
      setSuggestion(null);
    },
    [setSuggestion],
  );

  const editorContext = effectiveMode === "M" ? "message" : "posting";

  return (
    <div className="border-t border-border bg-background px-4 py-2 shrink-0">
      {/* Card suggestion chip */}
      {suggestion && (
        <CardSuggestionChip
          suggestion={suggestion}
          onAccept={handleAcceptSuggestion}
          onDismiss={() => setSuggestion(null)}
        />
      )}

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
                <DropdownMenuItem
                  onClick={() => {
                    setDialogKey((k) => k + 1);
                    setShowRsvpDialog(true);
                  }}
                >
                  <UserCheck className="size-4 mr-2" />
                  {labels.cards.createRsvp}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setDialogKey((k) => k + 1);
                    setShowTaskClaimDialog(true);
                  }}
                >
                  <ListTodo className="size-4 mr-2" />
                  {labels.cards.createTaskClaim}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setDialogKey((k) => k + 1);
                    setShowLocationDialog(true);
                  }}
                >
                  <MapPin className="size-4 mr-2" />
                  {labels.cards.createLocation}
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
        suggestedQuestion={prefill?.question}
        suggestedOptions={prefill?.options}
      />
      <CreateTimeProposalDialog
        key={`time-${dialogKey}`}
        open={showTimeProposalDialog}
        onOpenChange={setShowTimeProposalDialog}
        onSubmit={handleCreateTimeProposal}
        suggestedSlots={prefill?.slots?.map((s) => s.label) ?? prefill?.options}
        suggestedTitle={prefill?.title}
        structuredSlots={prefill?.slots}
        durationMinutes={prefill?.duration_minutes}
        memberNotes={prefill?.member_notes}
      />
      <CreateRsvpDialog
        key={`rsvp-${dialogKey}`}
        open={showRsvpDialog}
        onOpenChange={setShowRsvpDialog}
        onSubmit={handleCreateRsvp}
        suggestedTitle={prefill?.title}
        suggestedThreshold={prefill?.suggested_threshold}
      />
      <CreateTaskClaimDialog
        key={`task-${dialogKey}`}
        open={showTaskClaimDialog}
        onOpenChange={setShowTaskClaimDialog}
        onSubmit={handleCreateTaskClaim}
        suggestedDescription={prefill?.description}
      />
      <CreateLocationDialog
        key={`location-${dialogKey}`}
        open={showLocationDialog}
        onOpenChange={setShowLocationDialog}
        onSubmit={handleCreateLocation}
      />
    </div>
  );
}
