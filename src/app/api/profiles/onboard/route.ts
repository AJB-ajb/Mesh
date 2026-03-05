import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, apiError, parseBody } from "@/lib/errors";
import { parseList } from "@/lib/types/profile";

export const POST = withAuth(async (req, { user, supabase }) => {
  const body = await parseBody<Record<string, string>>(req);

  const upsertData: Record<string, unknown> = {
    user_id: user.id,
    full_name: (body.fullName ?? "").trim(),
    headline: (body.headline ?? "").trim(),
    bio: (body.bio ?? "").trim(),
    location: (body.location ?? "").trim(),
    skills: parseList(body.skills ?? ""),
    interests: parseList(body.interests ?? ""),
    languages: parseList(body.languages ?? ""),
    portfolio_url: (body.portfolioUrl ?? "").trim(),
    github_url: (body.githubUrl ?? "").trim(),
    updated_at: new Date().toISOString(),
  };

  // Store source text if provided (text-first onboarding)
  if (body.sourceText) {
    upsertData.source_text = body.sourceText.trim();
  }

  const { error: upsertError } = await supabase
    .from("profiles")
    .upsert(upsertData, { onConflict: "user_id" });

  if (upsertError) {
    return apiError("INTERNAL", "Failed to save profile", 500);
  }

  await supabase.auth.updateUser({
    data: { profile_completed: true },
  });

  return apiSuccess({ success: true }, 201);
});
