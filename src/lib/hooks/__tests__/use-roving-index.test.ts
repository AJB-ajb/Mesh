import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRovingIndex } from "../use-roving-index";

// Helper: fire a key on the container
function pressKey(
  result: { current: ReturnType<typeof useRovingIndex> },
  key: string,
) {
  const container = result.current.getContainerProps();
  act(() => {
    container.onKeyDown({
      key,
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent);
  });
}

describe("useRovingIndex", () => {
  beforeEach(() => vi.clearAllMocks());

  // ---- Index transitions ----

  it("ArrowDown advances index by one", () => {
    const { result } = renderHook(() => useRovingIndex({ itemCount: 5 }));
    pressKey(result, "ArrowDown");
    expect(result.current.activeIndex).toBe(1);
    pressKey(result, "ArrowDown");
    expect(result.current.activeIndex).toBe(2);
  });

  it("ArrowUp decrements index by one", () => {
    const { result } = renderHook(() => useRovingIndex({ itemCount: 5 }));
    act(() => result.current.setActiveIndex(3));
    pressKey(result, "ArrowUp");
    expect(result.current.activeIndex).toBe(2);
  });

  it("Home jumps to first, End jumps to last", () => {
    const { result } = renderHook(() => useRovingIndex({ itemCount: 5 }));
    act(() => result.current.setActiveIndex(3));
    pressKey(result, "Home");
    expect(result.current.activeIndex).toBe(0);
    pressKey(result, "End");
    expect(result.current.activeIndex).toBe(4);
  });

  // ---- Wrapping ----

  it("wraps forward from last to first when loop=true (default)", () => {
    const { result } = renderHook(() => useRovingIndex({ itemCount: 3 }));
    act(() => result.current.setActiveIndex(2));
    pressKey(result, "ArrowDown");
    expect(result.current.activeIndex).toBe(0);
  });

  it("wraps backward from first to last when loop=true (default)", () => {
    const { result } = renderHook(() => useRovingIndex({ itemCount: 3 }));
    pressKey(result, "ArrowUp");
    expect(result.current.activeIndex).toBe(2);
  });

  it("clamps at both boundaries when loop=false", () => {
    const { result } = renderHook(() =>
      useRovingIndex({ itemCount: 3, loop: false }),
    );
    // At 0, ArrowUp stays at 0
    pressKey(result, "ArrowUp");
    expect(result.current.activeIndex).toBe(0);

    // At last, ArrowDown stays at last
    act(() => result.current.setActiveIndex(2));
    pressKey(result, "ArrowDown");
    expect(result.current.activeIndex).toBe(2);
  });

  // ---- Orientation ----

  it("horizontal orientation uses ArrowLeft/ArrowRight instead of Up/Down", () => {
    const { result } = renderHook(() =>
      useRovingIndex({ itemCount: 4, orientation: "horizontal" }),
    );
    pressKey(result, "ArrowRight");
    expect(result.current.activeIndex).toBe(1);
    pressKey(result, "ArrowLeft");
    expect(result.current.activeIndex).toBe(0);

    // Vertical keys are ignored in horizontal mode
    pressKey(result, "ArrowDown");
    expect(result.current.activeIndex).toBe(0);
  });

  // ---- onActivate ----

  it("Enter fires onActivate with the current active index", () => {
    const onActivate = vi.fn();
    const { result } = renderHook(() =>
      useRovingIndex({ itemCount: 3, onActivate }),
    );
    act(() => result.current.setActiveIndex(2));
    pressKey(result, "Enter");
    expect(onActivate).toHaveBeenCalledWith(2);
  });

  // ---- Edge: itemCount shrinks ----

  it("clamps activeIndex when itemCount shrinks below it", async () => {
    const { result, rerender } = renderHook(
      ({ count }) => useRovingIndex({ itemCount: count }),
      { initialProps: { count: 5 } },
    );
    act(() => result.current.setActiveIndex(4));
    rerender({ count: 2 });
    await waitFor(() => {
      expect(result.current.activeIndex).toBe(1);
    });
  });

  // ---- Edge: itemCount = 0 ----

  it("does nothing when itemCount is 0", () => {
    const onActivate = vi.fn();
    const { result } = renderHook(() =>
      useRovingIndex({ itemCount: 0, onActivate }),
    );
    // Keys should be no-ops
    pressKey(result, "ArrowDown");
    expect(result.current.activeIndex).toBe(0);
    pressKey(result, "Enter");
    expect(onActivate).not.toHaveBeenCalled();
  });

  // ---- onFocus sets activeIndex ----

  it("onFocus from getItemProps updates activeIndex", () => {
    const { result } = renderHook(() => useRovingIndex({ itemCount: 3 }));
    act(() => result.current.getItemProps(2).onFocus());
    expect(result.current.activeIndex).toBe(2);
  });
});
