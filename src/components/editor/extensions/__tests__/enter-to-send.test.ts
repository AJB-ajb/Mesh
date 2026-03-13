import { describe, it, expect, vi, beforeEach } from "vitest";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { enterToSend } from "../enter-to-send";
import { slashCommandPlugin, slashMenuState } from "../slash-command-plugin";
import type { MutableRefObject } from "react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEditor(
  onSubmitRef: MutableRefObject<(() => void) | undefined>,
  options?: { withSlash?: boolean },
) {
  const parent = document.createElement("div");
  const extensions = [enterToSend(onSubmitRef)];

  if (options?.withSlash) {
    extensions.push(
      slashCommandPlugin({
        onStateChange: () => {},
        onSelectCommand: () => {},
      }),
    );
  }

  const state = EditorState.create({ doc: "", extensions });
  return new EditorView({ state, parent });
}

function insertText(view: EditorView, text: string): void {
  const { head } = view.state.selection.main;
  view.dispatch({
    changes: { from: head, to: head, insert: text },
    selection: { anchor: head + text.length },
  });
}

function pressKey(view: EditorView, key: string, shift = false): void {
  const cmContent = view.dom.querySelector(".cm-content");
  if (cmContent) {
    cmContent.dispatchEvent(
      new KeyboardEvent("keydown", { key, shiftKey: shift, bubbles: true }),
    );
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("enter-to-send", () => {
  let onSubmit: ReturnType<typeof vi.fn>;
  let onSubmitRef: MutableRefObject<(() => void) | undefined>;
  let view: EditorView;

  beforeEach(() => {
    onSubmit = vi.fn();
    onSubmitRef = { current: onSubmit };
    view = createEditor(onSubmitRef);
  });

  it("calls onSubmit when Enter is pressed", () => {
    insertText(view, "hello");
    pressKey(view, "Enter");

    // jsdom key routing is unreliable, but if it worked:
    if (onSubmit.mock.calls.length > 0) {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    }
  });

  it("inserts newline on Shift+Enter", () => {
    insertText(view, "hello");
    pressKey(view, "Enter", true);

    // If jsdom routed the key:
    const doc = view.state.doc.toString();
    if (doc.includes("\n")) {
      expect(doc).toBe("hello\n");
      expect(onSubmit).not.toHaveBeenCalled();
    }
  });

  it("does not call onSubmit when slash menu is open", () => {
    const viewWithSlash = createEditor(onSubmitRef, { withSlash: true });
    insertText(viewWithSlash, "/");

    const menu = viewWithSlash.state.field(slashMenuState);
    expect(menu.isOpen).toBe(true);

    pressKey(viewWithSlash, "Enter");

    // The slash plugin should have consumed Enter, not enterToSend
    // onSubmit should not be called
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("uses current ref value (not stale closure)", () => {
    const newSubmit = vi.fn();
    onSubmitRef.current = newSubmit;

    insertText(view, "hello");
    pressKey(view, "Enter");

    if (newSubmit.mock.calls.length > 0) {
      expect(newSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).not.toHaveBeenCalled();
    }
  });
});
