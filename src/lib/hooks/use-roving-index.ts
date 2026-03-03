"use client";

import { useState, useCallback, useEffect } from "react";

type Orientation = "vertical" | "horizontal";

interface UseRovingIndexOptions {
  itemCount: number;
  orientation?: Orientation;
  onActivate?: (index: number) => void;
  loop?: boolean;
}

interface UseRovingIndexReturn {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  getContainerProps: () => {
    onKeyDown: (e: React.KeyboardEvent) => void;
    role: "group";
  };
  getItemProps: (index: number) => {
    tabIndex: 0 | -1;
    "data-active": boolean;
    onFocus: () => void;
  };
}

export function useRovingIndex({
  itemCount,
  orientation = "vertical",
  onActivate,
  loop = true,
}: UseRovingIndexOptions): UseRovingIndexReturn {
  const [activeIndex, setActiveIndex] = useState(0);

  // Clamp activeIndex when itemCount shrinks
  useEffect(() => {
    if (itemCount === 0) return;
    queueMicrotask(() =>
      setActiveIndex((prev) => Math.min(prev, itemCount - 1)),
    );
  }, [itemCount]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (itemCount === 0) return;

      const prevKey = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
      const nextKey = orientation === "vertical" ? "ArrowDown" : "ArrowRight";

      if (e.key === nextKey) {
        e.preventDefault();
        setActiveIndex((prev) => {
          if (prev >= itemCount - 1) return loop ? 0 : prev;
          return prev + 1;
        });
      } else if (e.key === prevKey) {
        e.preventDefault();
        setActiveIndex((prev) => {
          if (prev <= 0) return loop ? itemCount - 1 : prev;
          return prev - 1;
        });
      } else if (e.key === "Home") {
        e.preventDefault();
        setActiveIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setActiveIndex(itemCount - 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        onActivate?.(activeIndex);
      }
    },
    [itemCount, orientation, loop, onActivate, activeIndex],
  );

  const getContainerProps = useCallback(
    () => ({
      onKeyDown: handleKeyDown,
      role: "group" as const,
    }),
    [handleKeyDown],
  );

  const getItemProps = useCallback(
    (index: number) => ({
      tabIndex: (index === activeIndex ? 0 : -1) as 0 | -1,
      "data-active": index === activeIndex,
      onFocus: () => setActiveIndex(index),
    }),
    [activeIndex],
  );

  return {
    activeIndex,
    setActiveIndex,
    getContainerProps,
    getItemProps,
  };
}
