"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import useSWR from "swr";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/format";

type PublicProfile = {
  user_id: string;
  full_name: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[] | null;
  location_mode: string | null;
  location_name: string | null;
};

async function fetchPublicProfile(key: string): Promise<PublicProfile | null> {
  const userId = key.split("/")[1];
  const supabase = createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "user_id, full_name, headline, bio, skills, location_mode, location_name",
    )
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data as PublicProfile;
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
          Back to postings
        </Link>
        <Card>
          <CardContent className="flex min-h-[200px] flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Profile not found.</p>
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
        Back to postings
      </Link>

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-lg font-medium">
          {getInitials(profile.full_name)}
        </div>
        <div>
          <h1 className="text-2xl font-bold">
            {profile.full_name || "Unknown User"}
          </h1>
          {profile.headline && (
            <p className="text-muted-foreground">{profile.headline}</p>
          )}
        </div>
      </div>

      {profile.bio && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {profile.bio}
            </p>
          </CardContent>
        </Card>
      )}

      {profile.skills && profile.skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
