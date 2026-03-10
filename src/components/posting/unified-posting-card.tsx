"use client";

import { useState } from "react";
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
  ChevronDown,
  MessageSquare,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BadgeList } from "@/components/ui/badge-list";
import { Card, CardContent } from "@/components/ui/card";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { formatScore } from "@/lib/matching/scoring";
import {
  getInitials,
  formatDateAgo,
  stripTitleMarkdown,
  extractTitleFromDescription,
} from "@/lib/format";
import { RelativeTime } from "@/components/ui/relative-time";
import { labels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { categoryStyles } from "@/lib/posting/styles";
import { getLocationLabel } from "@/lib/posting/location";

// ---------------------------------------------------------------------------
// Status color helper
// ---------------------------------------------------------------------------

function getStatusColor(status: string) {
  switch (status) {
    case "open":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "filled":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "closed":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface UnifiedPostingCardProps {
  variant: "full" | "compact";
  // Core posting data
  id: string;
  title: string;
  description: string;
  status: string;
  category: string | null;
  createdAt: string;
  creatorId: string;
  creator?: {
    name: string;
    userId?: string;
  };
  // Full variant props (discover page)
  skills?: string[];
  tags?: string[];
  teamSizeMin?: number;
  teamSizeMax?: number;
  estimatedTime?: string | null;
  locationMode?: string | null;
  locationName?: string | null;
  visibility?: string;
  mode?: string;
  contextIdentifier?: string | null;
  compatibilityScore?: number;
  scoreBreakdown?: {
    semantic?: number | null;
    availability?: number | null;
    skill_level?: number | null;
    location?: number | null;
  };
  isOwner?: boolean;
  isAlreadyInterested?: boolean;
  isInteresting?: boolean;
  showInterestButton?: boolean;
  onExpressInterest?: (postingId: string) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (postingId: string) => void;
  activeTab?: "discover" | "my-postings";
  // Compact variant props (posts page)
  role?: "owner" | "joined" | "applied" | "invited";
  unreadCount?: number;
  href?: string;
  // Nested posting props
  parentTitle?: string;
  childCount?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UnifiedPostingCard({
  variant,
  id,
  title,
  description,
  status,
  category,
  createdAt,
  // creatorId accepted for API consistency but not used internally
  creatorId: _,
  creator,
  skills = [],
  tags = [],
  teamSizeMin,
  teamSizeMax,
  estimatedTime,
  locationMode,
  locationName,
  visibility,
  mode,
  contextIdentifier,
  compatibilityScore,
  scoreBreakdown,
  isOwner = false,
  isAlreadyInterested = false,
  isInteresting = false,
  showInterestButton = false,
  onExpressInterest,
  isBookmarked,
  onToggleBookmark,
  activeTab = "discover",
  role,
  unreadCount,
  href,
  parentTitle,
  childCount,
}: UnifiedPostingCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const isFull = variant === "full";
  const displayTitle = title || extractTitleFromDescription(description);
  const strippedTitle = stripTitleMarkdown(displayTitle);
  const creatorName = creator?.name ?? null;
  const locationLabel = getLocationLabel(
    locationMode ?? null,
    locationName ?? null,
  );

  // Strip first line from description when it matches the title (avoid duplication)
  const displayDescription = (() => {
    if (!description) return description;
    const firstLine = description.split(/\n/)[0]?.trim() ?? "";
    if (!firstLine) return description;
    const extracted = extractTitleFromDescription(description);
    // Strip if the title prop matches the extracted first line, or if no title prop was given
    if (
      stripTitleMarkdown(extracted) === strippedTitle ||
      (!title && displayTitle === extracted)
    ) {
      const rest = description.slice(description.indexOf("\n") + 1).trim();
      return rest || description;
    }
    return description;
  })();

  // Posting link
  const postingHref = isFull
    ? activeTab === "discover"
      ? `/postings/${id}?from=discover`
      : `/postings/${id}`
    : (href ?? `/postings/${id}`);

  // ---------------------------------------------------------------------------
  // Compact variant — wrapped in Link
  // ---------------------------------------------------------------------------
  if (!isFull) {
    const roleLabel =
      role === "owner"
        ? labels.active.youCreated
        : role === "applied"
          ? labels.active.youApplied
          : labels.active.youJoined;

    return (
      <Link href={postingHref} className="block min-w-0">
        <Card className="overflow-hidden transition-colors hover:bg-muted/50">
          <CardContent className="p-4 sm:p-6">
            {/* Creator top line */}
            <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <div className="flex size-6 items-center justify-center rounded-full bg-muted text-[0.625rem] font-medium">
                {getInitials(creatorName ?? strippedTitle)}
              </div>
              <RelativeTime date={createdAt} formatter={formatDateAgo} />
              {parentTitle && (
                <span className="text-xs text-muted-foreground">
                  {labels.coordination.inParent(parentTitle)}
                </span>
              )}
            </div>

            {/* Title */}
            <h3
              className="text-base sm:text-lg font-semibold line-clamp-2"
              title={strippedTitle}
            >
              {strippedTitle}
            </h3>

            {/* Description — clamped to 2 lines */}
            <MarkdownRenderer
              content={displayDescription}
              clamp={2}
              className="mt-1 text-muted-foreground"
            />

            {/* Meta line */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge
                variant="secondary"
                className={cn("text-xs", getStatusColor(status))}
              >
                {status}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {roleLabel}
              </Badge>
              {teamSizeMin != null && teamSizeMax != null && (
                <span className="flex items-center gap-1">
                  <Users className="size-4" />
                  {teamSizeMin}&ndash;{teamSizeMax}
                </span>
              )}
              {category && (
                <Badge variant="outline" className="text-xs capitalize">
                  {category}
                </Badge>
              )}
              {role === "joined" && unreadCount != null && unreadCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-primary font-medium">
                  <MessageSquare className="size-3.5" />
                  {labels.active.unreadMessages(unreadCount)}
                </span>
              )}
              {childCount != null && childCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  {labels.coordination.activities(childCount)}
                </Badge>
              )}
            </div>

            {/* Expandable "More details" */}
            {(skills.length > 0 ||
              tags.length > 0 ||
              (compatibilityScore !== undefined && scoreBreakdown)) && (
              <div className="mt-3">
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowDetails(!showDetails);
                  }}
                >
                  <ChevronDown
                    className={cn(
                      "size-3 transition-transform",
                      showDetails && "rotate-180",
                    )}
                  />
                  {showDetails
                    ? labels.postingCard.lessDetails
                    : labels.postingCard.moreDetails}
                </button>
                {showDetails && (
                  <div
                    className="mt-2 space-y-2"
                    onClick={(e) => e.preventDefault()}
                  >
                    {skills.length > 0 && <BadgeList items={skills} />}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tags.slice(0, 4).map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            #{tag}
                          </Badge>
                        ))}
                        {tags.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{tags.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}
                    {locationLabel && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="size-4" />
                        {locationLabel}
                      </span>
                    )}
                    {estimatedTime && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="size-4" />
                        {estimatedTime}
                      </span>
                    )}
                    {compatibilityScore !== undefined && scoreBreakdown && (
                      <div className="rounded-lg border border-green-500/20 bg-green-50/50 dark:bg-green-950/20 p-2">
                        <p className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
                          <Sparkles className="size-3" />
                          {formatScore(compatibilityScore)} match
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-1">
                          {(
                            [
                              ["Relevance", scoreBreakdown.semantic],
                              ["Availability", scoreBreakdown.availability],
                              ["Skill Level", scoreBreakdown.skill_level],
                              ["Location", scoreBreakdown.location],
                            ] as const
                          ).map(([label, score]) => (
                            <div key={label} className="flex flex-col">
                              <span className="text-muted-foreground">
                                {label}
                              </span>
                              <span className="font-medium text-foreground">
                                {score != null ? formatScore(score) : "N/A"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    );
  }

  // ---------------------------------------------------------------------------
  // Full variant (discover page)
  // ---------------------------------------------------------------------------

  return (
    <Card className="min-w-0 overflow-hidden group">
      <CardContent className="p-3 sm:p-4 md:p-6 space-y-2 sm:space-y-3 md:space-y-4">
        {/* Creator top line */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <div className="hidden md:flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {getInitials(creatorName)}
          </div>
          <span>
            {isOwner ? (
              labels.postingCard.postedByYou
            ) : (
              <>
                {labels.postingCard.postedBy}{" "}
                {creator?.userId ? (
                  <Link
                    href={`/profile/${creator.userId}`}
                    className="hover:underline text-foreground"
                  >
                    {creatorName ?? "Unknown"}
                  </Link>
                ) : (
                  (creatorName ?? "Unknown")
                )}
              </>
            )}{" "}
            &middot; <RelativeTime date={createdAt} formatter={formatDateAgo} />
          </span>
        </div>

        {/* Title + badges + actions */}
        <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-1 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
              <h3 className="text-base sm:text-lg font-semibold break-words">
                <Link
                  href={postingHref}
                  className="hover:underline cursor-pointer"
                >
                  {strippedTitle}
                </Link>
              </h3>
              {category && (
                <Badge
                  className={cn("text-xs", categoryStyles[category] ?? "")}
                >
                  {category}
                </Badge>
              )}
              {contextIdentifier && (
                <Badge variant="secondary" className="text-xs">
                  {contextIdentifier}
                </Badge>
              )}
              {(visibility === "private" || mode === "friend_ask") && (
                <Badge
                  variant="outline"
                  className="text-xs border-amber-500/30 text-amber-600 dark:text-amber-400"
                >
                  Private
                </Badge>
              )}
              <Badge
                variant="secondary"
                className={cn("text-xs", getStatusColor(status))}
              >
                {status}
              </Badge>
              {!isOwner && compatibilityScore !== undefined && (
                <Badge
                  variant="default"
                  className="bg-green-500 hover:bg-green-600 flex items-center gap-1 text-xs"
                >
                  <Sparkles className="size-3" />
                  {formatScore(compatibilityScore)} match
                </Badge>
              )}
            </div>
          </div>

          {/* Action buttons — inline/compact on mobile */}
          <div className="flex flex-wrap items-center gap-2 sm:w-auto">
            {!isOwner && onToggleBookmark && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 sm:size-9"
                onClick={() => onToggleBookmark(id)}
                aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="size-4 text-primary" />
                ) : (
                  <Bookmark className="size-4" />
                )}
              </Button>
            )}
            {showInterestButton && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 sm:h-9 text-xs sm:text-sm"
                onClick={() => onExpressInterest?.(id)}
                disabled={isInteresting}
              >
                {isInteresting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                {isInteresting ? "Requesting..." : "Request to join"}
              </Button>
            )}
            {!isOwner && activeTab === "discover" && isAlreadyInterested && (
              <Button
                variant="secondary"
                size="sm"
                className="h-8 sm:h-9 text-xs sm:text-sm"
                disabled
              >
                <Check className="size-3.5" />
                {labels.joinRequest.action.requested}
              </Button>
            )}
            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 sm:h-9 text-xs sm:text-sm"
                asChild
              >
                <Link href={postingHref}>Edit</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Description — clamped responsively */}
        <MarkdownRenderer
          content={displayDescription}
          className="text-sm sm:text-base text-muted-foreground line-clamp-2 sm:line-clamp-2 md:line-clamp-4"
        />

        {/* Compatibility Breakdown (collapsible) — hidden on mobile, shown on sm+ */}
        {!isOwner && scoreBreakdown && (
          <div className="hidden sm:block rounded-lg border border-green-500/20 bg-green-50/50 dark:bg-green-950/20 p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
                <Sparkles className="size-3" />
                {formatScore(compatibilityScore!)} match
              </p>
              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown
                  className={cn(
                    "size-3 transition-transform",
                    showBreakdown && "rotate-180",
                  )}
                />
                {showBreakdown
                  ? labels.discover.hideBreakdown
                  : labels.discover.showBreakdown}
              </button>
            </div>
            {showBreakdown && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-2">
                {(
                  [
                    ["Relevance", scoreBreakdown.semantic],
                    ["Availability", scoreBreakdown.availability],
                    ["Skill Level", scoreBreakdown.skill_level],
                    ["Location", scoreBreakdown.location],
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
            )}
          </div>
        )}

        {/* Meta line — compact on mobile */}
        <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground">
          {teamSizeMax != null && (
            <span className="flex items-center gap-1 sm:gap-1.5">
              <Users className="size-3.5 sm:size-4" />
              <span className="md:hidden">
                {labels.postingCard.lookingForShort(teamSizeMax)}
              </span>
              <span className="hidden md:inline">
                {labels.postingCard.lookingFor(teamSizeMax)}
              </span>
            </span>
          )}
          {estimatedTime && (
            <span className="flex items-center gap-1 sm:gap-1.5">
              <Calendar className="size-3.5 sm:size-4" />
              {estimatedTime}
            </span>
          )}
          {locationLabel && (
            <span className="flex items-center gap-1 sm:gap-1.5">
              <MapPin className="size-3.5 sm:size-4" />
              {locationLabel}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
