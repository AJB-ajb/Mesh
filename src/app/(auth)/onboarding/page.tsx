"use client";

import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";
import { createClient } from "@/lib/supabase/client";

type Persona = "developer" | "project_owner";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState<Persona | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasCheckedUser = useRef(false);

  const next = useMemo(() => {
    const value = searchParams.get("next") ?? "";
    return value && !value.startsWith("/onboarding") ? value : "";
  }, [searchParams]);

  useEffect(() => {
    // Only run once on initial mount
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

      // Check if user already has a profile in the database (existing user)
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        // Existing user with profile - go to dashboard
        router.replace(next || "/dashboard");
        return;
      }

      // Check if user has projects
      const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .eq("creator_id", user.id)
        .limit(1);

      if (projects && projects.length > 0) {
        // Existing user with projects - go to dashboard
        router.replace(next || "/dashboard");
        return;
      }

      // New user - redirect to onboarding form
      const profileCompleted = user.user_metadata?.profile_completed;
      if (!profileCompleted) {
        router.replace(
          `/onboarding/developer${next ? `?next=${encodeURIComponent(next)}` : ""}`,
        );
        return;
      }

      // User has completed profile
      router.replace(next || "/dashboard");
    };

    checkUser().catch(() => {
      router.replace("/login");
    });
  }, [next, router]);

  const handleSelect = async (persona: Persona) => {
    setError(null);
    setIsLoading(persona);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        persona,
        profile_completed: persona !== "developer",
      },
    });

    if (updateError) {
      setIsLoading(null);
      setError("We couldn't save your choice. Please try again.");
      return;
    }

    // Use push instead of replace for more reliable navigation
    const destination =
      persona === "developer" ? "/onboarding/developer" : "/projects/new";

    // If there's a custom next destination and it's not an onboarding route, use it
    const finalDestination =
      next && !next.startsWith("/onboarding")
        ? persona === "developer"
          ? "/onboarding/developer"
          : next
        : destination;

    router.push(finalDestination);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border/50 px-6 lg:px-8">
        <Logo />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16 lg:px-8">
        <div className="w-full max-w-3xl space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-semibold">Tell us why youre here</h1>
            <p className="mt-2 text-muted-foreground">
              Well tailor your experience based on your goal.
            </p>
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Apply as a developer</CardTitle>
                <CardDescription>
                  Create your profile and get matched to projects that need your
                  skills.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => handleSelect("developer")}
                  disabled={isLoading !== null}
                >
                  {isLoading === "developer" ? "Saving..." : "I'm a developer"}
                </Button>
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <CardTitle>Post a project</CardTitle>
                <CardDescription>
                  Share your requirements and find developers who match your
                  needs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handleSelect("project_owner")}
                  disabled={isLoading !== null}
                >
                  {isLoading === "project_owner"
                    ? "Saving..."
                    : "I'm looking for developers"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
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
