import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { apiFetcher } from "@/lib/swr/fetchers";

type Provider = "google" | "github" | "linkedin_oidc";

type ConnectedProvider = {
  provider: Provider;
  connected: boolean;
  isPrimary: boolean;
};

type SettingsData = {
  userEmail: string | null;
  persona: string | null;
  providers: ConnectedProvider[];
};

type GithubSyncStatus = {
  synced: boolean;
  lastSyncedAt?: string;
  syncStatus?: string;
};

async function fetchSettings(): Promise<SettingsData> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const identities = user.identities || [];
  const primaryProvider = user.app_metadata?.provider;

  const providers: ConnectedProvider[] = [
    {
      provider: "google",
      connected: identities.some(
        (id: { provider: string }) => id.provider === "google",
      ),
      isPrimary: primaryProvider === "google",
    },
    {
      provider: "github",
      connected: identities.some(
        (id: { provider: string }) => id.provider === "github",
      ),
      isPrimary: primaryProvider === "github",
    },
    {
      provider: "linkedin_oidc",
      connected: identities.some(
        (id: { provider: string }) => id.provider === "linkedin_oidc",
      ),
      isPrimary: primaryProvider === "linkedin_oidc",
    },
  ];

  return {
    userEmail: user.email ?? null,
    persona: user.user_metadata?.persona ?? null,
    providers,
  };
}

export function useSettings() {
  const { data, error, isLoading, mutate } = useSWR("settings", fetchSettings);

  const githubConnected = data?.providers.find(
    (p) => p.provider === "github",
  )?.connected;

  const { data: githubSyncStatus, mutate: mutateGithubSync } =
    useSWR<GithubSyncStatus>(
      githubConnected ? "/api/github/sync" : null,
      apiFetcher,
    );

  return {
    userEmail: data?.userEmail ?? null,
    persona: data?.persona ?? null,
    providers: data?.providers ?? [],
    githubSyncStatus: githubSyncStatus ?? null,
    error,
    isLoading,
    mutate,
    mutateGithubSync,
  };
}

export type { Provider, ConnectedProvider, GithubSyncStatus };
