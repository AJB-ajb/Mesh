/**
 * Integration test: verifies the exact wiring pattern used in new/page.tsx
 * to find where the slash command → React state chain breaks.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { useState, useCallback, useRef, useEffect } from "react";
import type { EditorView } from "@codemirror/view";
import { MeshEditor } from "@/components/editor/mesh-editor";
import { useEditorSlashCommands } from "@/lib/hooks/use-editor-slash-commands";

// Track render values for assertion
interface RenderState {
  editorInstance: EditorView | null;
  menuIsOpen: boolean;
  menuCommands: number;
  editorRefValue: EditorView | null;
}

/**
 * Minimal component that replicates the exact pattern from new/page.tsx:
 * - useEditorSlashCommands() for the slash extension
 * - useState(() => [slash.slashExtension]) for stable extensions
 * - handleEditorReady with useCallback setting both ref and state
 * - MeshEditor with all the same props
 */
function TestHarness({ onState }: { onState: (s: RenderState) => void }) {
  const [text, setText] = useState("");
  const [editorInstance, setEditorInstance] = useState<EditorView | null>(null);
  const editorRef = useRef<EditorView | null>(null);

  const slash = useEditorSlashCommands();
  const [extensions] = useState(() => [slash.slashExtension]);

  const handleEditorReady = useCallback((view: EditorView) => {
    editorRef.current = view;
    setEditorInstance(view);
  }, []);

  // Report state on every render
  useEffect(() => {
    onState({
      editorInstance,
      menuIsOpen: slash.menuState.isOpen,
      menuCommands: slash.menuState.commands.length,
      editorRefValue: editorRef.current,
    });
  });

  return (
    <div>
      <MeshEditor
        content={text}
        placeholder="Test editor"
        onChange={setText}
        extensions={extensions}
        onEditorReady={handleEditorReady}
      />
      {/* Mirror the page's conditional render */}
      {slash.menuState.isOpen && editorInstance && (
        <div data-testid="slash-menu">
          {slash.menuState.commands.map((c) => (
            <div key={c.name}>{c.name}</div>
          ))}
        </div>
      )}
    </div>
  );
}

describe("Slash command integration (page wiring pattern)", () => {
  let lastState: RenderState;
  const captureState = vi.fn((s: RenderState) => {
    lastState = s;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    lastState = {
      editorInstance: null,
      menuIsOpen: false,
      menuCommands: 0,
      editorRefValue: null,
    };
  });

  it("sets editorInstance via onEditorReady after mount", async () => {
    render(<TestHarness onState={captureState} />);

    await waitFor(() => {
      expect(lastState.editorInstance).not.toBeNull();
    });

    expect(lastState.editorInstance).toBeInstanceOf(
      (await import("@codemirror/view")).EditorView,
    );
    expect(lastState.editorRefValue).toBe(lastState.editorInstance);
  });

  it("detects slash and opens menu when / is dispatched", async () => {
    render(<TestHarness onState={captureState} />);

    // Wait for editor to be ready
    await waitFor(() => {
      expect(lastState.editorInstance).not.toBeNull();
    });

    const view = lastState.editorInstance!;

    // Simulate typing "/" at position 0
    view.dispatch({
      changes: { from: 0, to: 0, insert: "/" },
      selection: { anchor: 1 },
    });

    // The onStateChange is deferred via queueMicrotask, then React re-renders
    await waitFor(() => {
      expect(lastState.menuIsOpen).toBe(true);
    });

    expect(lastState.menuCommands).toBeGreaterThan(0);
  });

  it("renders the slash menu DOM element when open", async () => {
    const { queryByTestId } = render(<TestHarness onState={captureState} />);

    // Wait for editor
    await waitFor(() => {
      expect(lastState.editorInstance).not.toBeNull();
    });

    // No menu yet
    expect(queryByTestId("slash-menu")).toBeNull();

    // Type /
    lastState.editorInstance!.dispatch({
      changes: { from: 0, to: 0, insert: "/" },
      selection: { anchor: 1 },
    });

    // Menu should appear
    await waitFor(() => {
      expect(queryByTestId("slash-menu")).not.toBeNull();
    });
  });

  it("closes menu when slash context is removed", async () => {
    const { queryByTestId } = render(<TestHarness onState={captureState} />);

    await waitFor(() => {
      expect(lastState.editorInstance).not.toBeNull();
    });

    const view = lastState.editorInstance!;

    // Open menu
    view.dispatch({
      changes: { from: 0, to: 0, insert: "/" },
      selection: { anchor: 1 },
    });

    await waitFor(() => {
      expect(lastState.menuIsOpen).toBe(true);
    });

    // Remove the slash
    view.dispatch({
      changes: { from: 0, to: 1, insert: "" },
      selection: { anchor: 0 },
    });

    await waitFor(() => {
      expect(lastState.menuIsOpen).toBe(false);
    });

    expect(queryByTestId("slash-menu")).toBeNull();
  });

  it("detects slash after whitespace", async () => {
    render(<TestHarness onState={captureState} />);

    await waitFor(() => {
      expect(lastState.editorInstance).not.toBeNull();
    });

    const view = lastState.editorInstance!;

    // Type "hello /"
    view.dispatch({
      changes: { from: 0, to: 0, insert: "hello /" },
      selection: { anchor: 7 },
    });

    await waitFor(() => {
      expect(lastState.menuIsOpen).toBe(true);
    });
  });
});
