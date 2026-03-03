import {
  ViewPlugin,
  type ViewUpdate,
  Decoration,
  type DecorationSet,
  EditorView,
  WidgetType,
} from "@codemirror/view";
import type { Range, Extension } from "@codemirror/state";

// Regex to match [emoji text](mesh:type?params)
const MESH_LINK_RE = /\[([^\]]+)\]\((mesh:[^)]+)\)/g;

class MeshChipWidget extends WidgetType {
  constructor(readonly display: string) {
    super();
  }

  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = "mesh-chip";
    span.textContent = this.display;
    return span;
  }

  eq(other: MeshChipWidget): boolean {
    return this.display === other.display;
  }
}

function buildDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const cursor = view.state.selection.main;

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.sliceDoc(from, to);
    let match;
    MESH_LINK_RE.lastIndex = 0;
    while ((match = MESH_LINK_RE.exec(text))) {
      const start = from + match.index;
      const end = start + match[0].length;

      // Don't replace if cursor is inside the range (allow editing)
      if (cursor.from >= start && cursor.from <= end) continue;
      if (cursor.to >= start && cursor.to <= end) continue;

      const display = match[1]; // The text between [ and ]
      decorations.push(
        Decoration.replace({
          widget: new MeshChipWidget(display),
        }).range(start, end),
      );
    }
  }

  return Decoration.set(decorations, true);
}

export const meshLinkPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

// CSS theme for mesh chips
export const meshLinkTheme = EditorView.baseTheme({
  ".mesh-chip": {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "9999px",
    backgroundColor: "var(--color-muted, #f1f5f9)",
    padding: "0.125rem 0.5rem",
    fontSize: "0.875rem",
    fontWeight: "500",
    cursor: "default",
    verticalAlign: "baseline",
  },
});

/**
 * Convenience function returning all extensions needed for mesh link rendering.
 */
export function meshLinkExtension(): Extension[] {
  return [meshLinkPlugin, meshLinkTheme];
}
