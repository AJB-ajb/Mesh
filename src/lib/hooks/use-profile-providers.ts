"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useProfileProviders() {
  const [error, setError] = useState<string | null>(null);

  const handleLinkProvider = useCallback(
    async (provider: "github" | "google" | "linkedin_oidc") => {
      const supabase = createClient();
      const { error } = await supabase.auth.linkIdentity({
        provider,
        options: {
          redirectTo: `${window.location.origin}/callback`,
        },
      });

      if (error) {
        setError(`Failed to link ${provider}: ${error.message}`);
      }
    },
    [],
  );

  return { handleLinkProvider, error };
}
