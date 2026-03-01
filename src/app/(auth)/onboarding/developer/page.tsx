"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { labels } from "@/lib/labels";
import { Logo } from "@/components/layout/logo";
import { GuidedPrompts } from "@/components/profile/guided-prompts";
import { createClient } from "@/lib/supabase/client";
import { type ProfileFormState, defaultFormState } from "@/lib/types/profile";

function DeveloperOnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<ProfileFormState>(defaultFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [hasExistingData, setHasExistingData] = useState(false);
  const [showGuidedPrompts, setShowGuidedPrompts] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const next = useMemo(() => {
    const value = searchParams.get("next") ?? "";
    return value && !value.startsWith("/onboarding") ? value : "";
  }, [searchParams]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth
      .getUser()
      .then(async ({ data: { user } }) => {
        if (!user) {
          router.replace("/login");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select(
            "full_name, headline, bio, location, skills, interests, languages, portfolio_url, github_url, source_text",
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching profile:", error);
        }

        if (data) {
          const hasData =
            !!data.full_name ||
            !!data.headline ||
            !!data.bio ||
            !!data.source_text ||
            (Array.isArray(data.skills) && data.skills.length > 0);

          queueMicrotask(() => {
            setHasExistingData(hasData);
          });

          if (hasData) {
            queueMicrotask(() => {
              setShowGuidedPrompts(false);
            });
          }

          if (data.source_text) {
            setText(data.source_text);
          }

          setForm((prev) => ({
            ...prev,
            fullName: data.full_name ?? "",
            headline: data.headline ?? "",
            bio: data.bio ?? "",
            location: data.location ?? "",
            skills: Array.isArray(data.skills) ? data.skills.join(", ") : "",
            interests: Array.isArray(data.interests)
              ? data.interests.join(", ")
              : "",
            languages: Array.isArray(data.languages)
              ? data.languages.join(", ")
              : "",
            portfolioUrl: data.portfolio_url ?? "",
            githubUrl: data.github_url ?? "",
          }));
        }
      })
      .catch(() => {
        router.replace("/login");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [router]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 200)}px`;
  }, [text]);

  const handleGuidedComplete = (assembledText: string) => {
    setText(assembledText);
    setShowGuidedPrompts(false);
  };

  const handleSkip = () => {
    const destination = next || "/active";
    router.replace(destination);
  };

  const handleSubmit = async () => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    setError(null);
    setIsSaving(true);

    try {
      const res = await fetch("/api/profiles/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          bio: form.bio || trimmedText,
          sourceText: trimmedText,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || labels.onboarding.errorSaveFailed);
        setIsSaving(false);
        return;
      }

      setIsSaving(false);
      router.replace(`/profile?extraction=pending`);
    } catch {
      setError(labels.onboarding.errorSaveFailed);
      setIsSaving(false);
    }
  };

  // Cmd/Ctrl+Enter shortcut
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">
          {labels.onboarding.loadingMessage}
        </p>
      </div>
    );
  }

  const showBlankSlate = !hasExistingData && !text && showGuidedPrompts;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border/50 px-6 lg:px-8">
        <Logo />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12 lg:px-8">
        <div className="w-full max-w-3xl space-y-6">
          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}

          {showBlankSlate ? (
            <GuidedPrompts
              onComplete={handleGuidedComplete}
              onSkip={handleSkip}
            />
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-3xl font-semibold">
                  {labels.onboarding.pageTitle}
                </h1>
                <p className="mt-2 text-muted-foreground">
                  {labels.onboarding.pageSubtitle}
                </p>
              </div>

              {/* Hero textarea */}
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={labels.profileTextFirst.textPlaceholder}
                rows={8}
                className="flex w-full rounded-lg border border-input bg-background px-4 py-3 text-lg leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                autoFocus
              />

              {/* Save button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={!text.trim() || isSaving}
                  size="lg"
                  className="h-11 sm:h-10"
                >
                  {isSaving
                    ? labels.profileTextFirst.savingButton
                    : labels.profileTextFirst.saveButton}
                </Button>
              </div>

              {/* Collapsible edit details */}
              <div className="border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex w-full items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <div>
                    <span className="font-medium">
                      {labels.profileTextFirst.editDetailsToggle}
                    </span>
                    <span className="ml-2 text-xs">
                      {labels.profileTextFirst.editDetailsHint}
                    </span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${showDetails ? "rotate-180" : ""}`}
                  />
                </button>

                {showDetails && (
                  <div className="mt-4 space-y-4">
                    <OnboardingFormFields form={form} setForm={setForm} />
                  </div>
                )}
              </div>

              {/* Skip button */}
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSkip}
                  className="h-10 sm:h-9"
                >
                  {labels.onboarding.skipButton}
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * Lightweight inline form fields for the collapsible "Edit details" section.
 * Avoids importing ProfileForm (which requires location/availability hooks).
 */
function OnboardingFormFields({
  form,
  setForm,
}: {
  form: ProfileFormState;
  setForm: React.Dispatch<React.SetStateAction<ProfileFormState>>;
}) {
  const handleChange = (field: keyof ProfileFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-medium">
            {labels.onboarding.fullNameLabel}
          </label>
          <input
            id="fullName"
            value={form.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
            placeholder={labels.onboarding.fullNamePlaceholder}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="headline" className="text-sm font-medium">
            {labels.onboarding.headlineLabel}
          </label>
          <input
            id="headline"
            value={form.headline}
            onChange={(e) => handleChange("headline", e.target.value)}
            placeholder={labels.onboarding.headlinePlaceholder}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="location" className="text-sm font-medium">
            {labels.onboarding.locationLabel}
          </label>
          <input
            id="location"
            value={form.location}
            onChange={(e) => handleChange("location", e.target.value)}
            placeholder={labels.onboarding.locationPlaceholder}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="languages" className="text-sm font-medium">
            {labels.onboarding.languagesLabel}
          </label>
          <input
            id="languages"
            value={form.languages}
            onChange={(e) => handleChange("languages", e.target.value)}
            placeholder={labels.onboarding.languagesPlaceholder}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="skills" className="text-sm font-medium">
            {labels.onboarding.skillsLabel}
          </label>
          <input
            id="skills"
            value={form.skills}
            onChange={(e) => handleChange("skills", e.target.value)}
            placeholder={labels.onboarding.skillsPlaceholder}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="interests" className="text-sm font-medium">
            {labels.onboarding.interestsLabel}
          </label>
          <input
            id="interests"
            value={form.interests}
            onChange={(e) => handleChange("interests", e.target.value)}
            placeholder={labels.onboarding.interestsPlaceholder}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>
    </div>
  );
}

export default function DeveloperOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-sm text-muted-foreground">
            {labels.onboarding.suspenseFallback}
          </p>
        </div>
      }
    >
      <DeveloperOnboardingContent />
    </Suspense>
  );
}
