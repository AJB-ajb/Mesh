"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, FileText, Loader2, CheckCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

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
import { createClient } from "@/lib/supabase/client";

type InputMode = "form" | "ai";

type ProfileFormState = {
  fullName: string;
  headline: string;
  bio: string;
  location: string;
  experienceLevel: string;
  collaborationStyle: string;
  availabilityHours: string;
  skills: string;
  interests: string;
  projectTypes: string;
  preferredRoles: string;
  preferredStack: string;
  commitmentLevel: string;
  timelinePreference: string;
  portfolioUrl: string;
  githubUrl: string;
};

const defaultFormState: ProfileFormState = {
  fullName: "",
  headline: "",
  bio: "",
  location: "",
  experienceLevel: "intermediate",
  collaborationStyle: "async",
  availabilityHours: "",
  skills: "",
  interests: "",
  projectTypes: "",
  preferredRoles: "",
  preferredStack: "",
  commitmentLevel: "10",
  timelinePreference: "1_month",
  portfolioUrl: "",
  githubUrl: "",
};

const parseList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

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
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(); // Use maybeSingle() to handle no rows without error

        if (error) {
          console.error("Error fetching profile:", error);
        }

        if (data) {
          const preferences = data.project_preferences ?? {};
          setForm({
            fullName: data.full_name ?? "",
            headline: data.headline ?? "",
            bio: data.bio ?? "",
            location: data.location ?? "",
            experienceLevel: data.experience_level ?? "intermediate",
            collaborationStyle: data.collaboration_style ?? "async",
            availabilityHours: data.availability_hours?.toString() ?? "",
            skills: Array.isArray(data.skills) ? data.skills.join(", ") : "",
            interests: Array.isArray(data.interests)
              ? data.interests.join(", ")
              : "",
            projectTypes: Array.isArray(preferences.project_types)
              ? preferences.project_types.join(", ")
              : "",
            preferredRoles: Array.isArray(preferences.preferred_roles)
              ? preferences.preferred_roles.join(", ")
              : "",
            preferredStack: Array.isArray(preferences.preferred_stack)
              ? preferences.preferred_stack.join(", ")
              : "",
            commitmentLevel: preferences.commitment_level ?? "10",
            timelinePreference: preferences.timeline_preference ?? "1_month",
            portfolioUrl: data.portfolio_url ?? "",
            githubUrl: data.github_url ?? "",
          });
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
      setError("Please paste some text to extract profile information from.");
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
        throw new Error(data.error || "Failed to extract profile");
      }

      const profile = data.profile;

      // Map extracted data to form state
      setForm({
        fullName: profile.full_name || form.fullName,
        headline: profile.headline || form.headline,
        bio: profile.bio || form.bio,
        location: profile.location || form.location,
        experienceLevel: profile.experience_level || form.experienceLevel,
        collaborationStyle:
          profile.collaboration_style || form.collaborationStyle,
        availabilityHours:
          profile.availability_hours?.toString() || form.availabilityHours,
        skills: Array.isArray(profile.skills)
          ? profile.skills.join(", ")
          : form.skills,
        interests: Array.isArray(profile.interests)
          ? profile.interests.join(", ")
          : form.interests,
        projectTypes: Array.isArray(profile.project_preferences?.project_types)
          ? profile.project_preferences.project_types.join(", ")
          : form.projectTypes,
        preferredRoles: Array.isArray(
          profile.project_preferences?.preferred_roles,
        )
          ? profile.project_preferences.preferred_roles.join(", ")
          : form.preferredRoles,
        preferredStack: Array.isArray(
          profile.project_preferences?.preferred_stack,
        )
          ? profile.project_preferences.preferred_stack.join(", ")
          : form.preferredStack,
        commitmentLevel:
          profile.project_preferences?.commitment_level || form.commitmentLevel,
        timelinePreference:
          profile.project_preferences?.timeline_preference ||
          form.timelinePreference,
        portfolioUrl: profile.portfolio_url || form.portfolioUrl,
        githubUrl: profile.github_url || form.githubUrl,
      });

      setExtractionSuccess(true);
      // Switch to form mode to review extracted data
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
      setError("Please sign in again to save your profile.");
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
        portfolio_url: form.portfolioUrl.trim(),
        github_url: form.githubUrl.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (upsertError) {
      setIsSaving(false);
      setError("We couldn't save your profile. Please try again.");
      return;
    }

    await supabase.auth.updateUser({
      data: { profile_completed: true },
    });

    const destination = next || "/dashboard";
    router.replace(destination);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading your profile…</p>
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
            <h1 className="text-3xl font-semibold">Complete your profile</h1>
            <p className="mt-2 text-muted-foreground">
              Tell us about yourself so we can help you find the right postings
              and collaborators.
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
              Fill Form
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
              AI Extract
            </button>
          </div>

          {/* AI Text Input Mode */}
          {inputMode === "ai" && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Profile Extraction
                </CardTitle>
                <CardDescription>
                  Paste your GitHub profile README, LinkedIn bio, resume, or use
                  the mic to describe yourself. Our AI will automatically
                  extract your profile information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  rows={12}
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  placeholder={`Paste your profile text here, or use the mic to describe yourself...

Example:
Hi, I'm Alex! I'm a full-stack developer with 5 years of experience.

Tech Stack: React, TypeScript, Node.js, PostgreSQL, AWS
Interests: AI/ML, fintech, developer tools
Based in San Francisco, available 15 hrs/week

Currently looking for hackathon projects and open source contributions.
Check out my work at github.com/alexdev`}
                  enableMic
                  onTranscriptionChange={(text) =>
                    setAiText((prev) => (prev ? prev + " " + text : text))
                  }
                />
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={handleAiExtract}
                    disabled={isExtracting || !aiText.trim()}
                    className="flex-1"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Extracting...
                      </>
                    ) : extractionSuccess ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Extracted!
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Extract Profile
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setInputMode("form")}
                  >
                    Switch to Form
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  After extraction, youll be able to review and edit the
                  extracted information.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Traditional Form Mode */}
          {inputMode === "form" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>General Information</CardTitle>
                  <CardDescription>
                    Share the essentials about who you are and how you like to
                    work.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="fullName" className="text-sm font-medium">
                        Full name
                      </label>
                      <Input
                        id="fullName"
                        value={form.fullName}
                        onChange={(event) =>
                          handleChange("fullName", event.target.value)
                        }
                        placeholder="e.g., Alex Johnson"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="headline" className="text-sm font-medium">
                        Headline
                      </label>
                      <Input
                        id="headline"
                        value={form.headline}
                        onChange={(event) =>
                          handleChange("headline", event.target.value)
                        }
                        placeholder="e.g., Full-stack developer"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="bio" className="text-sm font-medium">
                      About you
                    </label>
                    <Textarea
                      id="bio"
                      rows={4}
                      value={form.bio}
                      onChange={(event) =>
                        handleChange("bio", event.target.value)
                      }
                      placeholder="What do you enjoy building? What makes you unique?"
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
                        Location (optional)
                      </label>
                      <Input
                        id="location"
                        value={form.location}
                        onChange={(event) =>
                          handleChange("location", event.target.value)
                        }
                        placeholder="e.g., Lagos, Remote"
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="availabilityHours"
                        className="text-sm font-medium"
                      >
                        Availability (hrs/week)
                      </label>
                      <Input
                        id="availabilityHours"
                        value={form.availabilityHours}
                        onChange={(event) =>
                          handleChange("availabilityHours", event.target.value)
                        }
                        placeholder="e.g., 10"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="experienceLevel"
                        className="text-sm font-medium"
                      >
                        Experience level
                      </label>
                      <select
                        id="experienceLevel"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={form.experienceLevel}
                        onChange={(event) =>
                          handleChange("experienceLevel", event.target.value)
                        }
                      >
                        <option value="junior">Junior</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="senior">Senior</option>
                        <option value="lead">Lead</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="collaborationStyle"
                        className="text-sm font-medium"
                      >
                        Collaboration style
                      </label>
                      <select
                        id="collaborationStyle"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={form.collaborationStyle}
                        onChange={(event) =>
                          handleChange("collaborationStyle", event.target.value)
                        }
                      >
                        <option value="async">Mostly async</option>
                        <option value="sync">Mostly sync</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="skills" className="text-sm font-medium">
                        Skills (comma-separated)
                      </label>
                      <Input
                        id="skills"
                        value={form.skills}
                        onChange={(event) =>
                          handleChange("skills", event.target.value)
                        }
                        placeholder="e.g., React, TypeScript, Supabase"
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="interests"
                        className="text-sm font-medium"
                      >
                        Interests (comma-separated)
                      </label>
                      <Input
                        id="interests"
                        value={form.interests}
                        onChange={(event) =>
                          handleChange("interests", event.target.value)
                        }
                        placeholder="e.g., AI, fintech, education"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="portfolioUrl"
                        className="text-sm font-medium"
                      >
                        Portfolio link (optional)
                      </label>
                      <Input
                        id="portfolioUrl"
                        value={form.portfolioUrl}
                        onChange={(event) =>
                          handleChange("portfolioUrl", event.target.value)
                        }
                        placeholder="https://your-portfolio.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="githubUrl"
                        className="text-sm font-medium"
                      >
                        GitHub link (optional)
                      </label>
                      <Input
                        id="githubUrl"
                        value={form.githubUrl}
                        onChange={(event) =>
                          handleChange("githubUrl", event.target.value)
                        }
                        placeholder="https://github.com/username"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Posting Preferences</CardTitle>
                  <CardDescription>
                    Tell us what kinds of postings youre excited to join.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="projectTypes"
                        className="text-sm font-medium"
                      >
                        Posting types (comma-separated)
                      </label>
                      <Input
                        id="projectTypes"
                        value={form.projectTypes}
                        onChange={(event) =>
                          handleChange("projectTypes", event.target.value)
                        }
                        placeholder="e.g., SaaS, hackathon, open source"
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="preferredRoles"
                        className="text-sm font-medium"
                      >
                        Preferred roles (comma-separated)
                      </label>
                      <Input
                        id="preferredRoles"
                        value={form.preferredRoles}
                        onChange={(event) =>
                          handleChange("preferredRoles", event.target.value)
                        }
                        placeholder="e.g., Frontend, Backend, PM"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="preferredStack"
                      className="text-sm font-medium"
                    >
                      Preferred tech stack (comma-separated)
                    </label>
                    <Input
                      id="preferredStack"
                      value={form.preferredStack}
                      onChange={(event) =>
                        handleChange("preferredStack", event.target.value)
                      }
                      placeholder="e.g., React, Node, Postgres"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="commitmentLevel"
                        className="text-sm font-medium"
                      >
                        Time commitment
                      </label>
                      <select
                        id="commitmentLevel"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={form.commitmentLevel}
                        onChange={(event) =>
                          handleChange("commitmentLevel", event.target.value)
                        }
                      >
                        <option value="5">5 hrs/week</option>
                        <option value="10">10 hrs/week</option>
                        <option value="15">15 hrs/week</option>
                        <option value="20">20+ hrs/week</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="timelinePreference"
                        className="text-sm font-medium"
                      >
                        Timeline preference
                      </label>
                      <select
                        id="timelinePreference"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={form.timelinePreference}
                        onChange={(event) =>
                          handleChange("timelinePreference", event.target.value)
                        }
                      >
                        <option value="weekend">This weekend</option>
                        <option value="1_week">1 week</option>
                        <option value="1_month">1 month</option>
                        <option value="ongoing">Ongoing</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="submit" disabled={isSaving || isExtracting}>
              {isSaving ? "Saving..." : "Save profile"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.replace(next || "/dashboard")}
            >
              Skip for now
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
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <DeveloperOnboardingContent />
    </Suspense>
  );
}
