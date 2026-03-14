"use client";

import { useEffect } from "react";
import { isNativePlatform } from "@/lib/capacitor";

/**
 * Initializes the native status bar with dark style and black background.
 * No-op on web.
 */
export function StatusBarInit() {
  useEffect(() => {
    if (!isNativePlatform()) return;

    import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({ color: "#4e5567" });
    });
  }, []);

  return null;
}
