import { keymap } from "@codemirror/view";
import { Prec, type Extension } from "@codemirror/state";
import { slashMenuState } from "./slash-command-plugin";
import type { MutableRefObject } from "react";

/**
 * CodeMirror extension for chat-style Enter-to-send.
 *
 * - Enter → calls onSubmit (unless the slash menu is open)
 * - Shift+Enter → inserts a newline
 *
 * Uses `Prec.high` so the slash plugin's `Prec.highest` Enter handler
 * runs first when the slash menu is open.
 *
 * Takes a ref rather than a plain callback so the extension identity stays
 * stable — changing the callback doesn't recreate the CM editor.
 */
export function enterToSend(
  onSubmitRef: MutableRefObject<(() => void) | undefined>,
): Extension {
  return Prec.high(
    keymap.of([
      {
        key: "Enter",
        run(view) {
          // Let the slash plugin handle Enter when the menu is open
          const menu = view.state.field(slashMenuState, false);
          if (menu?.isOpen) return false;

          onSubmitRef.current?.();
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
  );
}
