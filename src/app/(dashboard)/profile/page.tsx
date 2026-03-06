"use client";

import { Suspense, useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { EditorView } from "@codemirror/view";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { labels } from "@/lib/labels";
import { parseList } from "@/lib/types/profile";
import { useProfile } from "@/lib/hooks/use-profile";
import { useCalendarBusyBlocks } from "@/lib/hooks/use-calendar-busy-blocks";
import { useProfileExtractionReview } from "@/lib/hooks/use-profile-extraction-review";
import { useMobileKeyboard } from "@/lib/hooks/use-mobile-keyboard";
import { useEditorSlashCommands } from "@/lib/hooks/use-editor-slash-commands";
import { MeshEditor } from "@/components/editor/mesh-editor";
import { SlashCommandMenu } from "@/components/shared/slash-command-menu";
import { MobileCommandSheet } from "@/components/shared/mobile-command-sheet";
import { SlashTriggerButton } from "@/components/shared/slash-trigger-button";
import { MarkdownToolbar } from "@/components/shared/markdown-toolbar";
import { TextTools } from "@/components/shared/text-tools";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { transcribeAudio } from "@/lib/transcribe";
import { AvailabilityEditor } from "@/components/availability/availability-editor";
import { CalendarConnect } from "@/components/calendar/calendar-connect";
import { ProfileExtractionReviewCard } from "@/components/profile/profile-extraction-review-card";
import {
  AvailabilityOverlay,
  CalendarOverlay,
  UpdateOverlay,
} from "@/components/profile/profile-command-overlays";
import {
  TimePickerOverlay,
  LocationOverlay,
  SkillPickerOverlay,
  type OverlayResult,
} from "@/components/shared/slash-command-overlays";
import { meshLinkExtension } from "@/components/editor/extensions/mesh-link-plugin";
import { hiddenSyntaxExtension } from "@/components/editor/extensions/hidden-syntax-plugin";
import { autoFormat, autoClean } from "@/lib/text-tools-api";

function insertAtCursor(view: EditorView, text: string) {
  const pos = view.state.selection.main.head;
  view.dispatch({
    changes: { from: pos, to: pos, insert: text },
  });
  view.focus();
}

function ProfilePageContent() {
  const searchParams = useSearchParams();
  const shouldExtract = searchParams.get("extraction") === "pending";

  const {
    profileId,
    form,
    isLoading,
    isSaving,
    error,
    success,
    userEmail,
    sourceText,
    availabilityWindows,
    onAvailabilityWindowsChange,
    mutate,
  } = useProfile();

  const { busyWindows } = useCalendarBusyBlocks(profileId);
  const { keyboardVisible } = useMobileKeyboard();
  // Editor state
  const [editorText, setEditorText] = useState("");
  const [editorFocused, setEditorFocused] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editorInitialized, setEditorInitialized] = useState(false);

  // Initialize editor text from source_text or bio
  useEffect(() => {
    if (!editorInitialized && !isLoading) {
      setEditorText(sourceText ?? form.bio ?? "");
      setEditorInitialized(true);
    }
  }, [isLoading, sourceText, form.bio, editorInitialized]);

  // Profile extraction review
  const extractionReview = useProfileExtractionReview({
    profileId: profileId ?? null,
    sourceText: editorText || sourceText || "",
    shouldExtract,
  });

  // Immediate commands (/format, /clean)
  const handleImmediateCommand = useCallback(
    async (name: string) => {
      if (!editorText.trim()) return;
      try {
        if (name === "format") {
          const { result, changed } = await autoFormat(editorText);
          if (changed) {
            setEditorText(result);
            toast.success(labels.textTools.appliedFormat);
          } else {
            toast(labels.textTools.noChanges);
          }
        } else if (name === "clean") {
          const { result, changed } = await autoClean(editorText);
          if (changed) {
            setEditorText(result);
            toast.success(labels.textTools.appliedClean);
          } else {
            toast(labels.textTools.noChanges);
          }
        }
      } catch {
        toast.error(
          name === "format"
            ? labels.textTools.errorFormat
            : labels.textTools.errorClean,
        );
      }
    },
    [editorText],
  );

  // Slash commands
  const slash = useEditorSlashCommands({
    context: "profile",
    onImmediateCommand: handleImmediateCommand,
  });

  const [extensions] = useState(() => [
    slash.slashExtension,
    ...meshLinkExtension(),
    ...hiddenSyntaxExtension(),
  ]);

  const handleEditorReady = useCallback((view: EditorView) => {
    editorRef.current = view;
  }, []);

  // Auto-save on blur (debounced)
  const saveProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          sourceText: editorText,
          bio: editorText,
          availabilityWindows,
        }),
      });
      if (res.ok) {
        toast.success(labels.profileEditor.saved);
        await mutate();
      }
    } catch {
      // Silent — save errors shown on next explicit save
    }
  }, [form, editorText, availabilityWindows, mutate]);

  const handleEditorBlur = useCallback(() => {
    setEditorFocused(false);
    // Debounced auto-save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveProfile();
    }, 2000);
  }, [saveProfile]);

  // Explicit save
  const handleExplicitSave = useCallback(async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    await saveProfile();
  }, [saveProfile]);

  // Keyboard shortcut (Cmd+S)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleExplicitSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleExplicitSave]);

  // Handle overlay results
  const handleOverlayResult = useCallback(
    (result: string | OverlayResult) => {
      const text = typeof result === "string" ? result : result.display;
      const view = editorRef.current;
      if (view) {
        insertAtCursor(view, text);
      }
      slash.closeOverlay();
      editorRef.current?.focus();
    },
    [slash],
  );

  // Extracted metadata for badges
  const skillsList =
    form.selectedSkills.length > 0
      ? form.selectedSkills.map((s) => s.name)
      : parseList(form.skills);
  const interestsList = parseList(form.interests);
  const languagesList = parseList(form.languages);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-20">
      {/* Back link */}
      <Link
        href="/posts"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {labels.common.backToDashboard}
      </Link>

      {/* Header: name + headline */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {form.fullName || labels.profile.title}
        </h1>
        {form.headline && (
          <p className="mt-0.5 text-muted-foreground">{form.headline}</p>
        )}
        {userEmail && (
          <p className="mt-0.5 text-xs text-muted-foreground">{userEmail}</p>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
          {labels.profile.updateSuccess}
        </p>
      )}

      {/* Extraction review card */}
      {extractionReview.status !== "idle" && (
        <ProfileExtractionReviewCard
          status={extractionReview.status}
          extracted={extractionReview.extracted}
          acceptAll={extractionReview.acceptAll}
          acceptField={extractionReview.acceptField}
          dismiss={extractionReview.dismiss}
          retry={extractionReview.retry}
        />
      )}

      {/* MeshEditor — always editable */}
      <div className="relative">
        <MeshEditor
          content={editorText}
          placeholder={labels.profileEditor.placeholder}
          onChange={setEditorText}
          onSubmit={handleExplicitSave}
          autoFocus
          extensions={extensions}
          onEditorReady={handleEditorReady}
          onFocus={() => setEditorFocused(true)}
          onBlur={handleEditorBlur}
          className="min-h-[200px]"
        />
        <SpeechInput
          className="absolute right-1.5 top-1.5 size-7 shrink-0 p-0"
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

      {/* Slash command menu (desktop) */}
      {/* eslint-disable react-hooks/refs -- editor ref access is intentional */}
      {slash.menuState.isOpen && editorRef.current && (
        <SlashCommandMenu
          commands={slash.menuState.commands}
          selectedIndex={slash.menuState.selectedIndex}
          position={(() => {
            const coords = editorRef.current!.coordsAtPos(slash.menuState.from);
            if (!coords) return { top: 0, left: 0 };
            return { top: coords.bottom + 4, left: coords.left };
          })()}
          onSelect={(cmd) => slash.selectCommand(editorRef.current!, cmd)}
          onClose={() => slash.closeMenu(editorRef.current)}
        />
      )}
      {/* eslint-enable react-hooks/refs */}

      {/* Shared slash command overlays */}
      {slash.activeOverlay === "time" && (
        <TimePickerOverlay
          onInsert={handleOverlayResult}
          onClose={() => {
            slash.closeOverlay();
            editorRef.current?.focus();
          }}
        />
      )}
      {slash.activeOverlay === "location" && (
        <LocationOverlay
          onInsert={handleOverlayResult}
          onClose={() => {
            slash.closeOverlay();
            editorRef.current?.focus();
          }}
        />
      )}
      {slash.activeOverlay === "skills" && (
        <SkillPickerOverlay
          onInsert={handleOverlayResult}
          onClose={() => {
            slash.closeOverlay();
            editorRef.current?.focus();
          }}
        />
      )}

      {/* Profile-specific overlays */}
      {slash.activeOverlay === "availability" && (
        <AvailabilityOverlay
          windows={availabilityWindows}
          busyBlocks={busyWindows}
          onChange={(w) => {
            onAvailabilityWindowsChange(w);
            slash.closeOverlay();
          }}
          onClose={() => {
            slash.closeOverlay();
            editorRef.current?.focus();
          }}
        />
      )}
      {slash.activeOverlay === "calendar" && (
        <CalendarOverlay
          onClose={() => {
            slash.closeOverlay();
            editorRef.current?.focus();
          }}
        />
      )}
      {slash.activeOverlay === "update" && (
        <UpdateOverlay
          sourceText={sourceText}
          currentFormState={form as unknown as Record<string, unknown>}
          onApplied={() => mutate()}
          onClose={() => {
            slash.closeOverlay();
            editorRef.current?.focus();
          }}
        />
      )}

      {/* Toolbar: TextTools + Save */}
      <div className="flex items-center justify-between">
        <TextTools text={editorText} onTextChange={setEditorText} />
        <Button onClick={handleExplicitSave} disabled={isSaving} size="lg">
          {isSaving
            ? labels.profileEditor.saving
            : labels.profileEditor.saveButton}
        </Button>
      </div>

      {/* Extracted metadata badges */}
      {(skillsList.length > 0 ||
        interestsList.length > 0 ||
        languagesList.length > 0 ||
        form.location) && (
        <div className="space-y-2">
          {skillsList.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {skillsList.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          )}
          {interestsList.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {interestsList.map((interest) => (
                <Badge key={interest} variant="outline">
                  {interest}
                </Badge>
              ))}
            </div>
          )}
          {form.location && (
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline">{form.location}</Badge>
            </div>
          )}
          {languagesList.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {languagesList.map((lang) => (
                <Badge key={lang} variant="outline">
                  {lang}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Availability + Calendar section */}
      <div className="space-y-4 border-t pt-6">
        <h2 className="text-lg font-semibold">
          {labels.profileEditor.availabilityTitle}
        </h2>
        <AvailabilityEditor
          windows={availabilityWindows}
          onChange={onAvailabilityWindowsChange}
          busyBlocks={busyWindows}
        />
        {calendarError && (
          <p className="text-sm text-destructive">{calendarError}</p>
        )}
        <CalendarConnect
          onError={(msg) => setCalendarError(msg)}
          onSuccess={() => setCalendarError(null)}
        />
      </div>

      {/* Mobile markdown toolbar */}
      <MarkdownToolbar
        // eslint-disable-next-line react-hooks/refs -- stable ref passed as prop
        editor={editorRef.current}
        visible={keyboardVisible && editorFocused}
      />

      {/* Mobile command sheet + trigger */}
      <SlashTriggerButton onClick={() => setMobileSheetOpen(true)} />
      <MobileCommandSheet
        open={mobileSheetOpen}
        commands={slash.contextCommands}
        onSelect={(cmd) => {
          setMobileSheetOpen(false);
          const view = editorRef.current;
          if (view) {
            slash.selectCommand(view, cmd);
          }
        }}
        onClose={() => setMobileSheetOpen(false)}
      />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
