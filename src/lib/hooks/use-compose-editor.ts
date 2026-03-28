"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import type { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";

import {
  useEditorSlashCommands,
  type UseEditorSlashCommandsReturn,
} from "./use-editor-slash-commands";
import { meshLinkExtension } from "@/components/editor/extensions/mesh-link-plugin";
import { hiddenSyntaxExtension } from "@/components/editor/extensions/hidden-syntax-plugin";
import { enterToSend } from "@/components/editor/extensions/enter-to-send";
import { autoGrow } from "@/components/editor/extensions/auto-grow";
import type {
  EditorContext,
  SlashCommand,
} from "@/lib/slash-commands/registry";

// ---------------------------------------------------------------------------
// Shared overlays that ComposeEditor renders internally
// ---------------------------------------------------------------------------

const SHARED_OVERLAYS = new Set(["time", "location", "skills", "template"]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseComposeEditorOptions {
  context: EditorContext;
  content: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  commands?: SlashCommand[];
  onContextOverlay?: (name: string) => void;
  onImmediateCommand?: (name: string) => void;
}

export interface UseComposeEditorReturn {
  editorRef: React.MutableRefObject<EditorView | null>;
  extensions: Extension[];
  handleEditorReady: (view: EditorView) => void;
  editorFocused: boolean;
  setEditorFocused: (v: boolean) => void;
  slash: UseEditorSlashCommandsReturn;
  mobileSheetOpen: boolean;
  setMobileSheetOpen: (v: boolean) => void;
  activeOverlay: string | null;
  closeOverlay: () => void;
  handleOverlayResult: (text: string) => void;
  insertAtCursor: (text: string) => void;
  getPickerPosition: () => { top: number; left: number };
}

// ---------------------------------------------------------------------------
// Context-specific extension assembly
// ---------------------------------------------------------------------------

function buildExtensions(
  context: EditorContext,
  slashExtension: Extension,
  onSubmit: () => void,
): Extension[] {
  const exts: Extension[] = [slashExtension];

  if (context === "posting" || context === "profile") {
    exts.push(...meshLinkExtension(), ...hiddenSyntaxExtension());
  }

  if (context === "message") {
    exts.push(enterToSend(onSubmit), autoGrow(150));
  }

  return exts;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useComposeEditor(
  options: UseComposeEditorOptions,
): UseComposeEditorReturn {
  const { context, onSubmit, onContextOverlay, onImmediateCommand } = options;

  const editorRef = useRef<EditorView | null>(null);
  const [editorFocused, setEditorFocused] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Slash commands
  const slash = useEditorSlashCommands({
    context,
    onImmediateCommand,
  });

  // Rebuild extensions when context, slash extension, or onSubmit changes.
  // enterToSend uses a Facet so CM picks up the new callback via reconfigure.
  const extensions = useMemo(
    () => buildExtensions(context, slash.slashExtension, onSubmit),
    [context, slash.slashExtension, onSubmit],
  );

  const handleEditorReady = useCallback((view: EditorView) => {
    editorRef.current = view;
  }, []);

  // Overlay routing: shared overlays stay in ComposeEditor, others delegated
  const activeOverlay = slash.activeOverlay;

  const closeOverlay = useCallback(() => {
    slash.closeOverlay();
    editorRef.current?.focus();
  }, [slash]);

  // Route overlay opens — notify parent for context-specific overlays
  const onContextOverlayRef = useRef(onContextOverlay);
  useEffect(() => {
    onContextOverlayRef.current = onContextOverlay;
  }, [onContextOverlay]);

  useEffect(() => {
    if (activeOverlay && !SHARED_OVERLAYS.has(activeOverlay)) {
      onContextOverlayRef.current?.(activeOverlay);
    }
  }, [activeOverlay]);

  const handleOverlayResult = useCallback(
    (text: string) => {
      const view = editorRef.current;
      if (view) {
        const pos = view.state.selection.main.head;
        view.dispatch({
          changes: { from: pos, to: pos, insert: text },
        });
        view.focus();
      }
      slash.closeOverlay();
    },
    [slash],
  );

  const insertAtCursor = useCallback((text: string) => {
    const view = editorRef.current;
    if (!view) return;
    const pos = view.state.selection.main.head;
    view.dispatch({
      changes: { from: pos, to: pos, insert: text },
    });
    view.focus();
  }, []);

  const getPickerPosition = useCallback(() => {
    const view = editorRef.current;
    if (!view) return { top: 200, left: 100 };
    const head = view.state.selection.main.head;
    const coords = view.coordsAtPos(head);
    if (!coords) return { top: 200, left: 100 };
    return { top: coords.bottom + 4, left: coords.left };
  }, []);

  return {
    editorRef,
    extensions,
    handleEditorReady,
    editorFocused,
    setEditorFocused,
    slash,
    mobileSheetOpen,
    setMobileSheetOpen,
    activeOverlay,
    closeOverlay,
    handleOverlayResult,
    insertAtCursor,
    getPickerPosition,
  };
}
