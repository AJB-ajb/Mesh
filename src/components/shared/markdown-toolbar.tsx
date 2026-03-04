"use client";

import { useCallback } from "react";
import type { EditorView } from "@codemirror/view";
import { Button } from "@/components/ui/button";
import { labels } from "@/lib/labels";

// ---------------------------------------------------------------------------
// Text manipulation helpers (pure functions — no ref access)
// ---------------------------------------------------------------------------

function insertAtCursor(textarea: HTMLTextAreaElement, text: string): string {
  const { selectionStart, selectionEnd, value } = textarea;
  return value.slice(0, selectionStart) + text + value.slice(selectionEnd);
}

function wrapSelection(
  textarea: HTMLTextAreaElement,
  prefix: string,
  suffix: string,
): string {
  const { selectionStart, selectionEnd, value } = textarea;
  const selected = value.slice(selectionStart, selectionEnd);
  if (selected) {
    return (
      value.slice(0, selectionStart) +
      prefix +
      selected +
      suffix +
      value.slice(selectionEnd)
    );
  }
  return (
    value.slice(0, selectionStart) + prefix + suffix + value.slice(selectionEnd)
  );
}

function insertAtLineStart(
  textarea: HTMLTextAreaElement,
  prefix: string,
): string {
  const { selectionStart, value } = textarea;
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  return value.slice(0, lineStart) + prefix + value.slice(lineStart);
}

// ---------------------------------------------------------------------------
// Action types
// ---------------------------------------------------------------------------

type ToolbarAction = "slash" | "heading" | "bold" | "list" | "code";

function executeAction(
  textarea: HTMLTextAreaElement,
  action: ToolbarAction,
): { newValue: string; cursorPos: number } {
  switch (action) {
    case "slash": {
      const newValue = insertAtCursor(textarea, "/");
      return { newValue, cursorPos: textarea.selectionStart + 1 };
    }
    case "heading": {
      const newValue = insertAtLineStart(textarea, "## ");
      return { newValue, cursorPos: textarea.selectionStart + 3 };
    }
    case "bold": {
      const { selectionStart, selectionEnd } = textarea;
      const selected = textarea.value.slice(selectionStart, selectionEnd);
      const newValue = wrapSelection(textarea, "**", "**");
      const cursorPos = selected
        ? selectionStart + 2 + selected.length + 2
        : selectionStart + 2;
      return { newValue, cursorPos };
    }
    case "list": {
      const newValue = insertAtLineStart(textarea, "- ");
      return { newValue, cursorPos: textarea.selectionStart + 2 };
    }
    case "code": {
      const { selectionStart, selectionEnd } = textarea;
      const selected = textarea.value.slice(selectionStart, selectionEnd);
      const newValue = wrapSelection(textarea, "`", "`");
      const cursorPos = selected
        ? selectionStart + 1 + selected.length + 1
        : selectionStart + 1;
      return { newValue, cursorPos };
    }
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MarkdownToolbarProps {
  /** Legacy textarea mode */
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  /** CodeMirror editor mode — takes precedence over textareaRef */
  editor?: EditorView | null;
  onChange?: (newValue: string) => void;
  visible: boolean;
}

// ---------------------------------------------------------------------------
// Editor-mode action executor (CodeMirror)
// ---------------------------------------------------------------------------

function executeEditorAction(view: EditorView, action: ToolbarAction): void {
  const { head } = view.state.selection.main;
  const doc = view.state.doc;

  switch (action) {
    case "slash": {
      view.dispatch({
        changes: { from: head, to: head, insert: "/" },
        selection: { anchor: head + 1 },
      });
      break;
    }
    case "heading": {
      const line = doc.lineAt(head);
      view.dispatch({
        changes: { from: line.from, to: line.from, insert: "## " },
        selection: { anchor: head + 3 },
      });
      break;
    }
    case "bold": {
      const { from, to } = view.state.selection.main;
      const selected = doc.sliceString(from, to);
      if (selected) {
        view.dispatch({
          changes: { from, to, insert: `**${selected}**` },
          selection: { anchor: from + 2, head: from + 2 + selected.length },
        });
      } else {
        view.dispatch({
          changes: { from: head, to: head, insert: "****" },
          selection: { anchor: head + 2 },
        });
      }
      break;
    }
    case "list": {
      const line = doc.lineAt(head);
      view.dispatch({
        changes: { from: line.from, to: line.from, insert: "- " },
        selection: { anchor: head + 2 },
      });
      break;
    }
    case "code": {
      const { from, to } = view.state.selection.main;
      const selected = doc.sliceString(from, to);
      if (selected) {
        view.dispatch({
          changes: { from, to, insert: `\`${selected}\`` },
          selection: { anchor: from + 1, head: from + 1 + selected.length },
        });
      } else {
        view.dispatch({
          changes: { from: head, to: head, insert: "``" },
          selection: { anchor: head + 1 },
        });
      }
      break;
    }
  }
  view.focus();
}

// ---------------------------------------------------------------------------
// Individual button (isolates the ref access to the event handler)
// ---------------------------------------------------------------------------

function ToolbarButton({
  textareaRef,
  editor,
  onChange,
  action,
  label,
  title,
}: {
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  editor?: EditorView | null;
  onChange?: (newValue: string) => void;
  action: ToolbarAction;
  label: string;
  title: string;
}) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      // Editor mode
      if (editor) {
        executeEditorAction(editor, action);
        return;
      }

      // Legacy textarea mode
      const textarea = textareaRef?.current;
      if (!textarea || !onChange) return;

      const result = executeAction(textarea, action);
      onChange(result.newValue);

      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(result.cursorPos, result.cursorPos);
      });
    },
    [textareaRef, editor, onChange, action],
  );

  return (
    <Button
      type="button"
      variant="ghost"
      className="min-h-[44px] min-w-[44px] flex-1 font-mono text-base"
      title={title}
      onMouseDown={handleMouseDown}
    >
      {label}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MarkdownToolbar({
  textareaRef,
  editor,
  onChange,
  visible,
}: MarkdownToolbarProps) {
  const l = labels.markdownToolbar;

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-border bg-background px-2 py-1 md:hidden"
      role="toolbar"
      aria-label="Markdown formatting"
    >
      <ToolbarButton
        textareaRef={textareaRef}
        editor={editor}
        onChange={onChange}
        action="slash"
        label={l.slashCommand}
        title={l.slashTooltip}
      />
      <ToolbarButton
        textareaRef={textareaRef}
        editor={editor}
        onChange={onChange}
        action="heading"
        label={l.heading}
        title={l.headingTooltip}
      />
      <ToolbarButton
        textareaRef={textareaRef}
        editor={editor}
        onChange={onChange}
        action="bold"
        label={l.bold}
        title={l.boldTooltip}
      />
      <ToolbarButton
        textareaRef={textareaRef}
        editor={editor}
        onChange={onChange}
        action="list"
        label={l.list}
        title={l.listTooltip}
      />
      <ToolbarButton
        textareaRef={textareaRef}
        editor={editor}
        onChange={onChange}
        action="code"
        label={l.code}
        title={l.codeTooltip}
      />
    </div>
  );
}
