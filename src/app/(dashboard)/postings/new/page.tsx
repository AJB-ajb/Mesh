"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { InputModeToggle } from "@/components/posting/input-mode-toggle";
import { AiExtractionCard } from "@/components/posting/ai-extraction-card";
import {
  PostingFormCard,
  defaultFormState,
} from "@/components/posting/posting-form-card";
import type { InputMode } from "@/components/posting/input-mode-toggle";
import type { PostingFormState } from "@/components/posting/posting-form-card";

const parseList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export default function NewPostingPage() {
  const router = useRouter();
  const [form, setForm] = useState<PostingFormState>(defaultFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("ai");
  const [aiText, setAiText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionSuccess, setExtractionSuccess] = useState(false);

  const handleChange = (field: keyof PostingFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAiExtract = async () => {
    if (!aiText.trim()) {
      setError("Please paste some text to extract posting information from.");
      return;
    }

    setError(null);
    setIsExtracting(true);
    setExtractionSuccess(false);

    try {
      const response = await fetch("/api/extract/posting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract posting");
      }

      const extracted = data.posting;

      // Map extracted data to form state
      const extractedMax =
        extracted.team_size_max?.toString() || form.lookingFor;
      setForm((prev) => ({
        ...prev,
        title: extracted.title || prev.title,
        description: extracted.description || prev.description,
        skills: Array.isArray(extracted.skills)
          ? extracted.skills.join(", ")
          : prev.skills,
        estimatedTime: extracted.estimated_time || prev.estimatedTime,
        teamSizeMin: "1",
        teamSizeMax: extractedMax,
        lookingFor: extractedMax,
        category: extracted.category || prev.category,
        mode: extracted.mode || prev.mode,
      }));

      setExtractionSuccess(true);
      // Switch to form mode to review extracted data
      setTimeout(() => {
        setInputMode("form");
        setExtractionSuccess(false);
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to extract posting",
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!form.description.trim()) {
      setError("Please enter a posting description.");
      return;
    }

    // Auto-generate title from description if not provided
    const title =
      form.title.trim() ||
      form.description.trim().split(/[.\n]/)[0].slice(0, 100) ||
      "Untitled Posting";

    setIsSaving(true);

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsSaving(false);
      setError("Please sign in to create a posting.");
      return;
    }

    // First check if user has a profile (required for creator_id foreign key)
    const { data: profile, error: profileCheckError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .single();

    if (profileCheckError && profileCheckError.code !== "PGRST116") {
      // PGRST116 is "not found" which is expected if profile doesn't exist
      setIsSaving(false);
      console.error("Profile check error:", profileCheckError);
      setError("Failed to verify your profile. Please try again.");
      return;
    }

    if (!profile) {
      // Create a minimal profile if it doesn't exist
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: user.id,
        full_name:
          user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      });

      if (profileError) {
        setIsSaving(false);
        console.error("Profile creation error:", profileError);
        setError(
          `Failed to create user profile: ${profileError.message || "Please try again."}`,
        );
        return;
      }
    }

    // Use the form's expiry date, falling back to 90 days from now
    const lookingFor = Math.max(1, Math.min(10, Number(form.lookingFor) || 3));
    const expiresAt = form.expiresAt
      ? new Date(form.expiresAt + "T23:59:59")
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    const locationLat = parseFloat(form.locationLat);
    const locationLng = parseFloat(form.locationLng);
    const maxDistanceKm = parseInt(form.maxDistanceKm, 10);

    const { data: posting, error: insertError } = await supabase
      .from("postings")
      .insert({
        creator_id: user.id,
        title,
        description: form.description.trim(),
        skills: parseList(form.skills),
        estimated_time: form.estimatedTime || null,
        team_size_min: 1,
        team_size_max: lookingFor,
        category: form.category,
        mode: form.mode,
        status: "open",
        expires_at: expiresAt.toISOString(),
        location_mode: form.locationMode || "either",
        location_name: form.locationName.trim() || null,
        location_lat: Number.isFinite(locationLat) ? locationLat : null,
        location_lng: Number.isFinite(locationLng) ? locationLng : null,
        max_distance_km:
          Number.isFinite(maxDistanceKm) && maxDistanceKm > 0
            ? maxDistanceKm
            : null,
      })
      .select()
      .single();

    setIsSaving(false);

    if (insertError) {
      console.error("Insert error:", insertError);

      // Provide more specific error messages
      let errorMessage = "Failed to create posting. Please try again.";

      if (insertError.code === "23503") {
        // Foreign key violation - profile doesn't exist
        errorMessage =
          "Your profile is missing. Please complete your profile first.";
      } else if (insertError.code === "23505") {
        // Unique violation
        errorMessage = "A posting with this information already exists.";
      } else if (insertError.code === "23514") {
        // Check constraint violation
        errorMessage = `Invalid posting data: ${insertError.message}`;
      } else if (insertError.message) {
        errorMessage = `Failed to create posting: ${insertError.message}`;
      }

      setError(errorMessage);
      return;
    }

    // Trigger embedding generation (fire-and-forget, non-blocking)
    fetch("/api/embeddings/process", {
      method: "POST",
      headers: { "x-internal-call": "true" },
    }).catch(() => {});

    // Redirect to the new posting's page
    router.push(`/postings/${posting.id}`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back link */}
      <Link
        href="/postings"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to postings
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Posting</h1>
        <p className="mt-1 text-muted-foreground">
          Describe your posting and let AI find the perfect collaborators
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <InputModeToggle inputMode={inputMode} onModeChange={setInputMode} />

      {inputMode === "ai" && (
        <AiExtractionCard
          aiText={aiText}
          onAiTextChange={setAiText}
          isExtracting={isExtracting}
          extractionSuccess={extractionSuccess}
          onExtract={handleAiExtract}
          onSwitchToForm={() => setInputMode("form")}
        />
      )}

      {inputMode === "form" && (
        <PostingFormCard
          form={form}
          onChange={handleChange}
          onSubmit={handleSubmit}
          isSaving={isSaving}
          isExtracting={isExtracting}
        />
      )}

      {/* Info */}
      <p className="text-center text-sm text-muted-foreground">
        {inputMode === "ai"
          ? "Paste your posting description and let AI extract the details automatically."
          : "After creating your posting, our AI will immediately start finding matching collaborators based on your description."}
      </p>
    </div>
  );
}
