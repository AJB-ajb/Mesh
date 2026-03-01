"use client";

import { useCallback } from "react";
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
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (newValue: string) => void;
  visible: boolean;
}

// ---------------------------------------------------------------------------
// Individual button (isolates the ref access to the event handler)
// ---------------------------------------------------------------------------

function ToolbarButton({
  textareaRef,
  onChange,
  action,
  label,
  title,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (newValue: string) => void;
  action: ToolbarAction;
  label: string;
  title: string;
}) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const result = executeAction(textarea, action);
      onChange(result.newValue);

      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(result.cursorPos, result.cursorPos);
      });
    },
    [textareaRef, onChange, action],
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
        onChange={onChange}
        action="slash"
        label={l.slashCommand}
        title={l.slashTooltip}
      />
      <ToolbarButton
        textareaRef={textareaRef}
        onChange={onChange}
        action="heading"
        label={l.heading}
        title={l.headingTooltip}
      />
      <ToolbarButton
        textareaRef={textareaRef}
        onChange={onChange}
        action="bold"
        label={l.bold}
        title={l.boldTooltip}
      />
      <ToolbarButton
        textareaRef={textareaRef}
        onChange={onChange}
        action="list"
        label={l.list}
        title={l.listTooltip}
      />
      <ToolbarButton
        textareaRef={textareaRef}
        onChange={onChange}
        action="code"
        label={l.code}
        title={l.codeTooltip}
      />
    </div>
  );
}
