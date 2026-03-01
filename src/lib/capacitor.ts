/**
 * Platform detection for Capacitor native shells.
 *
 * Uses `window.Capacitor` (injected by the native bridge) to avoid
 * importing `@capacitor/core` — which would bundle Capacitor JS on web.
 */

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      getPlatform: () => string;
    };
  }
}

export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  return window.Capacitor?.isNativePlatform() ?? false;
}

export function getNativePlatform(): "android" | "ios" | "web" {
  if (typeof window === "undefined") return "web";
  const platform = window.Capacitor?.getPlatform();
  if (platform === "android" || platform === "ios") return platform;
  return "web";
}
