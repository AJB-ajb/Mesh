"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
import { CardTypeChips } from "./card-type-chips";
import { useSpaceCards } from "@/lib/hooks/use-space-cards";
import type {
  PollData,
  TimeProposalData,
  RsvpData,
  TaskClaimData,
  LocationData,
  SpaceCardType,
} from "@/lib/supabase/types";
import type { CardSuggestion } from "@/lib/ai/card-suggest";
import {
  detectCardIntent,
  type CardIntentDetection,
} from "@/lib/cards/card-intent-detector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Minimal message shape for trigger C (latest incoming message) */
export interface LatestMessage {
  sender_id: string | null;
  content: string | null;
  type: string;
}

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
  /** Latest message in the conversation — used for trigger C (detect intent on incoming messages) */
  latestMessage?: LatestMessage | null;
  /** Pre-filled slot from shared calendar drag-to-create */
  calendarPrefill?: { start: string; end: string } | null;
  /** Called when the calendar prefill has been consumed */
  onClearCalendarPrefill?: () => void;
}

// ---------------------------------------------------------------------------
// Helper: call suggest API to get prefill for a chosen card type
// ---------------------------------------------------------------------------

async function fetchPrefill(
  spaceId: string,
  cardType: SpaceCardType,
  composeText?: string,
  signal?: AbortSignal,
): Promise<CardSuggestion["prefill"] | null> {
  try {
    const res = await fetch(`/api/spaces/${spaceId}/cards/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardType, composeText }),
      signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.suggestion?.prefill ?? null;
  } catch {
    return null; // best-effort
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ComposeArea({
  spaceId,
  senderId,
  senderName,
  postingOnly = false,
  onTyping,
  onStopTyping,
  followUpSuggestion,
  onClearFollowUp,
  latestMessage,
  calendarPrefill,
  onClearCalendarPrefill,
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

  // Legacy follow-up suggestion (decline-and-suggest, chained flow)
  const [localSuggestion, setLocalSuggestion] = useState<CardSuggestion | null>(
    null,
  );

  // Debounced text for trigger A (set inside setTimeout callback — not synchronous in effect)
  const [debouncedText, setDebouncedText] = useState("");
  const [loadingCardType, setLoadingCardType] = useState<SpaceCardType | null>(
    null,
  );

  // Store prefilled data separately so it survives suggestion/chip dismissal
  const [prefill, setPrefill] = useState<CardSuggestion["prefill"] | null>(
    null,
  );
  const editorRef = useRef<ComposeEditorHandle>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Track dismissed trigger C messages to avoid reappearing chips
  const [dismissedMsg, setDismissedMsg] = useState<string | null>(null);

  // Calendar drag-to-create: open time proposal dialog with pre-filled slot.
  // Uses the React-recommended "derive state from props" pattern:
  // track the previous calendarPrefill value in state and update when it changes.
  const [prevCalendarPrefill, setPrevCalendarPrefill] =
    useState(calendarPrefill);
  if (calendarPrefill && calendarPrefill !== prevCalendarPrefill) {
    setPrevCalendarPrefill(calendarPrefill);
    const startDt = new Date(calendarPrefill.start);
    const endDt = new Date(calendarPrefill.end);
    const label =
      startDt.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }) +
      ", " +
      startDt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC",
      });
    setPrefill({
      slots: [
        { label, start: calendarPrefill.start, end: calendarPrefill.end },
      ],
      title: "",
      duration_minutes: Math.round(
        (endDt.getTime() - startDt.getTime()) / 60000,
      ),
    });
    setDialogKey((k) => k + 1);
    setShowTimeProposalDialog(true);
  } else if (!calendarPrefill && prevCalendarPrefill) {
    setPrevCalendarPrefill(null);
  }

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

  // Abort in-flight prefill requests on unmount
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const effectiveMode = postingOnly ? "P" : mode;

  // ---------------------------------------------------------------------------
  // Trigger A: Debounce compose text (500ms). setState in setTimeout callback
  // is fine — the lint rule only flags synchronous setState in effect body.
  // When text is cleared (e.g. after send), update debouncedText immediately
  // so chips disappear — unless trigger B just set it to the sent text.
  // ---------------------------------------------------------------------------
  const sentTextRef = useRef<string | null>(null);
  useEffect(() => {
    if (effectiveMode !== "M") return;
    const trimmed = text.trim();

    // Text cleared — clear quickly unless trigger B is active
    if (!trimmed) {
      if (sentTextRef.current) {
        // Trigger B just set debouncedText to sent text; don't clear it
        sentTextRef.current = null;
        return;
      }
      // Use minimal timeout so lint doesn't flag synchronous setState in effect
      const timer = setTimeout(() => {
        setDebouncedText("");
      }, 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setDebouncedText(text);
    }, 500);
    return () => clearTimeout(timer);
  }, [text, effectiveMode]);

  // ---------------------------------------------------------------------------
  // Derive detected intent from debounced text (trigger A) or incoming
  // message (trigger C). Pure computation — no setState in effect.
  // ---------------------------------------------------------------------------
  const detectedIntent = useMemo<CardIntentDetection | null>(() => {
    const trimmed = debouncedText.trim();

    // Trigger A: detect from debounced compose text
    if (effectiveMode === "M" && trimmed) {
      const result = detectCardIntent(trimmed);
      if (result.hasIntent) return result;
    }

    // Trigger C: detect from latest incoming message (only when compose is empty)
    if (
      !trimmed &&
      latestMessage &&
      latestMessage.sender_id !== senderId &&
      latestMessage.type === "message" &&
      latestMessage.content &&
      dismissedMsg !== latestMessage.content
    ) {
      const result = detectCardIntent(latestMessage.content);
      if (result.hasIntent) return result;
    }

    return null;
  }, [debouncedText, effectiveMode, latestMessage, senderId, dismissedMsg]);

  // ---------------------------------------------------------------------------
  // Handle send
  // ---------------------------------------------------------------------------
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

      // Trigger B: set debounced text to sent message so useMemo picks up intent.
      // Mark sentTextRef so the debounce effect doesn't immediately clear it
      // when it sees text changed to "".
      if (effectiveMode === "M") {
        sentTextRef.current = trimmed;
        setDebouncedText(trimmed);
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
  ]);

  // ---------------------------------------------------------------------------
  // Card creation callbacks
  // ---------------------------------------------------------------------------
  const handleCreatePoll = useCallback(
    async (pollData: PollData) => {
      await createCard("poll", pollData);
      setSuggestion(null);
      setPrefill(null);
    },
    [createCard, setSuggestion],
  );

  const handleCreateTimeProposal = useCallback(
    async (proposalData: TimeProposalData, deadline?: string) => {
      await createCard("time_proposal", proposalData, deadline);
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

  // ---------------------------------------------------------------------------
  // Handle legacy follow-up suggestion accept (decline-and-suggest, chained)
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Handle type chip selection: call suggest API → open prefilled dialog
  // ---------------------------------------------------------------------------
  const openDialogForType = useCallback((cardType: SpaceCardType) => {
    setDialogKey((k) => k + 1);
    switch (cardType) {
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
  }, []);

  const fetchPrefillInBackground = useCallback(
    (cardType: SpaceCardType, composeText?: string) => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoadingCardType(cardType);

      // Fetch in background — dialog is already open
      fetchPrefill(spaceId, cardType, composeText, controller.signal).then(
        (prefillData) => {
          if (controller.signal.aborted) return;
          setPrefill(prefillData ?? {});
          setLoadingCardType(null);
        },
      );
    },
    [spaceId],
  );

  const handleSelectCardType = useCallback(
    (cardType: SpaceCardType) => {
      const composeText = text.trim() || undefined;
      // Open dialog immediately, fetch prefill in background
      setPrefill(null);
      setDebouncedText(""); // Clear chips after selection
      openDialogForType(cardType);
      fetchPrefillInBackground(cardType, composeText);
    },
    [text, openDialogForType, fetchPrefillInBackground],
  );

  // ---------------------------------------------------------------------------
  // Handle manual "+" menu: open dialog immediately, auto-fill in background
  // ---------------------------------------------------------------------------
  const handleManualCreate = useCallback(
    (cardType: SpaceCardType) => {
      // Open dialog immediately so user can start filling manually
      setPrefill(null);
      openDialogForType(cardType);
      fetchPrefillInBackground(cardType);
    },
    [openDialogForType, fetchPrefillInBackground],
  );

  const editorContext = effectiveMode === "M" ? "message" : "posting";

  // Determine what to show above compose: follow-up suggestion > type chips
  const showFollowUpChip = !!suggestion;
  const showTypeChips =
    !showFollowUpChip &&
    detectedIntent?.hasIntent &&
    detectedIntent.plausibleTypes.length > 0;

  return (
    <div className="border-t border-border bg-background px-4 py-2 shrink-0">
      {/* Legacy follow-up suggestion chip (decline-and-suggest, chained flow) */}
      {showFollowUpChip && (
        <CardSuggestionChip
          suggestion={suggestion}
          onAccept={handleAcceptSuggestion}
          onDismiss={() => setSuggestion(null)}
        />
      )}

      {/* Type selector chips from cheap detector (triggers A, B, C) */}
      {showTypeChips && (
        <CardTypeChips
          plausibleTypes={detectedIntent.plausibleTypes}
          loadingType={loadingCardType}
          onSelectType={handleSelectCardType}
          onDismiss={() => {
            // Track dismissed trigger C content to prevent reappearing
            // Track dismissed trigger C message
            if (latestMessage?.content && !text.trim()) {
              setDismissedMsg(latestMessage.content);
            }
            // Clear debouncedText to dismiss trigger A/B chips
            setDebouncedText("");
          }}
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
                <DropdownMenuItem onClick={() => handleManualCreate("poll")}>
                  <BarChart3 className="size-4 mr-2" />
                  {labels.cards.createPoll}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleManualCreate("time_proposal")}
                >
                  <Clock className="size-4 mr-2" />
                  {labels.cards.createTimeProposal}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleManualCreate("rsvp")}>
                  <UserCheck className="size-4 mr-2" />
                  {labels.cards.createRsvp}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleManualCreate("task_claim")}
                >
                  <ListTodo className="size-4 mr-2" />
                  {labels.cards.createTaskClaim}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleManualCreate("location")}
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
        isLoadingPrefill={loadingCardType !== null}
      />
      <CreateTimeProposalDialog
        key={`time-${dialogKey}`}
        open={showTimeProposalDialog}
        onOpenChange={(open) => {
          setShowTimeProposalDialog(open);
          if (!open) onClearCalendarPrefill?.();
        }}
        onSubmit={handleCreateTimeProposal}
        suggestedSlots={prefill?.slots?.map((s) => s.label) ?? prefill?.options}
        suggestedTitle={prefill?.title}
        structuredSlots={prefill?.slots}
        durationMinutes={prefill?.duration_minutes}
        memberNotes={prefill?.member_notes}
        isLoadingPrefill={loadingCardType !== null}
      />
      <CreateRsvpDialog
        key={`rsvp-${dialogKey}`}
        open={showRsvpDialog}
        onOpenChange={setShowRsvpDialog}
        onSubmit={handleCreateRsvp}
        suggestedTitle={prefill?.title}
        suggestedThreshold={prefill?.suggested_threshold}
        isLoadingPrefill={loadingCardType !== null}
      />
      <CreateTaskClaimDialog
        key={`task-${dialogKey}`}
        open={showTaskClaimDialog}
        onOpenChange={setShowTaskClaimDialog}
        onSubmit={handleCreateTaskClaim}
        suggestedDescription={prefill?.description}
        isLoadingPrefill={loadingCardType !== null}
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
