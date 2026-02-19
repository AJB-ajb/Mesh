import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInitials, formatTimeAgo } from "@/lib/format";
import type { InterestReceived } from "@/lib/hooks/use-interests";

const statusColors = {
  interested: "bg-pink-500/10 text-pink-600",
};

export interface InterestReceivedCardProps {
  interest: InterestReceived;
}

export function InterestReceivedCard({ interest }: InterestReceivedCardProps) {
  const posting = interest.postings;
  const profile = interest.profiles;
  const profileName = profile?.full_name || "Unknown user";

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-lg">
                {profileName} is interested in your posting
              </CardTitle>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors.interested}`}
              >
                Interested
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatTimeAgo(interest.created_at)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Posting info */}
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Posting
          </p>
          <p className="text-sm font-medium">{posting?.title}</p>
        </div>

        {/* Interested user info */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
            {getInitials(profileName)}
          </div>
          <div>
            <p className="text-sm font-medium">{profileName}</p>
            {profile?.headline && (
              <p className="text-xs text-muted-foreground">
                {profile.headline}
              </p>
            )}
          </div>
        </div>

        {/* Interested user skills */}
        {profile?.skills && profile.skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {profile.skills.slice(0, 5).map((skill) => (
              <span
                key={skill}
                className="rounded-md border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium"
              >
                {skill}
              </span>
            ))}
            {profile.skills.length > 5 && (
              <span className="rounded-md border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium">
                +{profile.skills.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {posting && (
            <Button variant="outline" asChild>
              <Link href={`/postings/${posting.id}`}>View Posting</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
