import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";

// ---------------------------------------------------------------------------
// Syntax highlighting for Markdown tokens
// ---------------------------------------------------------------------------

const markdownHighlightStyle = HighlightStyle.define([
  // Heading markers (#, ##, ###) and heading text
  {
    tag: tags.heading1,
    fontSize: "1.25em",
    fontWeight: "700",
    lineHeight: "1.4",
  },
  {
    tag: tags.heading2,
    fontSize: "1.15em",
    fontWeight: "600",
    lineHeight: "1.4",
  },
  {
    tag: tags.heading3,
    fontSize: "1.05em",
    fontWeight: "600",
    lineHeight: "1.4",
  },
  // Markdown markers (**, *, #, `, etc.)
  {
    tag: tags.processingInstruction,
    color: "hsl(var(--muted-foreground))",
    fontWeight: "inherit",
  },
  // Bold text
  {
    tag: tags.strong,
    fontWeight: "bold",
  },
  // Italic text
  {
    tag: tags.emphasis,
    fontStyle: "italic",
  },
  // Inline code / monospace
  {
    tag: tags.monospace,
    backgroundColor: "hsl(var(--muted))",
    borderRadius: "0.25rem",
    padding: "0.125rem 0.25rem",
    fontSize: "0.875em",
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  // Link text
  {
    tag: tags.link,
    color: "hsl(var(--primary))",
    textDecoration: "underline",
  },
  // URLs
  {
    tag: tags.url,
    color: "hsl(var(--primary))",
  },
  // List markers (-, *, 1.)
  {
    tag: tags.list,
    color: "hsl(var(--muted-foreground))",
  },
]);

// ---------------------------------------------------------------------------
// Base editor theme (structural / layout styles)
// ---------------------------------------------------------------------------

const markdownEditorTheme = EditorView.theme({
  "&": {
    minHeight: "80px",
    fontSize: "1rem",
    lineHeight: "1.625",
    borderRadius: "0.5rem",
    border: "1px solid hsl(var(--input))",
    backgroundColor: "hsl(var(--background))",
  },
  "&.cm-focused": {
    outline: "none",
    boxShadow:
      "0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--ring))",
  },
  ".cm-content": {
    padding: "0.75rem 1rem",
    caretColor: "hsl(var(--foreground))",
  },
  ".cm-placeholder": {
    color: "hsl(var(--muted-foreground))",
  },
  ".cm-line": {
    padding: "0.125rem 0",
  },
  ".cm-cursor": {
    borderLeftColor: "hsl(var(--foreground))",
  },
  ".cm-selectionBackground": {
    backgroundColor: "hsl(var(--accent) / 0.4) !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "hsl(var(--accent) / 0.4) !important",
  },
  ".cm-scroller": {
    fontFamily: "inherit",
  },
});

// ---------------------------------------------------------------------------
// Combined export
// ---------------------------------------------------------------------------

export const markdownTheme: Extension = [
  markdownEditorTheme,
  EditorView.lineWrapping,
  syntaxHighlighting(markdownHighlightStyle),
];
