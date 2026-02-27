"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";

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
import { usePostingSuggestions } from "@/lib/hooks/use-posting-suggestions";
import { useMobileKeyboard } from "@/lib/hooks/use-mobile-keyboard";
import { useSlashCommands } from "@/lib/hooks/use-slash-commands";
import { SlashCommandMenu } from "@/components/shared/slash-command-menu";
import {
  TimePickerOverlay,
  LocationOverlay,
  SkillPickerOverlay,
  TemplateOverlay,
} from "@/components/shared/slash-command-overlays";
import type { PostingFormState } from "@/components/posting/posting-form-card";

/** Minimum text length before fetching nudges from the API. */
const NUDGE_MIN_LENGTH = 20;
/** Debounce delay in ms before fetching nudges. */
const NUDGE_DEBOUNCE_MS = 3000;

export default function NewPostingPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [form, setForm] = useState<PostingFormState>(defaultFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [textareaFocused, setTextareaFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const { keyboardVisible } = useMobileKeyboard();

  const slash = useSlashCommands({
    textareaRef,
    value: text,
    onChange: setText,
  });

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 200)}px`;
  }, [text]);

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
  }, [text, form, router]);

  // Compose keydown: slash commands first, then Cmd+Enter shortcut
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      slash.onKeyDown(e);
      if (e.defaultPrevented) return;

      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [slash, handleSubmit],
  );

  const handleFormChange = (field: keyof PostingFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleChipClick = useCallback(
    (chip: { insertText: string }) => {
      const separator = text.trim() ? "\n" : "";
      setText((prev) => prev + separator + chip.insertText);
    },
    [text],
  );

  const handleNudgeDismiss = useCallback((dimension: string) => {
    setDismissedNudges((prev) => new Set(prev).add(dimension));
  }, []);

  const handleNudgeInsert = useCallback(
    (suggestion: string) => {
      const separator = text.trim() ? "\n" : "";
      setText((prev) => prev + separator + suggestion);
    },
    [text],
  );

  const visibleNudges = nudges.filter(
    (n) => !dismissedNudges.has(n.dimension),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back link */}
      <Link
        href="/my-postings"
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

      {/* Hero textarea */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={slash.checkForSlashCommand}
        onFocus={() => setTextareaFocused(true)}
        onBlur={() => setTextareaFocused(false)}
        placeholder={labels.postingCreation.textPlaceholder}
        rows={8}
        className="flex w-full rounded-lg border border-input bg-background px-4 py-3 text-lg leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
        autoFocus
      />

      {/* Slash command menu */}
      {slash.menuOpen && slash.menuPosition && (
        <SlashCommandMenu
          commands={slash.filteredCommands}
          selectedIndex={slash.selectedIndex}
          position={slash.menuPosition}
          onSelect={slash.onSelect}
          onClose={() => slash.closeOverlay()}
        />
      )}

      {/* Slash command overlays */}
      {slash.activeOverlay === "time" && (
        <TimePickerOverlay
          onInsert={slash.handleOverlayResult}
          onClose={slash.closeOverlay}
        />
      )}
      {slash.activeOverlay === "location" && (
        <LocationOverlay
          onInsert={slash.handleOverlayResult}
          onClose={slash.closeOverlay}
        />
      )}
      {slash.activeOverlay === "skills" && (
        <SkillPickerOverlay
          onInsert={slash.handleOverlayResult}
          onClose={slash.closeOverlay}
        />
      )}
      {slash.activeOverlay === "template" && (
        <TemplateOverlay
          onInsert={(templateText) => {
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
          <div className="mt-4">
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
          </div>
        )}
      </div>

      {/* Mobile markdown toolbar */}
      <MarkdownToolbar
        textareaRef={textareaRef}
        onChange={setText}
        visible={keyboardVisible && textareaFocused}
      />
    </div>
  );
}
