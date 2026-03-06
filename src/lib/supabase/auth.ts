import { createClient } from "./client";

/**
 * Waits for the Supabase browser client to finish restoring the session
 * from cookies. On the server this resolves immediately. On the client
 * it listens for the first `onAuthStateChange` event (which fires once
 * the session is hydrated) and caches the result for subsequent calls.
 */
let sessionReady: Promise<void> | null = null;

function waitForSession(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (sessionReady) return sessionReady;

  const supabase = createClient();

  // Guard: test mocks may not provide onAuthStateChange
  if (typeof supabase.auth.onAuthStateChange !== "function") {
    sessionReady = Promise.resolve();
    return sessionReady;
  }

  sessionReady = new Promise<void>((resolve) => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      subscription.unsubscribe();
      resolve();
    });
    // Safety timeout — don't block forever if no event fires
    setTimeout(resolve, 2000);
  });
  return sessionReady;
}

/** @internal Reset cached session promise (for tests). */
export function _resetSessionReady() {
  sessionReady = null;
}

/**
 * Gets the authenticated user or throws an error.
 * Returns both the Supabase client and user since most callers need both.
 *
 * On the client, waits for the session to be hydrated before checking auth
 * to avoid false negatives on initial page load.
 *
 * @throws {Error} if the user is not authenticated
 */
export async function getUserOrThrow() {
  await waitForSession();
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return { supabase, user };
}
