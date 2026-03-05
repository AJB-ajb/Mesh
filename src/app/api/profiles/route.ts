import { withAuth } from "@/lib/api/with-auth";
import { syncJoinTableRows } from "@/lib/api/sync-join-table";
import { triggerEmbeddingGenerationServer } from "@/lib/api/trigger-embedding-server";
import { logFireAndForget } from "@/lib/api/fire-and-forget";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
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
    throw new AppError("INTERNAL", "Failed to save profile", 500);
  }

  // Sync profile_skills join table
  const profileSkillRows = (body.selectedSkills ?? []).map((s) => ({
    profile_id: user.id,
    skill_id: s.skillId,
    level: s.level,
  }));
  await syncJoinTableRows(
    supabase,
    "profile_skills",
    "profile_id",
    user.id,
    profileSkillRows,
  );

  // Sync availability_windows
  const windowRows = (body.availabilityWindows ?? []).map((w) => ({
    profile_id: user.id,
    window_type: "recurring" as const,
    day_of_week: w.day_of_week,
    start_minutes: w.start_minutes,
    end_minutes: w.end_minutes,
  }));
  await syncJoinTableRows(
    supabase,
    "availability_windows",
    "profile_id",
    user.id,
    windowRows,
  );

  // Trigger embedding generation (fire-and-forget)
  logFireAndForget(triggerEmbeddingGenerationServer(), "embedding-generation");

  return apiSuccess({ success: true });
});
