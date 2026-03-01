"use client";

import { useEffect } from "react";
import { isNativePlatform } from "@/lib/capacitor";

/**
 * Handles the Android hardware back button in the Capacitor native shell.
 *
 * - If the browser can go back → navigates back
 * - Otherwise → exits the app
 *
 * No-op on web.
 */
export function BackButtonHandler() {
  useEffect(() => {
    if (!isNativePlatform()) return;

    let cleanup: (() => void) | undefined;

    import("@capacitor/app").then(({ App }) => {
      const listener = App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          App.exitApp();
        }
      });

      cleanup = () => {
        listener.then((handle) => handle.remove());
      };
    });

    return () => {
      cleanup?.();
    };
  }, []);

  return null;
}
