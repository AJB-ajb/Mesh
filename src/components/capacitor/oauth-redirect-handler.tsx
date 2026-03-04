"use client";

import { useEffect } from "react";
import { isNativePlatform } from "@/lib/capacitor";

/**
 * Handles OAuth redirects in the Capacitor native shell.
 *
 * After Google (or other OAuth) auth, the browser redirects to
 * `app.mesh://callback?code=...`. Android intercepts the custom scheme
 * and fires an `appUrlOpen` event. This component captures that event
 * and navigates the WebView to the server-side `/callback` route,
 * reusing all existing auth exchange logic.
 *
 * No-op on web.
 */
export function OAuthRedirectHandler() {
  useEffect(() => {
    if (!isNativePlatform()) return;

    let cleanup: (() => void) | undefined;

    import("@capacitor/app").then(({ App }) => {
      const listener = App.addListener("appUrlOpen", ({ url }) => {
        if (!url.startsWith("app.mesh://callback")) return;

        const queryString = url.replace(/^app\.mesh:\/\/callback\/?/, "");
        const path = queryString.startsWith("?")
          ? `/callback${queryString}`
          : `/callback`;

        window.location.href = path;
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
