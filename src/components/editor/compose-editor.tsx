"use client";

import { forwardRef, useImperativeHandle, useCallback } from "react";
import type { EditorView } from "@codemirror/view";

import { MeshEditor } from "./mesh-editor";
import { useComposeEditor } from "@/lib/hooks/use-compose-editor";
import { useMobileKeyboard } from "@/lib/hooks/use-mobile-keyboard";
import { SlashCommandMenu } from "@/components/shared/slash-command-menu";
import { MobileCommandSheet } from "@/components/shared/mobile-command-sheet";
import { SlashTriggerButton } from "@/components/shared/slash-trigger-button";
import { MarkdownToolbar } from "@/components/shared/markdown-toolbar";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { transcribeAudio } from "@/lib/transcribe";
import {
  TimePickerOverlay,
  LocationOverlay,
  SkillPickerOverlay,
  TemplateOverlay,
  type OverlayResult,
} from "@/components/shared/slash-command-overlays";
import type {
  EditorContext,
  SlashCommand,
} from "@/lib/slash-commands/registry";

// ---------------------------------------------------------------------------
// Context-specific feature config
// ---------------------------------------------------------------------------

interface ContextConfig {
  enterSends: boolean;
  slashMenu: boolean;
  mobileSheet: boolean;
  markdownToolbar: boolean;
  speechInput: boolean;
  sharedOverlays: Set<string>;
  minHeight: string;
}

const CONTEXT_CONFIG: Record<EditorContext, ContextConfig> = {
  message: {
    enterSends: true,
    slashMenu: true,
    mobileSheet: false,
    markdownToolbar: false,
    speechInput: false,
    sharedOverlays: new Set(["time", "location"]),
    minHeight: "unset",
  },
  posting: {
    enterSends: false,
    slashMenu: true,
    mobileSheet: true,
    markdownToolbar: true,
    speechInput: true,
    sharedOverlays: new Set(["time", "location", "skills", "template"]),
    minHeight: "200px",
  },
  "state-text": {
    enterSends: false,
    slashMenu: true,
    mobileSheet: false,
    markdownToolbar: true,
    speechInput: false,
    sharedOverlays: new Set(),
    minHeight: "100px",
  },
  profile: {
    enterSends: false,
    slashMenu: true,
    mobileSheet: true,
    markdownToolbar: true,
    speechInput: true,
    sharedOverlays: new Set(["time", "location", "skills"]),
    minHeight: "200px",
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ComposeEditorProps {
  context: EditorContext;
  content: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  commands?: SlashCommand[];
  onContextOverlay?: (name: string) => void;
  onImmediateCommand?: (name: string) => void;
  onTypingChange?: (isTyping: boolean) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
}

export interface ComposeEditorHandle {
  editorView: EditorView | null;
  activeOverlay: string | null;
  closeOverlay: () => void;
  focus: () => void;
  insertAtCursor: (text: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ComposeEditor = forwardRef<
  ComposeEditorHandle,
  ComposeEditorProps
>(function ComposeEditor(
  {
    context,
    content,
    onChange,
    onSubmit,
    placeholder,
    className,
    autoFocus = false,
    onContextOverlay,
    onImmediateCommand,
    onTypingChange,
    onFocus,
    onBlur,
  },
  ref,
) {
  const config = CONTEXT_CONFIG[context];
  const { keyboardVisible } = useMobileKeyboard();

  const editor = useComposeEditor({
    context,
    content,
    onChange,
    onSubmit,
    onContextOverlay,
    onImmediateCommand,
  });

  // Expose handle to parent
  useImperativeHandle(
    ref,
    () => ({
      get editorView() {
        return editor.editorRef.current;
      },
      activeOverlay: editor.activeOverlay,
      closeOverlay: editor.closeOverlay,
      focus: () => editor.editorRef.current?.focus(),
      insertAtCursor: editor.insertAtCursor,
    }),
    [
      editor.activeOverlay,
      editor.closeOverlay,
      editor.insertAtCursor,
      editor.editorRef,
    ],
  );

  const handleFocus = useCallback(() => {
    editor.setEditorFocused(true);
    onFocus?.();
  }, [editor, onFocus]);

  const handleBlur = useCallback(() => {
    editor.setEditorFocused(false);
    onTypingChange?.(false);
    onBlur?.();
  }, [editor, onTypingChange, onBlur]);

  const handleChange = useCallback(
    (text: string) => {
      onChange(text);
      onTypingChange?.(text.length > 0);
    },
    [onChange, onTypingChange],
  );

  // Overlay result handler (shared overlays insert text)
  const handleOverlayResult = useCallback(
    (result: string | OverlayResult) => {
      const text = typeof result === "string" ? result : result.display;
      editor.handleOverlayResult(text);
    },
    [editor],
  );

  // Template is special — it replaces the whole content
  const handleTemplateResult = useCallback(
    (result: string | OverlayResult) => {
      const text = typeof result === "string" ? result : result.display;
      onChange(text);
      editor.closeOverlay();
    },
    [onChange, editor],
  );

  return (
    <>
      {/* Editor wrapper */}
      <div className="relative">
        <MeshEditor
          content={content}
          placeholder={placeholder}
          onChange={handleChange}
          onSubmit={onSubmit}
          autoFocus={autoFocus}
          extensions={editor.extensions}
          onEditorReady={editor.handleEditorReady}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={className}
        />
        {config.speechInput && (
          <SpeechInput
            className="absolute right-1.5 top-1.5 h-7 w-7 shrink-0 p-0"
            size="icon"
            variant="ghost"
            type="button"
            onAudioRecorded={transcribeAudio}
            onTranscriptionChange={(transcript) => {
              editor.insertAtCursor(transcript);
            }}
          />
        )}
      </div>

      {/* Slash command menu (desktop) */}
      {config.slashMenu &&
        editor.slash.menuState.isOpen &&
        editor.editorRef.current && (
          <SlashCommandMenu
            commands={editor.slash.menuState.commands}
            selectedIndex={editor.slash.menuState.selectedIndex}
            position={(() => {
              const coords = editor.editorRef.current!.coordsAtPos(
                editor.slash.menuState.from,
              );
              if (!coords) return { top: 0, left: 0 };
              return { top: coords.bottom + 4, left: coords.left };
            })()}
            onSelect={(cmd) =>
              editor.slash.selectCommand(editor.editorRef.current!, cmd)
            }
            onClose={() => editor.slash.closeMenu(editor.editorRef.current)}
          />
        )}

      {/* Shared overlays */}
      {config.sharedOverlays.has("time") && editor.activeOverlay === "time" && (
        <TimePickerOverlay
          onInsert={handleOverlayResult}
          onClose={editor.closeOverlay}
        />
      )}
      {config.sharedOverlays.has("location") &&
        editor.activeOverlay === "location" && (
          <LocationOverlay
            onInsert={handleOverlayResult}
            onClose={editor.closeOverlay}
          />
        )}
      {config.sharedOverlays.has("skills") &&
        editor.activeOverlay === "skills" && (
          <SkillPickerOverlay
            onInsert={handleOverlayResult}
            onClose={editor.closeOverlay}
          />
        )}
      {config.sharedOverlays.has("template") &&
        editor.activeOverlay === "template" && (
          <TemplateOverlay
            onInsert={handleTemplateResult}
            onClose={editor.closeOverlay}
          />
        )}

      {/* Mobile markdown toolbar */}
      {config.markdownToolbar && (
        <MarkdownToolbar
          editor={editor.editorRef.current}
          visible={keyboardVisible && editor.editorFocused}
        />
      )}

      {/* Mobile command sheet + trigger */}
      {config.mobileSheet && (
        <>
          <SlashTriggerButton onClick={() => editor.setMobileSheetOpen(true)} />
          <MobileCommandSheet
            open={editor.mobileSheetOpen}
            commands={editor.slash.contextCommands}
            onSelect={(cmd) => {
              editor.setMobileSheetOpen(false);
              const view = editor.editorRef.current;
              if (view) {
                editor.slash.selectCommand(view, cmd);
              }
            }}
            onClose={() => editor.setMobileSheetOpen(false)}
          />
        </>
      )}
    </>
  );
});
