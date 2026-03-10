/**
 * POST /api/auth/check-email
 *
 * Checks whether an email address is already registered via a different auth
 * provider (e.g. Google OAuth). Used by the signup page to prevent creation
 * of duplicate accounts with the same email.
 *
 * Request body: { email: string }
 * Response: { exists: boolean, providers?: string[] }
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, parseBody } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const { email } = await parseBody<{ email: string }>(request);

    if (!email || typeof email !== "string") {
      return apiError("VALIDATION", "Email is required", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const admin = createAdminClient();

    // Query auth.identities joined with auth.users to find OAuth providers
    // for this email. The admin client (service role) bypasses RLS.
    const { data, error } = await admin.rpc("get_providers_for_email", {
      lookup_email: normalizedEmail,
    });

    if (error) {
      // If the function doesn't exist yet, fall back to a direct query approach
      // using the admin user lookup
      console.warn(
        "[check-email] RPC not available, using admin user listing:",
        error.message,
      );
      return await fallbackCheck(admin, normalizedEmail);
    }

    const providers = (data as { provider: string }[])?.map((r) => r.provider);
    const oauthProviders = providers?.filter((p) => p !== "email") ?? [];

    if (oauthProviders.length === 0) {
      return apiSuccess({ exists: false });
    }

    return apiSuccess({ exists: true, providers: oauthProviders });
  } catch (err) {
    console.error("[check-email] Error:", err);
    return apiError("INTERNAL", "Internal server error", 500);
  }
}

/**
 * Fallback: use the admin API to list users and filter by email.
 * Less efficient but works without a custom RPC function.
 */
async function fallbackCheck(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
) {
  // Supabase admin listUsers — we'll paginate through to find the email.
  // For small user bases this is fine. For larger ones, deploy the RPC function.
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error || !data) {
      console.error("[check-email] Failed to list users:", error);
      return apiError("INTERNAL", "Failed to check email", 500);
    }

    const matchingUsers = data.users.filter(
      (u) => u.email?.toLowerCase() === email,
    );

    if (matchingUsers.length > 0) {
      const providers = matchingUsers.flatMap(
        (u) => u.identities?.map((id) => id.provider) ?? [],
      );
      const oauthProviders = providers.filter((p) => p !== "email");

      if (oauthProviders.length > 0) {
        return apiSuccess({ exists: true, providers: oauthProviders });
      }
    }

    // If we got fewer users than perPage, we've reached the end
    if ((data?.users?.length ?? 0) < perPage) {
      break;
    }
    page++;
  }

  return apiSuccess({ exists: false });
}
