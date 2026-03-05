/**
 * CodeMirror ViewPlugin for ||hidden|| and ||?question|| syntax highlighting.
 *
 * ||...||  → dimmed hidden content (muted background + delimiter color)
 * ||?...|| → question content (blue-tinted background + info-colored delimiter)
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

/** Matches ||...|| but NOT ||?...|| (negative lookahead for ?) or ||| (negative lookahead for |) */
const HIDDEN_RE = /\|\|(?!\?|\|)([\s\S]*?)\|\|/g;

/** Matches ||?...|| question syntax */
const QUESTION_RE = /\|\|\?\s*([\s\S]*?)\|\|/g;

function buildDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.sliceDoc(from, to);

    // Hidden blocks: ||...||
    HIDDEN_RE.lastIndex = 0;
    let match;
    while ((match = HIDDEN_RE.exec(text))) {
      const start = from + match.index;
      const end = start + match[0].length;

      decorations.push(
        Decoration.mark({ class: "cm-hidden-delimiter" }).range(
          start,
          start + 2,
        ),
      );

      if (match[1].length > 0) {
        decorations.push(
          Decoration.mark({ class: "cm-hidden-content" }).range(
            start + 2,
            end - 2,
          ),
        );
      }

      decorations.push(
        Decoration.mark({ class: "cm-hidden-delimiter" }).range(end - 2, end),
      );
    }

    // Question blocks: ||?...||
    QUESTION_RE.lastIndex = 0;
    while ((match = QUESTION_RE.exec(text))) {
      const start = from + match.index;
      const end = start + match[0].length;

      // Opening ||? (3 chars)
      decorations.push(
        Decoration.mark({ class: "cm-question-delimiter" }).range(
          start,
          start + 3,
        ),
      );

      // Content between ||? and closing ||
      const contentStart = start + 3;
      const contentEnd = end - 2;
      if (contentEnd > contentStart) {
        decorations.push(
          Decoration.mark({ class: "cm-question-content" }).range(
            contentStart,
            contentEnd,
          ),
        );
      }

      // Closing ||
      decorations.push(
        Decoration.mark({ class: "cm-question-delimiter" }).range(end - 2, end),
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
  ".cm-question-content": {
    opacity: "0.6",
    backgroundColor:
      "color-mix(in srgb, var(--color-info, #0ea5e9) 10%, transparent)",
    borderRadius: "2px",
  },
  ".cm-question-delimiter": {
    color: "var(--color-info, #0ea5e9)",
    fontWeight: "600",
  },
});

export function hiddenSyntaxExtension(): Extension[] {
  return [hiddenSyntaxPlugin, hiddenSyntaxTheme];
}
