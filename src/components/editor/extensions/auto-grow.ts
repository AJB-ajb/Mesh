import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";

/**
 * Auto-grow extension for message-style editors.
 * Starts at content height (single line) and caps at maxHeight.
 */
export function autoGrow(maxHeight = 150): Extension {
  return EditorView.theme({
    "&": {
      minHeight: "unset",
    },
    ".cm-scroller": {
      maxHeight: `${maxHeight}px`,
      overflowY: "auto",
    },
  });
}
