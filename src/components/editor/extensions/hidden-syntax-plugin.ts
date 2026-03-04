/**
 * CodeMirror ViewPlugin for ||hidden|| syntax highlighting.
 *
 * Scans for ||...|| patterns and applies Decoration.mark with a dimmed style.
 * The || delimiters get a muted foreground (like markdown markers).
 */

import {
  ViewPlugin,
  type ViewUpdate,
  Decoration,
  type DecorationSet,
  EditorView,
} from "@codemirror/view";
import type { Range } from "@codemirror/state";
import type { Extension } from "@codemirror/state";

const HIDDEN_RE = /\|\|(?!\|)([\s\S]*?)\|\|/g;

function buildDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.sliceDoc(from, to);
    HIDDEN_RE.lastIndex = 0;
    let match;
    while ((match = HIDDEN_RE.exec(text))) {
      const start = from + match.index;
      const end = start + match[0].length;

      // Mark the opening ||
      decorations.push(
        Decoration.mark({ class: "cm-hidden-delimiter" }).range(
          start,
          start + 2,
        ),
      );

      // Mark the content between delimiters
      if (match[1].length > 0) {
        decorations.push(
          Decoration.mark({ class: "cm-hidden-content" }).range(
            start + 2,
            end - 2,
          ),
        );
      }

      // Mark the closing ||
      decorations.push(
        Decoration.mark({ class: "cm-hidden-delimiter" }).range(end - 2, end),
      );
    }
  }

  return Decoration.set(decorations, true);
}

const hiddenSyntaxPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

const hiddenSyntaxTheme = EditorView.baseTheme({
  ".cm-hidden-content": {
    opacity: "0.6",
    backgroundColor: "var(--color-muted, #f1f5f9)",
    borderRadius: "2px",
  },
  ".cm-hidden-delimiter": {
    color: "var(--color-muted-foreground, #94a3b8)",
    fontWeight: "600",
  },
});

export function hiddenSyntaxExtension(): Extension[] {
  return [hiddenSyntaxPlugin, hiddenSyntaxTheme];
}
