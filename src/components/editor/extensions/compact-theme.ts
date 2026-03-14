import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";

/**
 * Compact theme override for message-style editors.
 * Applies chat-bubble styling (rounded-xl, smaller padding, muted background)
 * on top of the base markdownTheme.
 */
export const compactEditorTheme: Extension = EditorView.theme({
  "&": {
    minHeight: "unset",
    fontSize: "0.875rem",
    lineHeight: "1.5",
    borderRadius: "0.75rem",
    backgroundColor: "hsl(var(--muted) / 0.5)",
  },
  ".cm-content": {
    padding: "0.5rem 0.75rem",
  },
  ".cm-line": {
    padding: "0",
  },
});
