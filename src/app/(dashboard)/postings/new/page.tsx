"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown, X } from "lucide-react";
import { toast } from "sonner";
import type { EditorView } from "@codemirror/view";

import { Button } from "@/components/ui/button";
import { labels } from "@/lib/labels";
import {
  PostingFormCard,
  defaultFormState,
} from "@/components/posting/posting-form-card";
import { TextTools } from "@/components/shared/text-tools";
import { MeshEditor } from "@/components/editor/mesh-editor";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { transcribeAudio } from "@/lib/transcribe";
import { useEditorSlashCommands } from "@/lib/hooks/use-editor-slash-commands";
import { useMobileKeyboard } from "@/lib/hooks/use-mobile-keyboard";
import { SlashCommandMenu } from "@/components/shared/slash-command-menu";
import { MarkdownToolbar } from "@/components/shared/markdown-toolbar";
import {
  TimePickerOverlay,
  LocationOverlay,
  SkillPickerOverlay,
  TemplateOverlay,
  type OverlayResult,
} from "@/components/shared/slash-command-overlays";
import {
  SettingPicker,
  type SettingOption,
} from "@/components/shared/setting-picker";
import {
  InlineInvitePicker,
  type InvitedUser,
} from "@/components/shared/inline-invite-picker";
import { autoFormat, autoClean } from "@/lib/text-tools-api";
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

// ---------------------------------------------------------------------------
// Setting picker options
// ---------------------------------------------------------------------------

const VISIBILITY_OPTIONS: SettingOption[] = [
  { label: "Public", value: "public" },
  { label: "Connections only", value: "connections" },
];

const EXPIRE_OPTIONS: SettingOption[] = [
  { label: "1 day", value: "1" },
  { label: "3 days", value: "3" },
  { label: "1 week", value: "7" },
  { label: "2 weeks", value: "14" },
];

const AUTOACCEPT_OPTIONS: SettingOption[] = [
  { label: "On", value: "true" },
  { label: "Off", value: "false" },
];

/** Convert a number of days from now to an ISO date string. */
function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function NewPostingPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [form, setForm] = useState<PostingFormState>(defaultFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [editorFocused, setEditorFocused] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([]);
  const editorRef = useRef<EditorView | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const { keyboardVisible } = useMobileKeyboard();

  // Handle immediate commands (/format, /clean)
  const handleImmediateCommand = useCallback(
    async (name: string) => {
      if (!text.trim()) return;
      try {
        if (name === "format") {
          const { result, changed } = await autoFormat(text);
          if (changed) {
            setText(result);
            toast.success(labels.textTools.appliedFormat);
          } else {
            toast(labels.textTools.noChanges);
          }
        } else if (name === "clean") {
          const { result, changed } = await autoClean(text);
          if (changed) {
            setText(result);
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
    [text],
  );

  // Slash commands via CodeMirror plugin
  const slash = useEditorSlashCommands({
    context: "posting",
    onImmediateCommand: handleImmediateCommand,
  });

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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsSaving(false);
        setError(data.error?.message || labels.postingCreation.errorGeneric);
        return;
      }

      const postingId = data.posting.id;

      // Fire-and-forget: create invites if any users were selected
      if (invitedUsers.length > 0) {
        fetch("/api/friend-ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            posting_id: postingId,
            ordered_friend_list: invitedUsers.map((u) => u.user_id),
            invite_mode: "parallel",
          }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.friend_ask?.id) {
              fetch(`/api/friend-ask/${d.friend_ask.id}/send`, {
                method: "POST",
              });
            }
          })
          .catch(() => {
            // Invite creation is best-effort
          });
      }

      setIsSaving(false);
      router.push(`/postings/${postingId}?extraction=pending`);
    } catch {
      setIsSaving(false);
      setError(labels.postingCreation.errorGeneric);
    }
  }, [text, form, router, invitedUsers]);

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

  /** Handle setting selection from SettingPicker */
  const handleSettingSelect = useCallback(
    (key: string, value: string) => {
      if (key === "visibility") {
        setForm((prev) => ({ ...prev, visibility: value }));
        const label = VISIBILITY_OPTIONS.find((o) => o.value === value)?.label;
        toast.success(
          labels.slashCommands.settingApplied.visibility(label ?? value),
        );
      } else if (key === "expire") {
        setForm((prev) => ({ ...prev, expiresAt: daysFromNow(Number(value)) }));
        const label = EXPIRE_OPTIONS.find((o) => o.value === value)?.label;
        toast.success(
          labels.slashCommands.settingApplied.expire(label ?? value),
        );
      } else if (key === "autoaccept") {
        setForm((prev) => ({ ...prev, autoAccept: value }));
        toast.success(
          labels.slashCommands.settingApplied.autoaccept(
            value === "true" ? "enabled" : "disabled",
          ),
        );
      }
      slash.closeOverlay();
      editorRef.current?.focus();
    },
    [slash],
  );

  /** Remove an invited user chip */
  const removeInvitedUser = useCallback((userId: string) => {
    setInvitedUsers((prev) => prev.filter((u) => u.user_id !== userId));
  }, []);

  /** Get picker position from editor cursor */
  const getPickerPosition = () => {
    const view = editorRef.current;
    if (!view) return { top: 200, left: 100 };
    const head = view.state.selection.main.head;
    const coords = view.coordsAtPos(head);
    if (!coords) return { top: 200, left: 100 };
    return { top: coords.bottom + 4, left: coords.left };
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-20">
      {/* Back link */}
      <Link
        href="/posts"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {labels.postingCreation.backButton}
      </Link>

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

      {/* Invited user chips */}
      {invitedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {invitedUsers.map((user) => (
            <span
              key={user.user_id}
              className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium"
            >
              {user.full_name}
              <button
                type="button"
                onClick={() => removeInvitedUser(user.user_id)}
                className="rounded-full p-0.5 hover:bg-accent-foreground/10"
                aria-label={`Remove ${user.full_name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

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

      {/* Setting pickers */}
      {/* eslint-disable react-hooks/refs -- editor ref access for picker position */}
      {slash.activeOverlay === "visibility" && (
        <SettingPicker
          title="Visibility"
          options={VISIBILITY_OPTIONS}
          currentValue={form.visibility}
          position={getPickerPosition()}
          onSelect={(v) => handleSettingSelect("visibility", v)}
          onClose={() => {
            slash.closeOverlay();
            editorRef.current?.focus();
          }}
        />
      )}
      {slash.activeOverlay === "expire" && (
        <SettingPicker
          title="Expiry"
          options={EXPIRE_OPTIONS}
          currentValue={undefined}
          position={getPickerPosition()}
          onSelect={(v) => handleSettingSelect("expire", v)}
          onClose={() => {
            slash.closeOverlay();
            editorRef.current?.focus();
          }}
        />
      )}
      {slash.activeOverlay === "autoaccept" && (
        <SettingPicker
          title="Auto-accept"
          options={AUTOACCEPT_OPTIONS}
          currentValue={form.autoAccept}
          position={getPickerPosition()}
          onSelect={(v) => handleSettingSelect("autoaccept", v)}
          onClose={() => {
            slash.closeOverlay();
            editorRef.current?.focus();
          }}
        />
      )}

      {/* Invite picker */}
      {slash.activeOverlay === "invite" && (
        <InlineInvitePicker
          position={getPickerPosition()}
          selected={invitedUsers}
          onDone={(users) => {
            setInvitedUsers(users);
            slash.closeOverlay();
            editorRef.current?.focus();
          }}
          onClose={() => {
            slash.closeOverlay();
            editorRef.current?.focus();
          }}
        />
      )}
      {/* eslint-enable react-hooks/refs */}

      {/* Compact toolbar: TextTools + Post button in one row */}
      <div className="flex items-center justify-between">
        <TextTools text={text} onTextChange={setText} />
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
