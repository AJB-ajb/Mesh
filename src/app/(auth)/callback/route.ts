import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Trigger async GitHub profile sync
 * Fires and forgets - doesn't block the OAuth flow
 */
async function triggerGitHubSync(origin: string): Promise<void> {
  try {
    // Fire and forget - don't await
    fetch(`${origin}/api/github/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }).catch((err) => {
      console.error("[OAuth Callback] GitHub sync trigger failed:", err);
    });
  } catch (err) {
    console.error("[OAuth Callback] Failed to trigger GitHub sync:", err);
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/active";
  const isLinking = searchParams.get("link") === "true";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.redirect(
          `${origin}/login?error=Authentication%20failed`,
        );
      }

      // Check if any identity is GitHub - trigger async profile sync
      const identities = user.identities || [];
      const hasGithubIdentity = identities.some(
        (identity: { provider: string }) => identity.provider === "github",
      );

      if (hasGithubIdentity) {
        // Trigger GitHub profile extraction in background (async)
        triggerGitHubSync(origin);
      }

      // If this was an account linking flow, redirect to settings
      if (isLinking) {
        return NextResponse.redirect(
          `${origin}/settings?success=Account%20linked%20successfully`,
        );
      }

      // Regular sign-in/sign-up flow below
      // Check if user has a profile in the database (existing user)
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("user_id", user.id)
        .single();

      // If user has a profile in the database, they're an existing user - go to dashboard
      if (profile) {
        // Ensure profile_completed is set in metadata
        const profileCompleted = user.user_metadata?.profile_completed;
        if (!profileCompleted) {
          await supabase.auth.updateUser({
            data: {
              profile_completed: true,
            },
          });
        }
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Check if user has projects (existing user)
      const { data: projects } = await supabase
        .from("postings")
        .select("id")
        .eq("creator_id", user.id)
        .limit(1);

      if (projects && projects.length > 0) {
        // Existing user with projects - ensure profile_completed is set
        const profileCompleted = user.user_metadata?.profile_completed;
        if (!profileCompleted) {
          await supabase.auth.updateUser({
            data: {
              profile_completed: true,
            },
          });
        }
        return NextResponse.redirect(`${origin}${next}`);
      }

      // New user - send directly to onboarding form
      // Check if profile is completed
      const profileCompleted = user.user_metadata?.profile_completed;

      if (!profileCompleted) {
        // Brand new user - send directly to posting creation for fast onboarding
        // Profile will be auto-created when they submit their first posting
        const destination = next === "/active" ? "/postings/new" : next;
        return NextResponse.redirect(`${origin}${destination}`);
      }

      // User has completed profile
      return NextResponse.redirect(`${origin}${next}`);
    } else {
      // Handle linking errors
      if (isLinking) {
        const errorMessage = error.message || "Failed to link account";
        return NextResponse.redirect(
          `${origin}/settings?error=${encodeURIComponent(errorMessage)}`,
        );
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Authentication%20failed`);
}
