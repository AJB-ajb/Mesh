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
import { MeshEditor } from "@/components/editor/mesh-editor";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { transcribeAudio } from "@/lib/transcribe";
import { useEditorSlashCommands } from "@/lib/hooks/use-editor-slash-commands";
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
import { meshLinkExtension } from "@/components/editor/extensions/mesh-link-plugin";
import { hiddenSyntaxExtension } from "@/components/editor/extensions/hidden-syntax-plugin";

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
  const editorRef = useRef<EditorView | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const { keyboardVisible } = useMobileKeyboard();

  // Slash commands via CodeMirror plugin
  const slash = useEditorSlashCommands();

  // CodeMirror extensions (stable reference)
  const [extensions] = useState(() => [
    slash.slashExtension,
    ...meshLinkExtension(),
    ...hiddenSyntaxExtension(),
  ]);

  const handleEditorReady = useCallback((view: EditorView) => {
    editorRef.current = view;
  }, []);

  // Warn on unsaved changes when navigating away
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (text.trim()) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
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
    if (!trimmed) {
      setError(labels.postingCreation.errorEmptyPosting);
      return;
    }

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
  }, [text, form, hiddenDetails, router]);

  const handleFormChange = (field: keyof PostingFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * Handle overlay result — all overlays now return plain mesh: link strings.
   */
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
      {/* eslint-disable react-hooks/refs -- editor ref access is intentional in this block */}
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

      {/* Slash command overlays */}
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
      {slash.activeOverlay === "template" && (
        <TemplateOverlay
          onInsert={(result) => {
            const templateText =
              typeof result === "string" ? result : result.display;
            setText(templateText);
            slash.closeOverlay();
          }}
          onClose={() => {
            slash.closeOverlay();
            editorRef.current?.focus();
          }}
        />
      )}

      {/* Text tools (auto-format, auto-clean) */}
      <TextTools text={text} onTextChange={setText} />

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
        // eslint-disable-next-line react-hooks/refs -- stable ref passed as prop
        editor={editorRef.current}
        visible={keyboardVisible && editorFocused}
      />
    </div>
  );
}
