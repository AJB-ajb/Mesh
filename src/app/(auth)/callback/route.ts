import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const next = searchParams.get("next") ?? "/posts";
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

      // --- Duplicate account detection ---
      // Check if another auth.users record shares this email (created by a
      // different provider). If so, this OAuth sign-in created a duplicate.
      // Redirect the user to login with their original method instead.
      if (!isLinking && user.email) {
        try {
          const admin = createAdminClient();
          // Search through users to find duplicates with the same email
          let page = 1;
          const perPage = 100;
          let foundDuplicate = false;

          outer: while (true) {
            const { data: listData } = await admin.auth.admin.listUsers({
              page,
              perPage,
            });
            if (!listData) break;

            for (const otherUser of listData.users) {
              if (
                otherUser.email?.toLowerCase() === user.email!.toLowerCase() &&
                otherUser.id !== user.id
              ) {
                foundDuplicate = true;
                break outer;
              }
            }

            if (listData.users.length < perPage) break;
            page++;
          }

          if (foundDuplicate) {
            // Sign out the duplicate session so the user can't proceed
            await supabase.auth.signOut();
            const errorMsg = encodeURIComponent(
              "An account already exists with this email using a different sign-in method. Please sign in with your original method, then link additional providers in Settings.",
            );
            return NextResponse.redirect(`${origin}/login?error=${errorMsg}`);
          }
        } catch (err) {
          // Log but don't block the flow if duplicate detection fails
          console.error("[OAuth Callback] Duplicate detection failed:", err);
        }
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
        const destination = next === "/posts" ? "/postings/new" : next;
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
