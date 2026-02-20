import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, apiError, parseBody } from "@/lib/errors";
import { parseList } from "@/lib/types/profile";

export const POST = withAuth(async (req, { user, supabase }) => {
  const body = await parseBody<Record<string, string>>(req);

  const { error: upsertError } = await supabase.from("profiles").upsert(
    {
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
    },
    { onConflict: "user_id" },
  );

  if (upsertError) {
    return apiError("INTERNAL", "Failed to save profile", 500);
  }

  const { error: authUpdateError } = await supabase.auth.updateUser({
    data: { profile_completed: true },
  });

  if (authUpdateError) {
    console.error("Failed to mark profile as completed:", authUpdateError);
  }

  return apiSuccess({ success: true }, 201);
});
