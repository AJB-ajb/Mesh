"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { labels } from "@/lib/labels";
import { InputModeToggle } from "@/components/posting/input-mode-toggle";
import { AiExtractionCard } from "@/components/posting/ai-extraction-card";
import {
  PostingFormCard,
  defaultFormState,
} from "@/components/posting/posting-form-card";
import { SuggestionChips } from "@/components/shared/suggestion-chips";
import {
  NudgeBanner,
  nudgeMessage,
  type NudgeItem,
} from "@/components/shared/nudge-banner";
import { usePostingSuggestions } from "@/lib/hooks/use-posting-suggestions";
import type { InputMode } from "@/components/posting/input-mode-toggle";
import type { PostingFormState } from "@/components/posting/posting-form-card";

/** Minimum text length before fetching nudges from the API. */
const NUDGE_MIN_LENGTH = 20;
/** Debounce delay in ms before fetching nudges. */
const NUDGE_DEBOUNCE_MS = 3000;

export default function NewPostingPage() {
  const router = useRouter();
  const [form, setForm] = useState<PostingFormState>(defaultFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("ai");
  const [aiText, setAiText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionSuccess, setExtractionSuccess] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  // Suggestion chips state
  const { chips } = usePostingSuggestions(aiText);
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

    const trimmed = aiText.trim();
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
  }, [aiText]);

  const handleChange = (field: keyof PostingFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleChipClick = useCallback(
    (chip: { insertText: string }) => {
      const separator = aiText.trim() ? "\n" : "";
      setAiText((prev) => prev + separator + chip.insertText);
    },
    [aiText],
  );

  const handleNudgeDismiss = useCallback((dimension: string) => {
    setDismissedNudges((prev) => new Set(prev).add(dimension));
  }, []);

  const handleNudgeInsert = useCallback(
    (suggestion: string) => {
      const separator = aiText.trim() ? "\n" : "";
      setAiText((prev) => prev + separator + suggestion);
    },
    [aiText],
  );

  const visibleNudges = nudges.filter((n) => !dismissedNudges.has(n.dimension));

  const handleAiExtract = async () => {
    if (!aiText.trim()) {
      setError(labels.postingCreation.errorEmptyText);
      return;
    }

    setError(null);
    setIsExtracting(true);
    setExtractionSuccess(false);

    try {
      const response = await fetch("/api/extract/posting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract posting");
      }

      const extracted = data.posting;

      // Map extracted data to form state
      const extractedMax =
        extracted.team_size_max?.toString() || form.lookingFor;
      setForm((prev) => ({
        ...prev,
        title: extracted.title || prev.title,
        description: extracted.description || prev.description,
        skills: Array.isArray(extracted.skills)
          ? extracted.skills.join(", ")
          : prev.skills,
        estimatedTime: extracted.estimated_time || prev.estimatedTime,
        teamSizeMin: extracted.team_size_min?.toString() || prev.teamSizeMin,
        teamSizeMax: extractedMax,
        lookingFor: extractedMax,
        category: extracted.category || prev.category,
        visibility:
          extracted.visibility ||
          (Array.isArray(extracted.invitees) && extracted.invitees.length > 0
            ? "private"
            : extracted.mode === "friend_ask"
              ? "private"
              : prev.visibility),
        tags: Array.isArray(extracted.tags)
          ? extracted.tags.join(", ")
          : prev.tags,
        contextIdentifier:
          extracted.context_identifier || prev.contextIdentifier,
        skillLevelMin: prev.skillLevelMin,
        availabilityMode: extracted.availability_mode || prev.availabilityMode,
        timezone: extracted.timezone || prev.timezone,
        availabilityWindows: Array.isArray(extracted.availability_windows)
          ? extracted.availability_windows.map(
              (w: {
                day_of_week: number;
                start_minutes: number;
                end_minutes: number;
              }) => ({
                day_of_week: w.day_of_week,
                start_minutes: w.start_minutes,
                end_minutes: w.end_minutes,
              }),
            )
          : prev.availabilityWindows,
      }));

      setExtractionSuccess(true);
      // Switch to form mode to review extracted data
      setTimeout(() => {
        setInputMode("form");
        setExtractionSuccess(false);
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to extract posting",
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!form.description.trim()) {
      setError(labels.postingCreation.errorEmptyDescription);
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch("/api/postings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsSaving(false);
        setError(data.error?.message || labels.postingCreation.errorGeneric);
        return;
      }

      setIsSaving(false);
      router.push(`/postings/${data.posting.id}`);
    } catch {
      setIsSaving(false);
      setError(labels.postingCreation.errorGeneric);
    }
  };

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

      <InputModeToggle inputMode={inputMode} onModeChange={setInputMode} />

      {inputMode === "ai" && (
        <>
          <AiExtractionCard
            aiText={aiText}
            onAiTextChange={setAiText}
            isExtracting={isExtracting}
            extractionSuccess={extractionSuccess}
            onExtract={handleAiExtract}
            onSwitchToForm={() => setInputMode("form")}
          />

          {/* Suggestion chips — directly below the AI card */}
          {!chipsDismissed && (
            <SuggestionChips
              chips={chips}
              onChipClick={handleChipClick}
              onDismiss={() => setChipsDismissed(true)}
            />
          )}

          {/* Nudge banners — above the info text */}
          <NudgeBanner
            nudges={visibleNudges}
            onDismiss={handleNudgeDismiss}
            onInsertSuggestion={handleNudgeInsert}
          />
        </>
      )}

      {inputMode === "form" && (
        <PostingFormCard
          form={form}
          setForm={setForm}
          onChange={handleChange}
          onSubmit={handleSubmit}
          isSaving={isSaving}
          isExtracting={isExtracting}
        />
      )}

      {/* Info */}
      <p className="text-center text-sm text-muted-foreground">
        {inputMode === "ai"
          ? labels.postingCreation.infoAiMode
          : labels.postingCreation.infoFormMode}
      </p>
    </div>
  );
}
