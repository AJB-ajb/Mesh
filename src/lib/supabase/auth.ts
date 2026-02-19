import { createClient } from "./client";

/**
 * Gets the authenticated user or throws an error.
 * Returns both the Supabase client and user since most callers need both.
 *
 * @throws {Error} if the user is not authenticated
 */
export async function getUserOrThrow() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return { supabase, user };
}
