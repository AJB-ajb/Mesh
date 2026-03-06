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
        onError: (error: unknown) => {
          // Skip expected auth errors
          if (
            error instanceof Error &&
            "status" in error &&
            ((error as { status: number }).status === 401 ||
              (error as { status: number }).status === 403)
          )
            return;

          // Supabase returns plain objects ({ code, message, details, hint }),
          // not Error instances. Wrap them so Sentry captures a proper stack.
          const err =
            error instanceof Error
              ? error
              : new Error(
                  (error as { message?: string })?.message ??
                    "Unknown SWR error",
                  { cause: error },
                );

          Sentry.captureException(err, { tags: { source: "swr" } });
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
