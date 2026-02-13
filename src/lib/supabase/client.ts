import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and restart `pnpm dev`.",
    );
  }

  return createBrowserClient(url, publishableKey, {
    db: {
      schema: "public",
    },
    global: {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    },
  });
}
