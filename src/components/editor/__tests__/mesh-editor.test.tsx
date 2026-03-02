import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import { EditorView } from "@codemirror/view";
import { MeshEditor } from "../mesh-editor";

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Flush queueMicrotask callbacks (used by MeshEditor for onEditorReady). */
async function flushMicrotasks(): Promise<void> {
  await new Promise<void>((resolve) => queueMicrotask(resolve));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MeshEditor", () => {
  // -----------------------------------------------------------------------
  // onEditorReady
  // -----------------------------------------------------------------------

  describe("onEditorReady", () => {
    it("fires with an EditorView instance after mount", async () => {
      const onEditorReady = vi.fn();

      render(<MeshEditor onEditorReady={onEditorReady} />);

      // onEditorReady is deferred via queueMicrotask inside useEffect
      await waitFor(() => {
        expect(onEditorReady).toHaveBeenCalledTimes(1);
      });

      const editorView = onEditorReady.mock.calls[0][0];
      expect(editorView).toBeInstanceOf(EditorView);
    });

    it("provides an EditorView with an empty document by default", async () => {
      const onEditorReady = vi.fn();

      render(<MeshEditor onEditorReady={onEditorReady} />);

      await waitFor(() => {
        expect(onEditorReady).toHaveBeenCalled();
      });

      const editorView: EditorView = onEditorReady.mock.calls[0][0];
      expect(editorView.state.doc.toString()).toBe("");
    });

    it("provides an EditorView whose document matches initial content", async () => {
      const onEditorReady = vi.fn();

      render(
        <MeshEditor content="hello world" onEditorReady={onEditorReady} />,
      );

      await waitFor(() => {
        expect(onEditorReady).toHaveBeenCalled();
      });

      const editorView: EditorView = onEditorReady.mock.calls[0][0];
      expect(editorView.state.doc.toString()).toBe("hello world");
    });
  });

  // -----------------------------------------------------------------------
  // onChange
  // -----------------------------------------------------------------------

  describe("onChange", () => {
    it("fires when text is programmatically inserted via the EditorView", async () => {
      const onChange = vi.fn();
      const onEditorReady = vi.fn();

      render(
        <MeshEditor onChange={onChange} onEditorReady={onEditorReady} />,
      );

      // Wait for the editor to be ready
      await waitFor(() => {
        expect(onEditorReady).toHaveBeenCalled();
      });

      const editorView: EditorView = onEditorReady.mock.calls[0][0];

      // Programmatically insert text
      editorView.dispatch({
        changes: { from: 0, to: 0, insert: "typed text" },
      });

      expect(onChange).toHaveBeenCalledWith("typed text");
    });

    it("fires with the full document content after multiple inserts", async () => {
      const onChange = vi.fn();
      const onEditorReady = vi.fn();

      render(
        <MeshEditor onChange={onChange} onEditorReady={onEditorReady} />,
      );

      await waitFor(() => {
        expect(onEditorReady).toHaveBeenCalled();
      });

      const editorView: EditorView = onEditorReady.mock.calls[0][0];

      editorView.dispatch({
        changes: { from: 0, to: 0, insert: "first" },
      });

      editorView.dispatch({
        changes: {
          from: editorView.state.doc.length,
          to: editorView.state.doc.length,
          insert: " second",
        },
      });

      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenLastCalledWith("first second");
    });
  });

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------

  describe("rendering", () => {
    it("renders a container div", () => {
      const { container } = render(<MeshEditor />);
      const wrapper = container.firstElementChild;
      expect(wrapper).toBeTruthy();
      expect(wrapper?.tagName).toBe("DIV");
    });

    it("applies custom className", () => {
      const { container } = render(<MeshEditor className="my-custom-class" />);
      const wrapper = container.firstElementChild;
      expect(wrapper?.classList.contains("my-custom-class")).toBe(true);
    });

    it("creates a CodeMirror editor inside the container", async () => {
      const { container } = render(<MeshEditor />);

      // CM6 creates a div.cm-editor inside the parent
      await waitFor(() => {
        const cmEditor = container.querySelector(".cm-editor");
        expect(cmEditor).toBeTruthy();
      });
    });
  });

  // -----------------------------------------------------------------------
  // onFocus / onBlur
  // -----------------------------------------------------------------------

  describe("focus callbacks", () => {
    it("fires onFocus when the editor receives focus", async () => {
      const onFocus = vi.fn();
      const onEditorReady = vi.fn();

      render(
        <MeshEditor onFocus={onFocus} onEditorReady={onEditorReady} />,
      );

      await waitFor(() => {
        expect(onEditorReady).toHaveBeenCalled();
      });

      const editorView: EditorView = onEditorReady.mock.calls[0][0];
      editorView.focus();

      expect(onFocus).toHaveBeenCalled();
    });
  });
});
