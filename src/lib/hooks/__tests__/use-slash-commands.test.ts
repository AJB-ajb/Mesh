import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSlashCommands } from "../use-slash-commands";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a real textarea element in the document for testing.
 * We need a real element because the hook reads properties and the
 * menu position computation uses real DOM APIs.
 */
function createRealTextarea(
  value: string,
  selectionStart: number,
): {
  ref: React.RefObject<HTMLTextAreaElement | null>;
  cleanup: () => void;
} {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  document.body.appendChild(textarea);

  // jsdom doesn't support selectionStart setter on detached elements reliably,
  // so we set it after appending
  textarea.selectionStart = selectionStart;
  textarea.selectionEnd = selectionStart;

  return {
    ref: { current: textarea },
    cleanup: () => {
      document.body.removeChild(textarea);
    },
  };
}

function createKeyboardEvent(
  key: string,
  extra: Partial<React.KeyboardEvent<HTMLTextAreaElement>> = {},
): React.KeyboardEvent<HTMLTextAreaElement> {
  let prevented = false;
  return {
    key,
    preventDefault: () => {
      prevented = true;
    },
    get defaultPrevented() {
      return prevented;
    },
    ...extra,
  } as React.KeyboardEvent<HTMLTextAreaElement>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useSlashCommands", () => {
  let onChange: ReturnType<typeof vi.fn<(newValue: string) => void>>;
  const cleanups: (() => void)[] = [];

  beforeEach(() => {
    onChange = vi.fn<(newValue: string) => void>();
  });

  afterEach(() => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
  });

  function setupTextarea(value: string, selectionStart: number) {
    const { ref, cleanup } = createRealTextarea(value, selectionStart);
    cleanups.push(cleanup);
    return ref;
  }

  it("starts with menu closed", () => {
    const ref = setupTextarea("", 0);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value: "", onChange }),
    );

    expect(result.current.menuOpen).toBe(false);
    expect(result.current.activeOverlay).toBeNull();
  });

  it("opens menu when / is at start of input", () => {
    const ref = setupTextarea("/", 1);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value: "/", onChange }),
    );

    act(() => {
      result.current.checkForSlashCommand();
    });

    expect(result.current.menuOpen).toBe(true);
    expect(result.current.filteredCommands.length).toBe(15);
  });

  it("opens menu when / is after whitespace", () => {
    const value = "hello /";
    const ref = setupTextarea(value, value.length);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value, onChange }),
    );

    act(() => {
      result.current.checkForSlashCommand();
    });

    expect(result.current.menuOpen).toBe(true);
  });

  it("does NOT open menu when / is in middle of word", () => {
    const value = "hello/";
    const ref = setupTextarea(value, value.length);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value, onChange }),
    );

    act(() => {
      result.current.checkForSlashCommand();
    });

    expect(result.current.menuOpen).toBe(false);
  });

  it("filters commands as user types after /", () => {
    const value = "/ti";
    const ref = setupTextarea(value, value.length);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value, onChange }),
    );

    act(() => {
      result.current.checkForSlashCommand();
    });

    expect(result.current.menuOpen).toBe(true);
    // "ti" matches both "time" and "location" (substring match)
    expect(result.current.filteredCommands.length).toBe(2);
    expect(result.current.filteredCommands.map((c) => c.name)).toContain(
      "time",
    );
  });

  it("ArrowDown changes selectedIndex", () => {
    const ref = setupTextarea("/", 1);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value: "/", onChange }),
    );

    act(() => {
      result.current.checkForSlashCommand();
    });

    const downEvent = createKeyboardEvent("ArrowDown");
    act(() => {
      result.current.onKeyDown(downEvent);
    });

    expect(result.current.selectedIndex).toBe(1);
    expect(downEvent.defaultPrevented).toBe(true);
  });

  it("ArrowUp wraps to last item from 0", () => {
    const ref = setupTextarea("/", 1);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value: "/", onChange }),
    );

    act(() => {
      result.current.checkForSlashCommand();
    });

    const upEvent = createKeyboardEvent("ArrowUp");
    act(() => {
      result.current.onKeyDown(upEvent);
    });

    expect(result.current.selectedIndex).toBe(14); // last index (15 commands)
  });

  it("Enter selects command and opens overlay for action type", () => {
    const ref = setupTextarea("/time", 5);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value: "/time", onChange }),
    );

    act(() => {
      result.current.checkForSlashCommand();
    });

    const enterEvent = createKeyboardEvent("Enter");
    act(() => {
      result.current.onKeyDown(enterEvent);
    });

    expect(result.current.menuOpen).toBe(false);
    expect(result.current.activeOverlay).toBe("time");
    expect(enterEvent.defaultPrevented).toBe(true);
  });

  it("Escape closes menu", () => {
    const ref = setupTextarea("/", 1);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value: "/", onChange }),
    );

    act(() => {
      result.current.checkForSlashCommand();
    });

    expect(result.current.menuOpen).toBe(true);

    const escEvent = createKeyboardEvent("Escape");
    act(() => {
      result.current.onKeyDown(escEvent);
    });

    expect(result.current.menuOpen).toBe(false);
  });

  it("selecting template opens template overlay", () => {
    const ref = setupTextarea("/template", 9);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value: "/template", onChange }),
    );

    act(() => {
      result.current.checkForSlashCommand();
    });

    const enterEvent = createKeyboardEvent("Enter");
    act(() => {
      result.current.onKeyDown(enterEvent);
    });

    expect(result.current.activeOverlay).toBe("template");
  });

  it("handleOverlayResult inserts text and closes overlay", () => {
    const ref = setupTextarea("/time", 5);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value: "/time", onChange }),
    );

    act(() => {
      result.current.checkForSlashCommand();
    });

    const enterEvent = createKeyboardEvent("Enter");
    act(() => {
      result.current.onKeyDown(enterEvent);
    });

    expect(result.current.activeOverlay).toBe("time");

    onChange.mockClear();

    act(() => {
      result.current.handleOverlayResult("weekday evenings");
    });

    expect(result.current.activeOverlay).toBeNull();
    expect(onChange).toHaveBeenCalled();
  });

  it("does not intercept keys when menu is closed", () => {
    const ref = setupTextarea("hello", 5);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value: "hello", onChange }),
    );

    const downEvent = createKeyboardEvent("ArrowDown");
    act(() => {
      result.current.onKeyDown(downEvent);
    });

    expect(downEvent.defaultPrevented).toBe(false);
  });

  it("closeOverlay clears activeOverlay", () => {
    const ref = setupTextarea("/time", 5);
    const { result } = renderHook(() =>
      useSlashCommands({ textareaRef: ref, value: "/time", onChange }),
    );

    act(() => {
      result.current.checkForSlashCommand();
    });

    const enterEvent = createKeyboardEvent("Enter");
    act(() => {
      result.current.onKeyDown(enterEvent);
    });

    expect(result.current.activeOverlay).toBe("time");

    act(() => {
      result.current.closeOverlay();
    });

    expect(result.current.activeOverlay).toBeNull();
  });
});
