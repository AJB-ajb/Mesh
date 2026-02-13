import Link from "next/link";
import {
  Users,
  Calendar,
  MapPin,
  Loader2,
  Sparkles,
  Heart,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatScore } from "@/lib/matching/scoring";
import { getInitials } from "@/lib/format";
import type { PostingWithScore } from "@/lib/hooks/use-postings";

const categoryStyles: Record<string, string> = {
  study: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  hackathon:
    "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400",
  personal:
    "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400",
  professional:
    "bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-400",
  social: "bg-pink-500/10 text-pink-700 border-pink-500/20 dark:text-pink-400",
};

function getLocationLabel(
  locationMode: string | null,
  locationName: string | null,
) {
  switch (locationMode) {
    case "remote":
      return "🏠 Remote";
    case "in_person":
      return `📍 ${locationName || "In-person"}`;
    case "either":
      return `🌐 ${locationName || "Either"}`;
    default:
      return null;
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
};

export interface PostingDiscoverCardProps {
  posting: PostingWithScore;
  isOwner: boolean;
  isAlreadyInterested: boolean;
  isInteresting: boolean;
  showInterestButton: boolean;
  onExpressInterest: (postingId: string) => void;
  activeTab: "discover" | "my-postings";
}

export function PostingDiscoverCard({
  posting,
  isOwner,
  isAlreadyInterested,
  isInteresting,
  showInterestButton,
  onExpressInterest,
  activeTab,
}: PostingDiscoverCardProps) {
  const creatorName = posting.profiles?.full_name || "Unknown";
  const locationLabel = getLocationLabel(
    posting.location_mode,
    posting.location_name,
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-xl">
                <Link
                  href={`/postings/${posting.id}`}
                  className="hover:underline cursor-pointer"
                >
                  {posting.title}
                </Link>
              </CardTitle>
              {posting.category && (
                <Badge className={categoryStyles[posting.category] || ""}>
                  {posting.category}
                </Badge>
              )}
              {posting.context_identifier && (
                <Badge variant="secondary" className="text-xs">
                  {posting.context_identifier}
                </Badge>
              )}
              {posting.status !== "open" && (
                <Badge
                  variant={
                    posting.status === "filled" ? "default" : "secondary"
                  }
                >
                  {posting.status}
                </Badge>
              )}
              {!isOwner && posting.compatibility_score !== undefined && (
                <Badge
                  variant="default"
                  className="bg-green-500 hover:bg-green-600 flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  {formatScore(posting.compatibility_score)} match
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {showInterestButton && (
              <Button
                variant="outline"
                onClick={() => onExpressInterest(posting.id)}
                disabled={isInteresting}
              >
                {isInteresting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Heart className="h-4 w-4" />
                )}
                {isInteresting ? "Expressing Interest..." : "I'm Interested"}
              </Button>
            )}
            {!isOwner && activeTab === "discover" && isAlreadyInterested && (
              <Button variant="secondary" disabled>
                <Heart className="h-4 w-4 fill-current" />
                Interested
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href={`/postings/${posting.id}`}>
                {isOwner ? "Edit" : "View Details"}
              </Link>
            </Button>
            {!isOwner &&
              posting.status === "open" &&
              !isAlreadyInterested &&
              posting.mode !== "open" && <Button>Apply</Button>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription className="text-sm line-clamp-2">
          {posting.description}
        </CardDescription>

        {/* Compatibility Breakdown */}
        {!isOwner && posting.score_breakdown && (
          <div className="rounded-lg border border-green-500/20 bg-green-50/50 dark:bg-green-950/20 p-3">
            <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Your Compatibility Breakdown
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Semantic</span>
                <span className="font-medium text-foreground">
                  {formatScore(posting.score_breakdown.semantic)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Availability</span>
                <span className="font-medium text-foreground">
                  {formatScore(posting.score_breakdown.availability)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Skill Level</span>
                <span className="font-medium text-foreground">
                  {formatScore(posting.score_breakdown.skill_level)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium text-foreground">
                  {formatScore(posting.score_breakdown.location)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Skills */}
        {posting.skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {posting.skills.slice(0, 5).map((skill: string) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
            {posting.skills.length > 5 && (
              <Badge variant="outline">+{posting.skills.length - 5}</Badge>
            )}
          </div>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            Looking for {posting.team_size_max}{" "}
            {posting.team_size_max === 1 ? "person" : "people"}
          </span>
          {posting.estimated_time && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {posting.estimated_time}
            </span>
          )}
          {locationLabel && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {locationLabel}
            </span>
          )}
        </div>

        {/* Creator */}
        <div className="flex items-center gap-2 border-t border-border pt-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {getInitials(creatorName)}
          </div>
          <span className="text-sm text-muted-foreground">
            {isOwner ? "Created by you" : `Posted by ${creatorName}`} •{" "}
            {formatDate(posting.created_at)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
