"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { labels } from "@/lib/labels";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";
import { AiExtractionCard } from "@/components/posting/ai-extraction-card";
import { createClient } from "@/lib/supabase/client";
import {
  type ProfileFormState,
  defaultFormState,
  parseList,
  mapExtractedToFormState,
  type ExtractedProfileV2,
} from "@/lib/types/profile";

type InputMode = "form" | "ai";

function DeveloperOnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<ProfileFormState>(defaultFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("form");
  const [aiText, setAiText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionSuccess, setExtractionSuccess] = useState(false);

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
            "full_name, headline, bio, location, skills, interests, languages, portfolio_url, github_url",
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching profile:", error);
        }

        if (data) {
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

  const handleChange = (field: keyof ProfileFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAiExtract = async () => {
    if (!aiText.trim()) {
      setError(labels.onboarding.errorEmptyText);
      return;
    }

    setError(null);
    setIsExtracting(true);
    setExtractionSuccess(false);

    try {
      const response = await fetch("/api/extract/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message ?? data.error ?? "Failed to extract profile",
        );
      }

      const extracted: ExtractedProfileV2 = data.profile;
      setForm((prev) => mapExtractedToFormState(extracted, prev));

      setExtractionSuccess(true);
      setTimeout(() => {
        setInputMode("form");
        setExtractionSuccess(false);
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to extract profile",
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsSaving(false);
      setError(labels.onboarding.errorNotSignedIn);
      return;
    }

    const { error: upsertError } = await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        full_name: form.fullName.trim(),
        headline: form.headline.trim(),
        bio: form.bio.trim(),
        location: form.location.trim(),
        skills: parseList(form.skills),
        interests: parseList(form.interests),
        languages: parseList(form.languages),
        portfolio_url: form.portfolioUrl.trim(),
        github_url: form.githubUrl.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (upsertError) {
      setIsSaving(false);
      setError(labels.onboarding.errorSaveFailed);
      return;
    }

    await supabase.auth.updateUser({
      data: { profile_completed: true },
    });

    const destination = next || "/active";
    router.replace(destination);
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border/50 px-6 lg:px-8">
        <Logo />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12 lg:px-8">
        <form onSubmit={handleSubmit} className="w-full max-w-3xl space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-semibold">
              {labels.onboarding.pageTitle}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {labels.onboarding.pageSubtitle}
            </p>
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {/* Input Mode Toggle */}
          <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setInputMode("form")}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                inputMode === "form"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-4 w-4" />
              {labels.inputModeToggle.formButton}
            </button>
            <button
              type="button"
              onClick={() => setInputMode("ai")}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                inputMode === "ai"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              {labels.inputModeToggle.aiButton}
            </button>
          </div>

          {/* AI Text Input Mode */}
          {inputMode === "ai" && (
            <AiExtractionCard
              aiText={aiText}
              onAiTextChange={setAiText}
              isExtracting={isExtracting}
              extractionSuccess={extractionSuccess}
              onExtract={handleAiExtract}
              onSwitchToForm={() => setInputMode("form")}
              variant="profile"
            />
          )}

          {/* Traditional Form Mode */}
          {inputMode === "form" && (
            <Card>
              <CardHeader>
                <CardTitle>{labels.onboarding.generalInfoTitle}</CardTitle>
                <CardDescription>
                  {labels.onboarding.generalInfoDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="fullName" className="text-sm font-medium">
                      {labels.onboarding.fullNameLabel}
                    </label>
                    <Input
                      id="fullName"
                      value={form.fullName}
                      onChange={(event) =>
                        handleChange("fullName", event.target.value)
                      }
                      placeholder={labels.onboarding.fullNamePlaceholder}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="headline" className="text-sm font-medium">
                      {labels.onboarding.headlineLabel}
                    </label>
                    <Input
                      id="headline"
                      value={form.headline}
                      onChange={(event) =>
                        handleChange("headline", event.target.value)
                      }
                      placeholder={labels.onboarding.headlinePlaceholder}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="bio" className="text-sm font-medium">
                    {labels.onboarding.bioLabel}
                  </label>
                  <Textarea
                    id="bio"
                    rows={4}
                    value={form.bio}
                    onChange={(event) =>
                      handleChange("bio", event.target.value)
                    }
                    placeholder={labels.onboarding.bioPlaceholder}
                    enableMic
                    onTranscriptionChange={(text) =>
                      handleChange(
                        "bio",
                        form.bio ? form.bio + " " + text : text,
                      )
                    }
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="location" className="text-sm font-medium">
                      {labels.onboarding.locationLabel}
                    </label>
                    <Input
                      id="location"
                      value={form.location}
                      onChange={(event) =>
                        handleChange("location", event.target.value)
                      }
                      placeholder={labels.onboarding.locationPlaceholder}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="languages" className="text-sm font-medium">
                      {labels.onboarding.languagesLabel}
                    </label>
                    <Input
                      id="languages"
                      value={form.languages}
                      onChange={(event) =>
                        handleChange("languages", event.target.value)
                      }
                      placeholder={labels.onboarding.languagesPlaceholder}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="skills" className="text-sm font-medium">
                      {labels.onboarding.skillsLabel}
                    </label>
                    <Input
                      id="skills"
                      value={form.skills}
                      onChange={(event) =>
                        handleChange("skills", event.target.value)
                      }
                      placeholder={labels.onboarding.skillsPlaceholder}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="interests" className="text-sm font-medium">
                      {labels.onboarding.interestsLabel}
                    </label>
                    <Input
                      id="interests"
                      value={form.interests}
                      onChange={(event) =>
                        handleChange("interests", event.target.value)
                      }
                      placeholder={labels.onboarding.interestsPlaceholder}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor="portfolioUrl"
                      className="text-sm font-medium"
                    >
                      {labels.onboarding.portfolioLabel}
                    </label>
                    <Input
                      id="portfolioUrl"
                      value={form.portfolioUrl}
                      onChange={(event) =>
                        handleChange("portfolioUrl", event.target.value)
                      }
                      placeholder={labels.onboarding.portfolioPlaceholder}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="githubUrl" className="text-sm font-medium">
                      {labels.onboarding.githubLabel}
                    </label>
                    <Input
                      id="githubUrl"
                      value={form.githubUrl}
                      onChange={(event) =>
                        handleChange("githubUrl", event.target.value)
                      }
                      placeholder={labels.onboarding.githubPlaceholder}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="submit" disabled={isSaving || isExtracting}>
              {isSaving
                ? labels.onboarding.savingButton
                : labels.onboarding.saveButton}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.replace(next || "/active")}
            >
              {labels.onboarding.skipButton}
            </Button>
          </div>
        </form>
      </main>
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
