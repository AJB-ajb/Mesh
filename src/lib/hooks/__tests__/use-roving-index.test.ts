import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRovingIndex } from "../use-roving-index";

describe("useRovingIndex", () => {
  it("starts with activeIndex 0", () => {
    const { result } = renderHook(() => useRovingIndex({ itemCount: 3 }));
    expect(result.current.activeIndex).toBe(0);
  });

  it("getItemProps returns tabIndex 0 for active, -1 for others", () => {
    const { result } = renderHook(() => useRovingIndex({ itemCount: 3 }));
    expect(result.current.getItemProps(0).tabIndex).toBe(0);
    expect(result.current.getItemProps(1).tabIndex).toBe(-1);
    expect(result.current.getItemProps(2).tabIndex).toBe(-1);
    expect(result.current.getItemProps(0)["data-active"]).toBe(true);
    expect(result.current.getItemProps(1)["data-active"]).toBe(false);
  });

  it("ArrowDown moves to next item (vertical)", () => {
    const { result } = renderHook(() => useRovingIndex({ itemCount: 3 }));
    const container = result.current.getContainerProps();

    act(() => {
      container.onKeyDown({
        key: "ArrowDown",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });

    expect(result.current.activeIndex).toBe(1);
  });

  it("ArrowUp moves to previous item", () => {
    const { result } = renderHook(() => useRovingIndex({ itemCount: 3 }));

    // Move to index 2 first
    act(() => result.current.setActiveIndex(2));

    const container = result.current.getContainerProps();
    act(() => {
      container.onKeyDown({
        key: "ArrowUp",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });

    expect(result.current.activeIndex).toBe(1);
  });

  it("loops from last to first when loop=true (default)", () => {
    const { result } = renderHook(() => useRovingIndex({ itemCount: 3 }));

    act(() => result.current.setActiveIndex(2));

    const container = result.current.getContainerProps();
    act(() => {
      container.onKeyDown({
        key: "ArrowDown",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });

    expect(result.current.activeIndex).toBe(0);
  });

  it("loops from first to last when loop=true (default)", () => {
    const { result } = renderHook(() => useRovingIndex({ itemCount: 3 }));

    const container = result.current.getContainerProps();
    act(() => {
      container.onKeyDown({
        key: "ArrowUp",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });

    expect(result.current.activeIndex).toBe(2);
  });

  it("clamps at boundaries when loop=false", () => {
    const { result } = renderHook(() =>
      useRovingIndex({ itemCount: 3, loop: false }),
    );

    const container = result.current.getContainerProps();

    // At index 0, ArrowUp should stay at 0
    act(() => {
      container.onKeyDown({
        key: "ArrowUp",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.activeIndex).toBe(0);

    // Move to end
    act(() => result.current.setActiveIndex(2));

    // At last index, ArrowDown should stay
    act(() => {
      container.onKeyDown({
        key: "ArrowDown",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.activeIndex).toBe(2);
  });

  it("Enter calls onActivate with current index", () => {
    const onActivate = vi.fn();
    const { result } = renderHook(() =>
      useRovingIndex({ itemCount: 3, onActivate }),
    );

    act(() => result.current.setActiveIndex(1));

    const container = result.current.getContainerProps();
    act(() => {
      container.onKeyDown({
        key: "Enter",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });

    expect(onActivate).toHaveBeenCalledWith(1);
  });

  it("Home moves to first, End moves to last", () => {
    const { result } = renderHook(() => useRovingIndex({ itemCount: 5 }));

    act(() => result.current.setActiveIndex(3));

    const container = result.current.getContainerProps();

    act(() => {
      container.onKeyDown({
        key: "Home",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.activeIndex).toBe(0);

    act(() => {
      container.onKeyDown({
        key: "End",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.activeIndex).toBe(4);
  });

  it("uses ArrowLeft/ArrowRight for horizontal orientation", () => {
    const { result } = renderHook(() =>
      useRovingIndex({ itemCount: 3, orientation: "horizontal" }),
    );

    const container = result.current.getContainerProps();

    act(() => {
      container.onKeyDown({
        key: "ArrowRight",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.activeIndex).toBe(1);

    act(() => {
      container.onKeyDown({
        key: "ArrowLeft",
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.activeIndex).toBe(0);
  });

  it("clamps activeIndex when itemCount shrinks", async () => {
    const { result, rerender } = renderHook(
      ({ count }) => useRovingIndex({ itemCount: count }),
      { initialProps: { count: 5 } },
    );

    act(() => result.current.setActiveIndex(4));
    expect(result.current.activeIndex).toBe(4);

    rerender({ count: 2 });
    await waitFor(() => {
      expect(result.current.activeIndex).toBe(1);
    });
  });

  it("onFocus updates activeIndex", () => {
    const { result } = renderHook(() => useRovingIndex({ itemCount: 3 }));

    act(() => {
      result.current.getItemProps(2).onFocus();
    });

    expect(result.current.activeIndex).toBe(2);
    expect(result.current.getItemProps(2).tabIndex).toBe(0);
    expect(result.current.getItemProps(0).tabIndex).toBe(-1);
  });

  it("getContainerProps returns role='group'", () => {
    const { result } = renderHook(() => useRovingIndex({ itemCount: 3 }));
    expect(result.current.getContainerProps().role).toBe("group");
  });
});
