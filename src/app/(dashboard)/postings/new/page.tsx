"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
import type { EditorView } from "@codemirror/view";

import { Button } from "@/components/ui/button";
import { labels } from "@/lib/labels";
import {
  PostingFormCard,
  defaultFormState,
} from "@/components/posting/posting-form-card";
import { MarkdownToolbar } from "@/components/shared/markdown-toolbar";
import { TextTools } from "@/components/shared/text-tools";
import { SuggestionChips } from "@/components/shared/suggestion-chips";
import {
  NudgeBanner,
  nudgeMessage,
  type NudgeItem,
} from "@/components/shared/nudge-banner";
import { MeshEditor } from "@/components/editor/mesh-editor";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { transcribeAudio } from "@/lib/transcribe";
import { useEditorSlashCommands } from "@/lib/hooks/use-editor-slash-commands";
import { usePostingSuggestions } from "@/lib/hooks/use-posting-suggestions";
import { useMobileKeyboard } from "@/lib/hooks/use-mobile-keyboard";
import { SlashCommandMenu } from "@/components/shared/slash-command-menu";
import {
  TimePickerOverlay,
  LocationOverlay,
  SkillPickerOverlay,
  TemplateOverlay,
  type OverlayResult,
} from "@/components/shared/slash-command-overlays";
import type { PostingFormState } from "@/components/posting/posting-form-card";
import type { ChipMetadataMap, ChipMetadataEntry } from "@/lib/types/posting";

/** Emoji prefixes for plain-text chip insertion (replaces TipTap MetadataChip nodes). */
const CHIP_EMOJI: Record<string, string> = {
  location: "\uD83D\uDCCD",
  time: "\uD83D\uDD52",
  skills: "\uD83D\uDEE0\uFE0F",
};

/** Minimum text length before fetching nudges from the API. */
const NUDGE_MIN_LENGTH = 20;
/** Debounce delay in ms before fetching nudges. */
const NUDGE_DEBOUNCE_MS = 3000;

/** Insert text at cursor in a CodeMirror EditorView. */
function insertAtCursor(view: EditorView, text: string) {
  const pos = view.state.selection.main.head;
  view.dispatch({
    changes: { from: pos, to: pos, insert: text },
  });
  view.focus();
}

export default function NewPostingPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [form, setForm] = useState<PostingFormState>(defaultFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [hiddenDetails, setHiddenDetails] = useState("");
  const [editorFocused, setEditorFocused] = useState(false);
  const [editorInstance, setEditorInstance] = useState<EditorView | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const { keyboardVisible } = useMobileKeyboard();

  // Chip metadata state
  const [chipMetadata, setChipMetadata] = useState<ChipMetadataMap>({});
  const chipCounterRef = useRef<Record<string, number>>({
    location: 0,
    time: 0,
    skills: 0,
  });

  // Slash commands via CodeMirror plugin
  const slash = useEditorSlashCommands();

  // CodeMirror extensions (stable reference)
  const [extensions] = useState(() => [slash.slashExtension]);

  const handleEditorReady = useCallback((view: EditorView) => {
    editorRef.current = view;
    setEditorInstance(view);
  }, []);

  // Suggestion chips state
  const { chips } = usePostingSuggestions(text);
  const [chipsDismissed, setChipsDismissed] = useState(false);

  // Nudge state
  const [nudges, setNudges] = useState<NudgeItem[]>([]);
  const [dismissedNudges, setDismissedNudges] = useState<Set<string>>(
    new Set(),
  );
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNudgeTextRef = useRef<string>("");

  // Scroll to error when it appears
  useEffect(() => {
    if (error && errorRef.current) {
      queueMicrotask(() => {
        errorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    }
  }, [error]);

  // Debounced nudge fetching
  useEffect(() => {
    if (nudgeTimerRef.current) {
      clearTimeout(nudgeTimerRef.current);
    }

    const trimmed = text.trim();
    if (trimmed.length < NUDGE_MIN_LENGTH) {
      return;
    }

    // Don't re-fetch if text hasn't meaningfully changed
    if (trimmed === lastNudgeTextRef.current) {
      return;
    }

    nudgeTimerRef.current = setTimeout(() => {
      lastNudgeTextRef.current = trimmed;

      fetch("/api/extract/posting/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.nudges && Array.isArray(data.nudges)) {
            queueMicrotask(() => {
              setNudges(
                data.nudges.map(
                  (n: { dimension: string; suggestion: string }) => ({
                    dimension: n.dimension,
                    message: nudgeMessage(n.dimension),
                    suggestion: n.suggestion,
                  }),
                ),
              );
            });
          }
        })
        .catch(() => {
          // Silently ignore nudge errors — non-critical feature
        });
    }, NUDGE_DEBOUNCE_MS);

    return () => {
      if (nudgeTimerRef.current) {
        clearTimeout(nudgeTimerRef.current);
      }
    };
  }, [text]);

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setError(null);
    setIsSaving(true);

    try {
      const res = await fetch("/api/postings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          description: trimmed,
          sourceText: trimmed,
          hiddenDetails: hiddenDetails.trim() || undefined,
          chipMetadata:
            Object.keys(chipMetadata).length > 0 ? chipMetadata : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsSaving(false);
        setError(data.error?.message || labels.postingCreation.errorGeneric);
        return;
      }

      setIsSaving(false);
      router.push(`/postings/${data.posting.id}?extraction=pending`);
    } catch {
      setIsSaving(false);
      setError(labels.postingCreation.errorGeneric);
    }
  }, [text, form, hiddenDetails, chipMetadata, router]);

  const handleFormChange = (field: keyof PostingFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleChipClick = useCallback((chip: { insertText: string }) => {
    const view = editorRef.current;
    if (view) {
      insertAtCursor(view, chip.insertText);
    }
  }, []);

  const handleNudgeDismiss = useCallback((dimension: string) => {
    setDismissedNudges((prev) => new Set(prev).add(dimension));
  }, []);

  const handleNudgeInsert = useCallback((suggestion: string) => {
    const view = editorRef.current;
    if (view) {
      insertAtCursor(view, "\n" + suggestion);
    }
  }, []);

  /**
   * Insert a metadata chip as plain text with emoji prefix and store its structured data.
   */
  const insertChip = useCallback(
    (chipType: string, display: string, data: Record<string, unknown>) => {
      const view = editorRef.current;
      if (!view) return;

      const count = chipCounterRef.current[chipType] ?? 0;
      const metadataKey = `${chipType}_${count}`;
      chipCounterRef.current[chipType] = count + 1;

      const entry: ChipMetadataEntry = {
        type: chipType as ChipMetadataEntry["type"],
        display,
        data,
      } as ChipMetadataEntry;

      setChipMetadata((prev) => ({ ...prev, [metadataKey]: entry }));

      const emoji = CHIP_EMOJI[chipType] ?? "";
      insertAtCursor(view, `${emoji} ${display} `);
    },
    [],
  );

  /**
   * Handle overlay result — either a plain string or structured OverlayResult.
   * Structured results insert a chip; plain strings insert text.
   */
  const handleOverlayResult = useCallback(
    (result: string | OverlayResult) => {
      if (typeof result === "string") {
        const view = editorRef.current;
        if (view) {
          insertAtCursor(view, result);
        }
      } else {
        // Structured result — insert as chip
        const chipType = slash.activeOverlay ?? "unknown";
        insertChip(chipType, result.display, result.data ?? {});
      }
      slash.closeOverlay();
    },
    [slash, insertChip],
  );

  const visibleNudges = nudges.filter((n) => !dismissedNudges.has(n.dimension));

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-20">
      {/* Back link */}
      <Link
        href="/posts"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {labels.postingCreation.backButton}
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {labels.postingCreation.pageTitle}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {labels.postingCreation.subtitle}
        </p>
      </div>

      {error && (
        <p
          ref={errorRef}
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {/* Hero editor */}
      <div className="relative">
        <MeshEditor
          content={text}
          placeholder={labels.postingCreation.textPlaceholder}
          onChange={setText}
          onSubmit={handleSubmit}
          autoFocus
          extensions={extensions}
          onEditorReady={handleEditorReady}
          onFocus={() => setEditorFocused(true)}
          onBlur={() => setEditorFocused(false)}
          className="min-h-[200px]"
        />
        <SpeechInput
          className="absolute right-1.5 top-1.5 h-7 w-7 shrink-0 p-0"
          size="icon"
          variant="ghost"
          type="button"
          onAudioRecorded={transcribeAudio}
          onTranscriptionChange={(transcript) => {
            const view = editorRef.current;
            if (view) {
              insertAtCursor(view, transcript);
            }
          }}
        />
      </div>

      {/* Slash command menu */}
      {slash.menuState.isOpen && editorInstance && (
        <SlashCommandMenu
          commands={slash.menuState.commands}
          selectedIndex={slash.menuState.selectedIndex}
          position={(() => {
            const coords = editorInstance.coordsAtPos(slash.menuState.from);
            if (!coords) return { top: 0, left: 0 };
            return { top: coords.bottom + 4, left: coords.left };
          })()}
          onSelect={(cmd) => slash.selectCommand(editorInstance, cmd)}
          onClose={slash.closeOverlay}
        />
      )}

      {/* Slash command overlays */}
      {slash.activeOverlay === "time" && (
        <TimePickerOverlay
          onInsert={handleOverlayResult}
          onClose={slash.closeOverlay}
        />
      )}
      {slash.activeOverlay === "location" && (
        <LocationOverlay
          onInsert={handleOverlayResult}
          onClose={slash.closeOverlay}
        />
      )}
      {slash.activeOverlay === "skills" && (
        <SkillPickerOverlay
          onInsert={handleOverlayResult}
          onClose={slash.closeOverlay}
        />
      )}
      {slash.activeOverlay === "template" && (
        <TemplateOverlay
          onInsert={(result) => {
            const templateText =
              typeof result === "string" ? result : result.display;
            setText(templateText);
            slash.closeOverlay();
          }}
          onClose={slash.closeOverlay}
        />
      )}

      {/* Suggestion chips */}
      {!chipsDismissed && (
        <SuggestionChips
          chips={chips}
          onChipClick={handleChipClick}
          onDismiss={() => setChipsDismissed(true)}
        />
      )}

      {/* Text tools (auto-format, auto-clean) */}
      <TextTools text={text} onTextChange={setText} />

      {/* Nudge banners */}
      <NudgeBanner
        nudges={visibleNudges}
        onDismiss={handleNudgeDismiss}
        onInsertSuggestion={handleNudgeInsert}
      />

      {/* Post button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!text.trim() || isSaving}
          size="lg"
        >
          {isSaving ? "Posting..." : labels.postingCreation.postButton}
        </Button>
      </div>

      {/* Collapsible edit details */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="flex w-full items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <div>
            <span className="font-medium">
              {labels.postingCreation.editDetailsToggle}
            </span>
            <span className="ml-2 text-xs">
              {labels.postingCreation.editDetailsHint}
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showDetails ? "rotate-180" : ""}`}
          />
        </button>

        {showDetails && (
          <div className="mt-4 space-y-6">
            <PostingFormCard
              form={form}
              setForm={setForm}
              onChange={handleFormChange}
              onSubmit={async (e) => {
                e.preventDefault();
                await handleSubmit();
              }}
              isSaving={isSaving}
              isExtracting={false}
              hideSubmitButton
              hideDescription
            />

            {/* Hidden details textarea */}
            <div className="space-y-2">
              <label
                htmlFor="hidden-details"
                className="text-sm font-medium leading-none"
              >
                {labels.hiddenDetails.fieldLabel}
              </label>
              <textarea
                id="hidden-details"
                value={hiddenDetails}
                onChange={(e) => setHiddenDetails(e.target.value)}
                placeholder={labels.hiddenDetails.fieldPlaceholder}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {labels.hiddenDetails.fieldHelp}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile markdown toolbar */}
      <MarkdownToolbar
        editor={editorInstance}
        visible={keyboardVisible && editorFocused}
      />
    </div>
  );
}
