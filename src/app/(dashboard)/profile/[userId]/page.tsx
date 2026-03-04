import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PublicProfileView from "@/components/profile/public-profile-view";
import type { PublicProfile } from "@/components/profile/public-profile-view";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "user_id, full_name, headline, bio, location_mode, location_name, profile_skills(skill_id, level, skill_nodes(id, name))",
    )
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    notFound();
  }

  const profile = data as unknown as PublicProfile;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PublicProfileView
      profile={profile}
      currentUserId={user?.id ?? null}
      profileUserId={userId}
    />
  );
}
