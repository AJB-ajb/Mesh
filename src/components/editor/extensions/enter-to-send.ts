import { keymap } from "@codemirror/view";
import { Facet, Prec, type Extension } from "@codemirror/state";
import { slashMenuState } from "./slash-command-plugin";

/**
 * Facet that holds the current onSubmit callback. Updating the facet value
 * (via EditorView.dispatch with reconfigure) keeps the callback fresh without
 * rebuilding the entire extension array.
 */
const submitCallbackFacet = Facet.define<() => void, (() => void) | null>({
  combine: (values) => values[0] ?? null,
});

/**
 * CodeMirror extension for chat-style Enter-to-send.
 *
 * - Enter → calls onSubmit (unless the slash menu is open)
 * - Shift+Enter → inserts a newline
 *
 * Uses `Prec.high` so the slash plugin's `Prec.highest` Enter handler
 * runs first when the slash menu is open.
 */
export function enterToSend(onSubmit: () => void): Extension {
  return [
    submitCallbackFacet.of(onSubmit),
    Prec.high(
      keymap.of([
        {
          key: "Enter",
          run(view) {
            // Let the slash plugin handle Enter when the menu is open
            const menu = view.state.field(slashMenuState, false);
            if (menu?.isOpen) return false;

            const cb = view.state.facet(submitCallbackFacet);
            cb?.();
            return true;
          },
        },
        {
          key: "Shift-Enter",
          run(view) {
            const pos = view.state.selection.main.head;
            view.dispatch({
              changes: { from: pos, to: pos, insert: "\n" },
              selection: { anchor: pos + 1 },
            });
            return true;
          },
        },
      ]),
    ),
  ];
}
