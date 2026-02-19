"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import useSWR from "swr";
import { labels } from "@/lib/labels";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/format";

function skillLevelLabel(level: number): string {
  if (level <= 2) return labels.publicProfile.skillLevels.beginner;
  if (level <= 4) return labels.publicProfile.skillLevels.canFollowTutorials;
  if (level <= 6) return labels.publicProfile.skillLevels.intermediate;
  if (level <= 8) return labels.publicProfile.skillLevels.advanced;
  return labels.publicProfile.skillLevels.expert;
}

type ProfileSkillRow = {
  skill_id: string;
  level: number;
  skill_nodes: { id: string; name: string } | null;
};

type PublicProfile = {
  user_id: string;
  full_name: string | null;
  headline: string | null;
  bio: string | null;
  location_mode: string | null;
  location_name: string | null;
  profile_skills: ProfileSkillRow[];
};

async function fetchPublicProfile(key: string): Promise<PublicProfile | null> {
  const userId = key.split("/")[1];
  const supabase = createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "user_id, full_name, headline, bio, location_mode, location_name, profile_skills(skill_id, level, skill_nodes(id, name))",
    )
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data as unknown as PublicProfile;
}

export default function PublicProfilePage() {
  const params = useParams();
  const userId = params.userId as string;

  const { data: profile, isLoading } = useSWR(
    `public-profile/${userId}`,
    fetchPublicProfile,
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <Link
          href="/postings"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {labels.common.backToPostings}
        </Link>
        <Card>
          <CardContent className="flex min-h-[200px] flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">
              {labels.publicProfile.profileNotFound}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/postings"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {labels.common.backToPostings}
      </Link>

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-lg font-medium">
          {getInitials(profile.full_name)}
        </div>
        <div>
          <h1 className="text-2xl font-bold">
            {profile.full_name || labels.common.unknownUser}
          </h1>
          {profile.headline && (
            <p className="text-muted-foreground">{profile.headline}</p>
          )}
        </div>
      </div>

      {profile.bio && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {labels.publicProfile.aboutTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {profile.bio}
            </p>
          </CardContent>
        </Card>
      )}

      {profile.profile_skills && profile.profile_skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {labels.publicProfile.skillsTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {profile.profile_skills
                .filter((ps) => ps.skill_nodes)
                .map((ps) => (
                  <div key={ps.skill_id} className="flex items-center gap-3">
                    <span className="w-32 truncate text-sm font-medium">
                      {ps.skill_nodes!.name}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(ps.level / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-24 text-right">
                      {ps.level}/10 ({skillLevelLabel(ps.level)})
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
