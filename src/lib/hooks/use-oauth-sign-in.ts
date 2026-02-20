import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type OAuthProvider = "google" | "github" | "linkedin" | null;

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
