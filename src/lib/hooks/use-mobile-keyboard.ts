"use client";

import { useState, useEffect } from "react";

/**
 * Detects mobile keyboard visibility using the Visual Viewport API.
 * When the viewport height decreases significantly (>150px from window.innerHeight),
 * the keyboard is likely open.
 *
 * Falls back gracefully on desktop (always returns false / 0).
 */
export function useMobileKeyboard(): {
  keyboardVisible: boolean;
  keyboardHeight: number;
} {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return; // No visualViewport API = desktop/old browser

    const handleResize = () => {
      const heightDiff = window.innerHeight - vv.height;
      const isOpen = heightDiff > 150;
      queueMicrotask(() => {
        setKeyboardVisible(isOpen);
        setKeyboardHeight(isOpen ? heightDiff : 0);
      });
    };

    vv.addEventListener("resize", handleResize);
    return () => vv.removeEventListener("resize", handleResize);
  }, []);

  return { keyboardVisible, keyboardHeight };
}
