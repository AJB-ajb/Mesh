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
import { useMobileKeyboard } from "@/lib/hooks/use-mobile-keyboard";
import type { PostingFormState } from "@/components/posting/posting-form-card";

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

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 200)}px`;
  }, [text]);

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

  // Cmd/Ctrl+Enter shortcut
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleFormChange = (field: keyof PostingFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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

      {/* Hero textarea */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setTextareaFocused(true)}
        onBlur={() => setTextareaFocused(false)}
        placeholder={labels.postingCreation.textPlaceholder}
        rows={8}
        className="flex w-full rounded-lg border border-input bg-background px-4 py-3 text-lg leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
        autoFocus
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
