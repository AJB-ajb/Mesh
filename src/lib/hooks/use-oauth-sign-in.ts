import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isNativePlatform } from "@/lib/capacitor";

export type OAuthProvider = "google" | "github" | "linkedin" | null;

/**
 * Build the OAuth callback URL. On native (Capacitor), uses the custom
 * `app.mesh://` scheme so Android intercepts the redirect. On web, uses
 * the current origin.
 */
export function getOAuthCallbackUrl(next: string | null): string {
  const base = isNativePlatform()
    ? "app.mesh://callback"
    : `${window.location.origin}/callback`;
  return next ? `${base}?next=${encodeURIComponent(next)}` : base;
}

export function useOAuthSignIn(getCallbackUrl: () => string) {
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider>(null);

  const signIn = async (provider: OAuthProvider) => {
    if (!provider) return;
    setLoadingProvider(provider);
    const supabase = createClient();
    const supabaseProvider =
      provider === "linkedin" ? "linkedin_oidc" : provider;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: supabaseProvider,
      options: { redirectTo: getCallbackUrl() },
    });
    if (error) setLoadingProvider(null);
  };

  return { loadingProvider, signIn, isOAuthLoading: loadingProvider !== null };
}
