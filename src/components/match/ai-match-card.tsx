import Link from "next/link";
import { Check, MessageSquare, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  MatchResponse,
  Posting as BasePosting,
} from "@/lib/supabase/types";

type Posting = BasePosting & { skills?: string[] };

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  applied: "bg-info/10 text-info",
  accepted: "bg-success/10 text-success",
  declined: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  applied: "Requested",
  accepted: "Accepted",
  declined: "Declined",
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }
}

export interface AiMatchCardProps {
  match: MatchResponse;
  isApplying: boolean;
  onApply: (matchId: string) => void;
}

export function AiMatchCard({ match, isApplying, onApply }: AiMatchCardProps) {
  const posting = match.posting as Posting;
  const matchScore = Math.round(match.score * 100);
  const matchedAt = formatTimeAgo(match.created_at);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl">
                <Link href={`/matches/${match.id}`} className="hover:underline">
                  {posting.title}
                </Link>
              </CardTitle>
              <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                {matchScore}% match
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  statusColors[match.status] ?? ""
                }`}
              >
                {statusLabels[match.status] ?? match.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Matched {matchedAt}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Why you matched */}
        {match.explanation && (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Why you matched
            </p>
            <p className="text-sm">{match.explanation}</p>
          </div>
        )}

        {/* Posting description */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {posting.description}
        </p>

        {/* Skills */}
        {posting.skills && posting.skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {posting.skills.slice(0, 5).map((skill) => (
              <span
                key={skill}
                className="rounded-md border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium"
              >
                {skill}
              </span>
            ))}
            {posting.skills.length > 5 && (
              <span className="rounded-md border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium">
                +{posting.skills.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {match.status === "pending" && (
            <Button
              className="flex-1 sm:flex-none"
              onClick={() => onApply(match.id)}
              disabled={isApplying}
            >
              {isApplying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Request to join
            </Button>
          )}
          {match.status === "applied" && (
            <Button variant="secondary" disabled>
              Request sent
            </Button>
          )}
          {match.status === "accepted" && (
            <Button asChild>
              <Link href={`/inbox`}>
                <MessageSquare className="h-4 w-4" />
                Message Team
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={`/matches/${match.id}`}>View Details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
