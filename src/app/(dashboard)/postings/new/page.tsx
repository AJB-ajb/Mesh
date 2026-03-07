"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { EditorView } from "@codemirror/view";

import { Button } from "@/components/ui/button";
import { labels } from "@/lib/labels";
import { TextTools } from "@/components/shared/text-tools";
import { MeshEditor } from "@/components/editor/mesh-editor";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { transcribeAudio } from "@/lib/transcribe";
import { useEditorSlashCommands } from "@/lib/hooks/use-editor-slash-commands";
import { useMobileKeyboard } from "@/lib/hooks/use-mobile-keyboard";
import { SlashCommandMenu } from "@/components/shared/slash-command-menu";
import { MobileCommandSheet } from "@/components/shared/mobile-command-sheet";
import { SlashTriggerButton } from "@/components/shared/slash-trigger-button";
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
import type { InvitedUser } from "@/components/shared/inline-invite-picker";
import { InvitePickerSheet } from "@/components/posting/invite-picker-sheet";
import {
  PostingContextBar,
  type ContextBarState,
} from "@/components/posting/posting-context-bar";
import { autoFormat, autoClean } from "@/lib/text-tools-api";
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
// Setting picker options (for slash commands)
// ---------------------------------------------------------------------------

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

function defaultExpiresAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
}

export default function NewPostingPage() {
  return (
    <Suspense>
      <NewPostingPageInner />
    </Suspense>
  );
}

/** Fetch parent posting title for display */
async function fetchParentTitle(key: string): Promise<string | null> {
  const id = key.split("/").pop();
  const res = await fetch(`/api/postings/${id}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.posting?.title ?? null;
}

function NewPostingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parentId = searchParams.get("parent") ?? "";
  const [text, setText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorFocused, setEditorFocused] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const editorRef = useRef<EditorView | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const { keyboardVisible } = useMobileKeyboard();

  // Context bar state (replaces PostingFormCard)
  const [contextBar, setContextBar] = useState<ContextBarState>({
    parentPostingId: parentId,
    parentPostingTitle: null,
    parentMemberCount: null,
    invitedUsers: [],
    linkToken: null,
    inDiscover: !parentId, // default: Discover on for top-level, off for child postings
    settings: {
      teamSizeMin: "1",
      teamSizeMax: "5",
      expiresAt: defaultExpiresAt(),
      autoAccept: false,
      sequentialCount: 1,
    },
  });

  // Fetch parent posting title when creating a child posting
  const { data: parentTitle } = useSWR(
    parentId ? `parent-title/${parentId}` : null,
    fetchParentTitle,
  );

  // Sync parent title into context bar state
  useEffect(() => {
    if (parentTitle && parentTitle !== contextBar.parentPostingTitle) {
      setContextBar((prev) => ({
        ...prev,
        parentPostingTitle: parentTitle,
      }));
    }
  }, [parentTitle, contextBar.parentPostingTitle]);

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
          description: trimmed,
          sourceText: trimmed,
          teamSizeMin: contextBar.settings.teamSizeMin,
          teamSizeMax: contextBar.settings.teamSizeMax,
          lookingFor: contextBar.settings.teamSizeMax,
          expiresAt: contextBar.settings.expiresAt,
          autoAccept: contextBar.settings.autoAccept,
          parentPostingId: contextBar.parentPostingId || undefined,
          inDiscover: contextBar.inDiscover,
          linkToken: contextBar.linkToken,
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
      if (contextBar.invitedUsers.length > 0) {
        fetch("/api/friend-ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            posting_id: postingId,
            ordered_friend_list: contextBar.invitedUsers.map((u) => u.user_id),
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
  }, [text, contextBar, router]);

  /** Handle overlay result — all overlays return mesh: link strings. */
  const handleOverlayResult = useCallback(
    (result: string | OverlayResult) => {
      const insertText = typeof result === "string" ? result : result.display;
      const view = editorRef.current;
      if (view) {
        insertAtCursor(view, insertText);
      }
      slash.closeOverlay();
      editorRef.current?.focus();
    },
    [slash],
  );

  /** Handle setting selection from SettingPicker (via slash commands) */
  const handleSettingSelect = useCallback(
    (key: string, value: string) => {
      if (key === "expire") {
        setContextBar((prev) => ({
          ...prev,
          settings: {
            ...prev.settings,
            expiresAt: daysFromNow(Number(value)),
          },
        }));
        const label = EXPIRE_OPTIONS.find((o) => o.value === value)?.label;
        toast.success(
          labels.slashCommands.settingApplied.expire(label ?? value),
        );
      } else if (key === "autoaccept") {
        setContextBar((prev) => ({
          ...prev,
          settings: { ...prev.settings, autoAccept: value === "true" },
        }));
        toast.success(
          labels.slashCommands.settingApplied.autoaccept(
            value === "true" ? "enabled" : "disabled",
          ),
        );
      } else if (key === "visibility") {
        setContextBar((prev) => ({
          ...prev,
          inDiscover: value === "public",
        }));
        toast.success(labels.slashCommands.settingApplied.visibility(value));
      }
      slash.closeOverlay();
      editorRef.current?.focus();
    },
    [slash],
  );

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
        href={parentId ? `/postings/${parentId}` : "/posts"}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {parentId ? "Back to group" : labels.postingCreation.backButton}
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

      {/* Slash command menu */}
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

      {/* Setting pickers (from slash commands) */}
      {/* eslint-disable react-hooks/refs -- editor ref access for picker position */}
      {slash.activeOverlay === "visibility" && (
        <SettingPicker
          title="Visibility"
          options={[
            { label: "Public", value: "public" },
            { label: "Connections only", value: "connections" },
          ]}
          currentValue={contextBar.inDiscover ? "public" : "connections"}
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
          currentValue={contextBar.settings.autoAccept ? "true" : "false"}
          position={getPickerPosition()}
          onSelect={(v) => handleSettingSelect("autoaccept", v)}
          onClose={() => {
            slash.closeOverlay();
            editorRef.current?.focus();
          }}
        />
      )}

      {/* /invite command opens invite picker sheet */}
      <InvitePickerSheet
        open={slash.activeOverlay === "invite"}
        onOpenChange={(open) => {
          if (!open) {
            slash.closeOverlay();
            editorRef.current?.focus();
          }
        }}
        selectedConnections={contextBar.invitedUsers.map((u) => ({
          user_id: u.user_id,
          full_name: u.full_name,
        }))}
        onChange={(connections) => {
          setContextBar((prev) => ({
            ...prev,
            invitedUsers: connections.map((c) => ({
              user_id: c.user_id,
              full_name: c.full_name,
            })),
          }));
        }}
        currentUserId=""
      />
      {/* eslint-enable react-hooks/refs */}

      {/* Compact toolbar: TextTools + Post button */}
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

      {/* Context bar (replaces PostingFormCard) */}
      <PostingContextBar state={contextBar} onChange={setContextBar} />

      {/* Mobile markdown toolbar */}
      <MarkdownToolbar
        // eslint-disable-next-line react-hooks/refs -- stable ref passed as prop
        editor={editorRef.current}
        visible={keyboardVisible && editorFocused}
      />

      {/* Mobile command sheet + trigger button */}
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
