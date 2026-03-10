import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSlashCommands } from "../use-slash-commands";
import { SLASH_COMMANDS } from "@/lib/slash-commands/registry";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTextarea(value: string, selectionStart: number) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  document.body.appendChild(textarea);
  textarea.selectionStart = selectionStart;
  textarea.selectionEnd = selectionStart;
  return {
    ref: { current: textarea } as React.RefObject<HTMLTextAreaElement | null>,
    cleanup: () => document.body.removeChild(textarea),
  };
}

function keyEvent(
  key: string,
): React.KeyboardEvent<HTMLTextAreaElement> & { defaultPrevented: boolean } {
  let prevented = false;
  return {
    key,
    preventDefault: () => { prevented = true; },
    get defaultPrevented() { return prevented; },
  } as React.KeyboardEvent<HTMLTextAreaElement> & { defaultPrevented: boolean };
}

describe("useSlashCommands", () => {
  let onChange: ReturnType<typeof vi.fn<(v: string) => void>>;
  const cleanups: (() => void)[] = [];

  beforeEach(() => {
    onChange = vi.fn<(v: string) => void>();
  });

  afterEach(() => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
  });

  function setup(value: string, cursor: number) {
    const { ref, cleanup } = createTextarea(value, cursor);
    cleanups.push(cleanup);
    return ref;
  }

  // -----------------------------------------------------------------------
  // Slash trigger detection — getSlashQuery logic
  // -----------------------------------------------------------------------

  it("detects / at the start of input", () => {
    const ref = setup("/", 1);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value: "/", onChange }),
    );

    act(() => result.current.checkForSlashCommand());
    expect(result.current.menuOpen).toBe(true);
  });

  it("detects / after whitespace", () => {
    const ref = setup("hello /", 7);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value: "hello /", onChange }),
    );

    act(() => result.current.checkForSlashCommand());
    expect(result.current.menuOpen).toBe(true);
  });

  it("rejects / in the middle of a word", () => {
    const ref = setup("hello/", 6);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value: "hello/", onChange }),
    );

    act(() => result.current.checkForSlashCommand());
    expect(result.current.menuOpen).toBe(false);
  });

  it("detects / after a newline", () => {
    const value = "line1\n/";
    const ref = setup(value, value.length);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value, onChange }),
    );

    act(() => result.current.checkForSlashCommand());
    expect(result.current.menuOpen).toBe(true);
  });

  it("closes menu when query contains a space", () => {
    // Typing "/ti " — the space after "ti" should invalidate the slash query
    const value = "hello /ti x";
    const ref = setup(value, value.length);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value, onChange }),
    );

    act(() => result.current.checkForSlashCommand());
    expect(result.current.menuOpen).toBe(false);
  });

  // -----------------------------------------------------------------------
  // Command filtering
  // -----------------------------------------------------------------------

  it("shows all commands when only / is typed", () => {
    const ref = setup("/", 1);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value: "/", onChange }),
    );

    act(() => result.current.checkForSlashCommand());
    expect(result.current.filteredCommands).toHaveLength(SLASH_COMMANDS.length);
  });

  it("filters commands by substring match on name", () => {
    const ref = setup("/ti", 3);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value: "/ti", onChange }),
    );

    act(() => result.current.checkForSlashCommand());
    expect(result.current.filteredCommands.map((c) => c.name)).toContain("time");
    // Every filtered command should have "ti" in its name or label
    for (const cmd of result.current.filteredCommands) {
      const matchesName = cmd.name.toLowerCase().includes("ti");
      const matchesLabel = cmd.label.toLowerCase().includes("ti");
      expect(matchesName || matchesLabel).toBe(true);
    }
  });

  it("returns empty list for a query that matches nothing", () => {
    const ref = setup("/zzzzz", 6);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value: "/zzzzz", onChange }),
    );

    act(() => result.current.checkForSlashCommand());
    expect(result.current.menuOpen).toBe(true);
    expect(result.current.filteredCommands).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // Keyboard navigation
  // -----------------------------------------------------------------------

  it("ArrowDown increments selectedIndex", () => {
    const ref = setup("/", 1);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value: "/", onChange }),
    );

    act(() => result.current.checkForSlashCommand());

    const e = keyEvent("ArrowDown");
    act(() => result.current.onKeyDown(e));

    expect(result.current.selectedIndex).toBe(1);
    expect(e.defaultPrevented).toBe(true);
  });

  it("ArrowDown wraps from last to first", () => {
    const ref = setup("/", 1);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value: "/", onChange }),
    );

    act(() => result.current.checkForSlashCommand());

    // Move to last item
    for (let i = 0; i < SLASH_COMMANDS.length - 1; i++) {
      act(() => result.current.onKeyDown(keyEvent("ArrowDown")));
    }
    expect(result.current.selectedIndex).toBe(SLASH_COMMANDS.length - 1);

    // One more wraps to 0
    act(() => result.current.onKeyDown(keyEvent("ArrowDown")));
    expect(result.current.selectedIndex).toBe(0);
  });

  it("ArrowUp wraps from first to last", () => {
    const ref = setup("/", 1);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value: "/", onChange }),
    );

    act(() => result.current.checkForSlashCommand());

    act(() => result.current.onKeyDown(keyEvent("ArrowUp")));
    expect(result.current.selectedIndex).toBe(SLASH_COMMANDS.length - 1);
  });

  it("does not intercept keys when menu is closed", () => {
    const ref = setup("hello", 5);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value: "hello", onChange }),
    );

    const e = keyEvent("ArrowDown");
    act(() => result.current.onKeyDown(e));
    expect(e.defaultPrevented).toBe(false);
  });

  it("Escape closes the menu", () => {
    const ref = setup("/", 1);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value: "/", onChange }),
    );

    act(() => result.current.checkForSlashCommand());
    expect(result.current.menuOpen).toBe(true);

    act(() => result.current.onKeyDown(keyEvent("Escape")));
    expect(result.current.menuOpen).toBe(false);
  });

  // -----------------------------------------------------------------------
  // Command selection and overlay dispatch
  // -----------------------------------------------------------------------

  it("Enter on an action command opens the overlay", () => {
    const ref = setup("/time", 5);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value: "/time", onChange }),
    );

    act(() => result.current.checkForSlashCommand());
    act(() => result.current.onKeyDown(keyEvent("Enter")));

    expect(result.current.menuOpen).toBe(false);
    expect(result.current.activeOverlay).toBe("time");
  });

  it("handleOverlayResult inserts text at the slash position", () => {
    const ref = setup("before /time after", 12); // cursor after "/time"
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value: "before /time after", onChange }),
    );

    act(() => result.current.checkForSlashCommand());
    act(() => result.current.onKeyDown(keyEvent("Enter")));

    // After Enter, "/time" is removed and onChange is called with cleaned value
    onChange.mockClear();

    act(() => result.current.handleOverlayResult("weekday evenings"));

    expect(result.current.activeOverlay).toBeNull();
    expect(onChange).toHaveBeenCalledTimes(1);
    const inserted = onChange.mock.calls[0][0] as string;
    expect(inserted).toContain("weekday evenings");
  });

  it("closeOverlay clears the overlay without inserting text", () => {
    const ref = setup("/time", 5);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value: "/time", onChange }),
    );

    act(() => result.current.checkForSlashCommand());
    act(() => result.current.onKeyDown(keyEvent("Enter")));
    expect(result.current.activeOverlay).toBe("time");

    act(() => result.current.closeOverlay());
    expect(result.current.activeOverlay).toBeNull();
  });
});
