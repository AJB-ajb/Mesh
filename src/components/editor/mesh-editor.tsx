"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import {
  EditorView,
  placeholder as cmPlaceholder,
  keymap,
} from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { cn } from "@/lib/utils";
import { markdownTheme } from "./extensions/markdown-theme";
import type { Extension } from "@codemirror/state";

export interface MeshEditorProps {
  content?: string;
  placeholder?: string;
  onChange?: (markdown: string) => void;
  onSubmit?: () => void;
  className?: string;
  autoFocus?: boolean;
  extensions?: Extension[];
  onEditorReady?: (view: EditorView) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const MeshEditor = memo(function MeshEditor({
  content = "",
  placeholder,
  onChange,
  onSubmit,
  className,
  autoFocus = false,
  extensions: extraExtensions = [],
  onEditorReady,
  onFocus,
  onBlur,
}: MeshEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isSyncingRef = useRef(false);

  // Stable callback refs (avoid re-creating the editor on callback changes)
  const onChangeRef = useRef(onChange);
  const onSubmitRef = useRef(onSubmit);
  const onEditorReadyRef = useRef(onEditorReady);
  const onFocusRef = useRef(onFocus);
  const onBlurRef = useRef(onBlur);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);
  useEffect(() => {
    onEditorReadyRef.current = onEditorReady;
  }, [onEditorReady]);
  useEffect(() => {
    onFocusRef.current = onFocus;
  }, [onFocus]);
  useEffect(() => {
    onBlurRef.current = onBlur;
  }, [onBlur]);

  // Memoize the extra extensions array identity so the effect below doesn't
  // re-fire on every render when the caller passes a literal `[]`.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- shallow-compare array items
  const stableExtensions = useMemo(() => extraExtensions, extraExtensions);

  // Capture the initial content for the EditorView. We only read this on
  // mount; subsequent changes are synced via the separate effect below.
  const initialContentRef = useRef(content);

  // Create / destroy the EditorView
  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    const submitKeymap = keymap.of([
      {
        key: "Mod-Enter",
        run: () => {
          onSubmitRef.current?.();
          return true;
        },
      },
    ]);

    const focusBlurHandlers = EditorView.domEventHandlers({
      focus: () => {
        onFocusRef.current?.();
      },
      blur: () => {
        onBlurRef.current?.();
      },
    });

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isSyncingRef.current) {
        const md = update.state.doc.toString();
        onChangeRef.current?.(md);
      }
    });

    const extensions: Extension[] = [
      markdown(),
      markdownTheme,
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      submitKeymap,
      focusBlurHandlers,
      updateListener,
      ...(placeholder ? [cmPlaceholder(placeholder)] : []),
      ...stableExtensions,
    ];

    const state = EditorState.create({
      doc: initialContentRef.current,
      extensions,
    });

    const view = new EditorView({ state, parent });
    viewRef.current = view;

    // Defer focus and onEditorReady to escape React's commit phase.
    // Calling view.focus() synchronously inside useEffect triggers DOM
    // focus events that cascade into setState (setEditorFocused), and
    // calling onEditorReady triggers setEditorInstance — both cause
    // "Should not already be working" errors in React 19.
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (autoFocus) {
        view.focus();
      }
      onEditorReadyRef.current?.(view);
    });

    return () => {
      cancelled = true;
      view.destroy();
      viewRef.current = null;
    };
  }, [placeholder, autoFocus, stableExtensions]);

  // Sync external content changes (e.g. from template overlay, text tools)
  const lastExternalContent = useRef(content);
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (content !== lastExternalContent.current) {
      lastExternalContent.current = content;
      const currentDoc = view.state.doc.toString();
      if (content !== currentDoc) {
        isSyncingRef.current = true;
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: content },
        });
        isSyncingRef.current = false;
      }
    }
  }, [content]);

  return <div ref={containerRef} className={cn("relative", className)} />;
});
