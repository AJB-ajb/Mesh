"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasCheckedUser = useRef(false);

  const next = useMemo(() => {
    const value = searchParams.get("next") ?? "";
    return value && !value.startsWith("/onboarding") ? value : "";
  }, [searchParams]);

  useEffect(() => {
    if (hasCheckedUser.current) return;
    hasCheckedUser.current = true;

    const checkUser = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      // Check if user already has a profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        router.replace(next || "/active");
        return;
      }

      // Check if user has postings
      const { data: postings } = await supabase
        .from("postings")
        .select("id")
        .eq("creator_id", user.id)
        .limit(1);

      if (postings && postings.length > 0) {
        router.replace(next || "/active");
        return;
      }

      // New user — go straight to profile setup
      const profileCompleted = user.user_metadata?.profile_completed;
      if (!profileCompleted) {
        router.replace(
          `/onboarding/developer${next ? `?next=${encodeURIComponent(next)}` : ""}`,
        );
        return;
      }

      router.replace(next || "/active");
    };

    checkUser().catch(() => {
      router.replace("/login");
    });
  }, [next, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
