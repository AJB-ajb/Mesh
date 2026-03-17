import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PublicProfileView from "@/components/profile/public-profile-view";
import type { PublicProfile } from "@/components/profile/public-profile-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("full_name, headline")
    .eq("user_id", userId)
    .single();

  if (!data) return { title: "Profile" };

  const title = data.full_name ?? "Profile";
  const description = data.headline ?? `${title}'s profile on Mesh`;

  return {
    title,
    description,
    openGraph: { title, description },
  };
}

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
      "user_id, full_name, headline, bio, location_mode, location, profile_skills(skill_id, level, skill_nodes(id, name))",
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
