"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Detects mobile keyboard visibility using the Visual Viewport API.
 * When the viewport height decreases significantly (>150px from window.innerHeight),
 * the keyboard is likely open.
 *
 * Uses requestAnimationFrame (not queueMicrotask) to batch state updates.
 * queueMicrotask fires between the browser processing an input event and
 * finishing the selection update, which can reset a controlled input's cursor
 * to position 0 on mobile — causing characters to appear reversed.
 *
 * Falls back gracefully on desktop (always returns false / 0).
 */
export function useMobileKeyboard(): {
  keyboardVisible: boolean;
  keyboardHeight: number;
} {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const rafId = useRef(0);

  const handleResize = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      const vv = window.visualViewport;
      if (!vv) return;
      const heightDiff = window.innerHeight - vv.height;
      const isOpen = heightDiff > 150;
      setKeyboardVisible(isOpen);
      setKeyboardHeight(isOpen ? heightDiff : 0);
    });
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return; // No visualViewport API = desktop/old browser

    vv.addEventListener("resize", handleResize);
    return () => {
      vv.removeEventListener("resize", handleResize);
      cancelAnimationFrame(rafId.current);
    };
  }, [handleResize]);

  return { keyboardVisible, keyboardHeight };
}
