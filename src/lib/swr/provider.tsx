"use client";

import * as Sentry from "@sentry/nextjs";
import { SWRConfig } from "swr";
import { apiFetcher } from "./fetchers";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: apiFetcher,
        revalidateOnFocus: false,
        dedupingInterval: 5000,
        onError: (error: Error & { status?: number }) => {
          // Don't report expected auth errors
          if (error.status === 401 || error.status === 403) return;
          Sentry.captureException(error, { tags: { source: "swr" } });
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
