"use client";

import { useEffect } from "react";
import { isNativePlatform } from "@/lib/capacitor";

const UPDATE_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Handles automatic service worker updates with zero user interaction.
 *
 * - Listens for `controllerchange` → auto-reloads the page when a new SW takes over
 * - On `visibilitychange` (hidden → visible) → checks for SW updates
 *   (fixes iOS PWAs that never check for updates in the background)
 * - Periodic interval check every 15 minutes for long-lived sessions
 */
export function ServiceWorkerUpdater() {
  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator) ||
      isNativePlatform()
    ) {
      return;
    }

    let isRefreshing = false;

    // Auto-reload when a new service worker takes control
    const onControllerChange = () => {
      if (isRefreshing) return;
      isRefreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    // Check for updates when the page becomes visible again (fixes iOS)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        navigator.serviceWorker.ready.then((registration) => {
          registration.update();
        });
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    // Periodic update check for long-lived sessions
    const intervalId = setInterval(() => {
      navigator.serviceWorker.ready.then((registration) => {
        registration.update();
      });
    }, UPDATE_INTERVAL_MS);

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearInterval(intervalId);
    };
  }, []);

  return null;
}
