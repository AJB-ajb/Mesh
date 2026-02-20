import { withAuth } from "@/lib/api/with-auth";
import { triggerEmbeddingGenerationServer } from "@/lib/api/trigger-embedding-server";
import { apiSuccess, apiError, parseBody } from "@/lib/errors";
import { parseList } from "@/lib/types/profile";
import type { RecurringWindow } from "@/lib/types/availability";

interface ProfileBody {
  fullName?: string;
  headline?: string;
  bio?: string;
  location?: string;
  locationLat?: string;
  locationLng?: string;
  interests?: string;
  languages?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  locationMode?: string;
  availabilitySlots?: Record<string, string[]>;
  timezone?: string;
  selectedSkills?: { skillId: string; level: number }[];
  availabilityWindows?: RecurringWindow[];
}

export const PATCH = withAuth(async (req, { user, supabase }) => {
  const body = await parseBody<ProfileBody>(req);

  const locationLat = body.locationLat ? Number(body.locationLat) : NaN;
  const locationLng = body.locationLng ? Number(body.locationLng) : NaN;

  const { error: upsertError } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      full_name: (body.fullName ?? "").trim(),
      headline: (body.headline ?? "").trim(),
      bio: (body.bio ?? "").trim(),
      location: (body.location ?? "").trim(),
      location_lat: Number.isFinite(locationLat) ? locationLat : null,
      location_lng: Number.isFinite(locationLng) ? locationLng : null,
      interests: parseList(body.interests ?? ""),
      languages: parseList(body.languages ?? ""),
      portfolio_url: (body.portfolioUrl ?? "").trim(),
      github_url: (body.githubUrl ?? "").trim(),
      location_mode: body.locationMode || "either",
      availability_slots: body.availabilitySlots ?? {},
      timezone: body.timezone || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (upsertError) {
    return apiError("INTERNAL", "Failed to save profile", 500);
  }

  // Sync profile_skills join table
  await supabase.from("profile_skills").delete().eq("profile_id", user.id);

  if (body.selectedSkills && body.selectedSkills.length > 0) {
    const profileSkillRows = body.selectedSkills.map((s) => ({
      profile_id: user.id,
      skill_id: s.skillId,
      level: s.level,
    }));
    await supabase.from("profile_skills").insert(profileSkillRows);
  }

  // Sync availability_windows
  await supabase
    .from("availability_windows")
    .delete()
    .eq("profile_id", user.id);

  if (body.availabilityWindows && body.availabilityWindows.length > 0) {
    const windowRows = body.availabilityWindows.map((w) => ({
      profile_id: user.id,
      window_type: "recurring" as const,
      day_of_week: w.day_of_week,
      start_minutes: w.start_minutes,
      end_minutes: w.end_minutes,
    }));
    await supabase.from("availability_windows").insert(windowRows);
  }

  // Trigger embedding generation (fire-and-forget)
  triggerEmbeddingGenerationServer().catch(() => {});

  return apiSuccess({ success: true });
});
