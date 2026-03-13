"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Check, ImagePlus, X, Bug } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { labels } from "@/lib/labels";
import { useFeedbackSheet } from "./use-feedback-sheet";
import type { FeedbackMood, FeedbackMetadata } from "@/lib/supabase/types";

const MOOD_EMOJIS: Record<FeedbackMood, string> = {
  frustrated: "\u{1F614}",
  neutral: "\u{1F610}",
  happy: "\u{1F60A}",
};

const MOOD_VALUES: FeedbackMood[] = ["frustrated", "neutral", "happy"];
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SCREENSHOTS = 5;

interface ScreenshotEntry {
  url: string | null; // null while still uploading
  preview: string;
  uploading: boolean;
  id: string; // stable key for React
}

function collectMetadata(): FeedbackMetadata {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string };
  };
  return {
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    screen_width: screen.width,
    screen_height: screen.height,
    device_pixel_ratio: window.devicePixelRatio,
    connection_type: nav.connection?.effectiveType,
    app_version: "0.5.0",
    platform: navigator.platform,
    dark_mode: document.documentElement.classList.contains("dark"),
  };
}

export function FeedbackWidget() {
  const { open, setOpen } = useFeedbackSheet();
  const [message, setMessage] = useState("");
  const [mood, setMood] = useState<FeedbackMood | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Screenshot state — array of entries
  const [screenshots, setScreenshots] = useState<ScreenshotEntry[]>([]);
  const screenshotsRef = useRef(screenshots);
  screenshotsRef.current = screenshots;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const anyUploading = screenshots.some((s) => s.uploading);
  const atLimit = screenshots.length >= MAX_SCREENSHOTS;

  const resetForm = useCallback(() => {
    setMessage("");
    setMood(null);
    setError(null);
    setSuccess(false);
    setScreenshots([]);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        resetForm();
      }
    },
    [setOpen, resetForm],
  );

  const uploadFile = useCallback(async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) return;

    if (screenshotsRef.current.length >= MAX_SCREENSHOTS) {
      setError(labels.feedback.screenshotLimitReached);
      return;
    }

    const entryId = crypto.randomUUID();

    // Add preview entry synchronously using object URL (no FileReader race)
    const preview = URL.createObjectURL(file);
    setScreenshots((prev) => [
      ...prev,
      { url: null, preview, uploading: true, id: entryId },
    ]);

    setError(null);

    try {
      const formData = new FormData();
      formData.append("screenshot", file);
      const res = await fetch("/api/feedback/screenshot", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        setError(labels.feedback.screenshotError);
        setScreenshots((prev) => prev.filter((s) => s.id !== entryId));
        URL.revokeObjectURL(preview);
        return;
      }

      const json = await res.json();
      setScreenshots((prev) =>
        prev.map((s) =>
          s.id === entryId ? { ...s, url: json.url, uploading: false } : s,
        ),
      );
    } catch {
      setError(labels.feedback.screenshotError);
      setScreenshots((prev) => prev.filter((s) => s.id !== entryId));
      URL.revokeObjectURL(preview);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  const handleScreenshotSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
    },
    [uploadFile],
  );

  // Drag-and-drop state
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && ALLOWED_TYPES.includes(file.type)) uploadFile(file);
    },
    [uploadFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  // Paste from clipboard
  useEffect(() => {
    if (!open || atLimit) return;
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (ALLOWED_TYPES.includes(item.type)) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            uploadFile(file);
            return;
          }
        }
      }
    }
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [open, atLimit, uploadFile]);

  const removeScreenshot = useCallback((id: string) => {
    setScreenshots((prev) => {
      const entry = prev.find((s) => s.id === id);
      if (entry?.preview.startsWith("blob:")) {
        URL.revokeObjectURL(entry.preview);
      }
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!message.trim()) {
      setError(labels.feedback.errorEmptyMessage);
      return;
    }

    setSubmitting(true);
    setError(null);

    const screenshotUrls = screenshots
      .map((s) => s.url)
      .filter((u): u is string => u !== null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          mood,
          page_url: window.location.href,
          user_agent: navigator.userAgent,
          screenshot_urls: screenshotUrls.length ? screenshotUrls : undefined,
          metadata: collectMetadata(),
        }),
      });

      if (!res.ok) {
        setError(labels.feedback.errorGeneric);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 2000);
    } catch {
      setError(labels.feedback.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }, [message, mood, screenshots, setOpen, resetForm]);

  const handleTranscription = useCallback((text: string) => {
    setMessage((prev) => (prev ? `${prev} ${text}` : text));
  }, []);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{labels.feedback.sheetTitle}</SheetTitle>
          <SheetDescription>
            {labels.feedback.sheetDescription}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 overflow-y-auto">
          {success ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
                <Check className="size-6" />
              </div>
              <p className="text-sm font-medium">
                {labels.feedback.successMessage}
              </p>
            </div>
          ) : (
            <>
              {/* Mood selector */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">
                  {labels.feedback.moodLabel}
                </label>
                <div className="flex gap-2">
                  {MOOD_VALUES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMood(mood === m ? null : m)}
                      className={`flex flex-col items-center gap-1 rounded-lg border px-4 py-2 text-sm transition-colors ${
                        mood === m
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                      aria-pressed={mood === m}
                    >
                      <span className="text-xl">{MOOD_EMOJIS[m]}</span>
                      <span className="text-muted-foreground text-xs">
                        {labels.feedback.moods[m]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message textarea */}
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={labels.feedback.messagePlaceholder}
                className="min-h-32 resize-none"
                enableMic
                onTranscriptionChange={handleTranscription}
                disabled={submitting}
              />

              {/* Screenshots */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">
                  {labels.feedback.screenshotLabel}
                </label>

                {/* Thumbnail grid */}
                {screenshots.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {screenshots.map((entry) => (
                      <div
                        key={entry.id}
                        className="relative rounded-lg border overflow-hidden aspect-video"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={entry.preview}
                          alt="Screenshot preview"
                          className="w-full h-full object-cover"
                        />
                        {entry.uploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                            <span className="text-xs text-muted-foreground">
                              {labels.feedback.screenshotUploading}
                            </span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeScreenshot(entry.id)}
                          className="absolute top-1 right-1 size-5 rounded-full bg-background/80 flex items-center justify-center hover:bg-background"
                          aria-label={labels.feedback.screenshotRemove}
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add button / drop zone */}
                {!atLimit && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`flex items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors ${
                      dragOver
                        ? "border-primary bg-primary/5 text-foreground"
                        : "hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    <ImagePlus className="size-4" />
                    {screenshots.length > 0
                      ? labels.feedback.screenshotAddMore
                      : labels.feedback.screenshotAdd}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleScreenshotSelect}
                />
              </div>

              {/* Debug context note */}
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Bug className="size-3 shrink-0" />
                {labels.feedback.debugContextLabel}
              </p>

              {/* Error message */}
              {error && <p className="text-destructive text-sm">{error}</p>}

              {/* Submit button */}
              <Button
                onClick={handleSubmit}
                disabled={submitting || anyUploading || !message.trim()}
              >
                {submitting
                  ? labels.feedback.submittingButton
                  : labels.feedback.submitButton}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
