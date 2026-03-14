"use client";

import { Suspense, useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stack } from "@/components/ui/stack";
import { Group } from "@/components/ui/group";
import { TextTools } from "@/components/shared/text-tools";
import { labels } from "@/lib/labels";
import { parseList } from "@/lib/types/profile";
import { useProfile } from "@/lib/hooks/use-profile";
import { useCalendarBusyBlocks } from "@/lib/hooks/use-calendar-busy-blocks";
import { useProfileExtractionReview } from "@/lib/hooks/use-profile-extraction-review";
import {
  ComposeEditor,
  type ComposeEditorHandle,
} from "@/components/editor/compose-editor";
import { AvailabilityEditor } from "@/components/availability/availability-editor";
import { CalendarConnect } from "@/components/calendar/calendar-connect";
import { ProfileExtractionReviewCard } from "@/components/profile/profile-extraction-review-card";
import {
  AvailabilityOverlay,
  CalendarOverlay,
  UpdateOverlay,
} from "@/components/profile/profile-command-overlays";
import { autoFormat, autoClean } from "@/lib/text-tools-api";
import { PageContent } from "@/components/layout";
import { ROUTES } from "@/lib/routes";

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
  // Editor state
  const [editorText, setEditorText] = useState("");
  const [contextOverlay, setContextOverlay] = useState<string | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const composeRef = useRef<ComposeEditorHandle>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editorInitialized, setEditorInitialized] = useState(false);

  // Initialize editor text from source_text or bio (one-time sync from async data)
  useEffect(() => {
    if (!editorInitialized && !isLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time init from async profile data
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
    <PageContent size="md" className="pb-20">
      {/* Back link */}
      <Link
        href={ROUTES.home}
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
        <p className="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
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
      <ComposeEditor
        ref={composeRef}
        context="profile"
        content={editorText}
        onChange={setEditorText}
        onSubmit={handleExplicitSave}
        placeholder={labels.profileEditor.placeholder}
        autoFocus
        onImmediateCommand={handleImmediateCommand}
        onBlur={handleEditorBlur}
        onContextOverlay={setContextOverlay}
        className="min-h-[200px]"
      />

      {/* Profile-specific overlays */}
      {contextOverlay === "availability" && (
        <AvailabilityOverlay
          windows={availabilityWindows}
          busyBlocks={busyWindows}
          onChange={(w) => {
            onAvailabilityWindowsChange(w);
            setContextOverlay(null);
            composeRef.current?.closeOverlay();
          }}
          onClose={() => {
            setContextOverlay(null);
            composeRef.current?.closeOverlay();
            composeRef.current?.focus();
          }}
        />
      )}
      {contextOverlay === "calendar" && (
        <CalendarOverlay
          onClose={() => {
            setContextOverlay(null);
            composeRef.current?.closeOverlay();
            composeRef.current?.focus();
          }}
        />
      )}
      {contextOverlay === "update" && (
        <UpdateOverlay
          sourceText={sourceText}
          currentFormState={form as unknown as Record<string, unknown>}
          onApplied={() => mutate()}
          onClose={() => {
            setContextOverlay(null);
            composeRef.current?.closeOverlay();
            composeRef.current?.focus();
          }}
        />
      )}

      {/* Toolbar: TextTools + Save */}
      <Group justify="between">
        <TextTools text={editorText} onTextChange={setEditorText} />
        <Button
          onClick={handleExplicitSave}
          disabled={isSaving}
          size="lg"
          className="shrink-0"
        >
          {isSaving
            ? labels.profileEditor.saving
            : labels.profileEditor.saveButton}
        </Button>
      </Group>

      {/* Extracted metadata badges */}
      {(skillsList.length > 0 ||
        interestsList.length > 0 ||
        languagesList.length > 0 ||
        form.location) && (
        <Stack gap="sm">
          {skillsList.length > 0 && (
            <Group wrap gap="xs">
              {skillsList.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </Group>
          )}
          {interestsList.length > 0 && (
            <Group wrap gap="xs">
              {interestsList.map((interest) => (
                <Badge key={interest} variant="outline">
                  {interest}
                </Badge>
              ))}
            </Group>
          )}
          {form.location && (
            <Group wrap gap="xs">
              <Badge variant="outline">{form.location}</Badge>
            </Group>
          )}
          {languagesList.length > 0 && (
            <Group wrap gap="xs">
              {languagesList.map((lang) => (
                <Badge key={lang} variant="outline">
                  {lang}
                </Badge>
              ))}
            </Group>
          )}
        </Stack>
      )}

      {/* Availability + Calendar section */}
      <Stack gap="lg" className="border-t pt-6">
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
      </Stack>
    </PageContent>
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
