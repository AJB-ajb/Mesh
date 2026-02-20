import Link from "next/link";
import {
  Users,
  Calendar,
  MapPin,
  Loader2,
  Sparkles,
  Send,
  Check,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BadgeList } from "@/components/ui/badge-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatScore } from "@/lib/matching/scoring";
import { getInitials, formatDateAgo } from "@/lib/format";
import { labels } from "@/lib/labels";
import { categoryStyles } from "@/lib/posting/styles";
import { getLocationLabel } from "@/lib/posting/location";
import type { PostingWithScore } from "@/lib/hooks/use-postings";

export interface PostingDiscoverCardProps {
  posting: PostingWithScore;
  isOwner: boolean;
  isAlreadyInterested: boolean;
  isInteresting: boolean;
  showInterestButton: boolean;
  onExpressInterest: (postingId: string) => void;
  activeTab: "discover" | "my-postings";
  isBookmarked?: boolean;
  onToggleBookmark?: (postingId: string) => void;
}

export function PostingDiscoverCard({
  posting,
  isOwner,
  isAlreadyInterested,
  isInteresting,
  showInterestButton,
  onExpressInterest,
  activeTab,
  isBookmarked,
  onToggleBookmark,
}: PostingDiscoverCardProps) {
  const creatorName = posting.profiles?.full_name || "Unknown";
  const locationLabel = getLocationLabel(
    posting.location_mode,
    posting.location_name,
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-xl">
                <Link
                  href={
                    activeTab === "discover"
                      ? `/postings/${posting.id}?from=discover`
                      : `/postings/${posting.id}`
                  }
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
              {(posting.visibility === "private" ||
                posting.mode === "friend_ask") && (
                <Badge
                  variant="outline"
                  className="border-amber-500/30 text-amber-600 dark:text-amber-400"
                >
                  Private
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
          <div className="flex gap-2 w-full sm:w-auto">
            {!isOwner && onToggleBookmark && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggleBookmark(posting.id)}
                aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="h-4 w-4 text-primary" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </Button>
            )}
            {showInterestButton && (
              <Button
                variant="outline"
                onClick={() => onExpressInterest(posting.id)}
                disabled={isInteresting}
              >
                {isInteresting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isInteresting ? "Requesting..." : "Request to join"}
              </Button>
            )}
            {!isOwner && activeTab === "discover" && isAlreadyInterested && (
              <Button variant="secondary" disabled>
                <Check className="h-4 w-4" />
                {labels.joinRequest.action.requested}
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link
                href={
                  activeTab === "discover"
                    ? `/postings/${posting.id}?from=discover`
                    : `/postings/${posting.id}`
                }
              >
                {isOwner ? "Edit" : "View Details"}
              </Link>
            </Button>
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
              {(
                [
                  ["Relevance", posting.score_breakdown.semantic],
                  ["Availability", posting.score_breakdown.availability],
                  ["Skill Level", posting.score_breakdown.skill_level],
                  ["Location", posting.score_breakdown.location],
                ] as const
              ).map(([label, score]) => (
                <div key={label} className="flex flex-col">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">
                    {score != null ? formatScore(score) : "N/A"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {posting.skills.length > 0 && <BadgeList items={posting.skills} />}

        {/* Tags */}
        {posting.tags && posting.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {posting.tags.slice(0, 4).map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
            {posting.tags.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{posting.tags.length - 4}
              </Badge>
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
            {isOwner ? (
              "Posted by you"
            ) : (
              <>
                Posted by{" "}
                <Link
                  href={`/profile/${posting.profiles?.user_id}`}
                  className="hover:underline text-foreground"
                >
                  {creatorName}
                </Link>
              </>
            )}{" "}
            • {formatDateAgo(posting.created_at)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
