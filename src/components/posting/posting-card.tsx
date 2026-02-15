import Link from "next/link";
import { Users, Calendar, MapPin, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { getUrgencyBadge } from "@/lib/posting/urgency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

function getLocationDisplay(
  locationMode?: string | null,
  locationName?: string | null,
) {
  switch (locationMode) {
    case "remote":
      return "Remote";
    case "in_person":
      return locationName || "In-person";
    case "either":
      return locationName || "Flexible";
    default:
      return null;
  }
}

function getLocationIcon(locationMode?: string | null) {
  switch (locationMode) {
    case "remote":
      return "🏠";
    case "in_person":
      return "📍";
    case "either":
      return "🌐";
    default:
      return null;
  }
}

export interface PostingCardProps {
  id: string;
  title: string;
  description: string;
  skills: string[];
  teamSize: string;
  estimatedTime: string;
  category: string;
  matchScore?: number;
  expiresAt?: string | null;
  locationMode?: string | null;
  locationName?: string | null;
  creator: {
    name: string;
    initials: string;
    avatarUrl?: string;
  };
  createdAt: string;
  tags?: string[];
  mode?: string;
  contextIdentifier?: string;
  className?: string;
  onApply?: () => void;
}

export function PostingCard({
  id,
  title,
  description,
  skills,
  teamSize,
  estimatedTime,
  category,
  matchScore,
  expiresAt,
  tags,
  mode,
  contextIdentifier,
  locationMode,
  locationName,
  creator,
  createdAt,
  className,
  onApply,
}: PostingCardProps) {
  const urgency = getUrgencyBadge(expiresAt);
  const locationDisplay = getLocationDisplay(locationMode, locationName);
  const locationIcon = getLocationIcon(locationMode);
  const categoryStyle = categoryStyles[category] || "";

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all hover:shadow-lg",
        className,
      )}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-xl">{title}</CardTitle>
              {category && <Badge className={categoryStyle}>{category}</Badge>}
              {contextIdentifier && (
                <Badge variant="secondary" className="text-xs">
                  {contextIdentifier}
                </Badge>
              )}
              {mode === "friend_ask" && (
                <Badge
                  variant="outline"
                  className="border-amber-500/30 text-amber-600 dark:text-amber-400"
                >
                  Sequential Invite
                </Badge>
              )}
              {matchScore !== undefined && (
                <Badge variant="success">{matchScore}% match</Badge>
              )}
              {urgency.variant && (
                <Badge variant={urgency.variant}>{urgency.label}</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/postings/${id}`}>
                View Details
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            {onApply && <Button onClick={onApply}>Request to join</Button>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription className="text-sm line-clamp-2">
          {description}
        </CardDescription>

        {/* Skills */}
        <div className="flex flex-wrap gap-2">
          {skills.slice(0, 5).map((skill) => (
            <Badge key={skill} variant="secondary">
              {skill}
            </Badge>
          ))}
          {skills.length > 5 && (
            <Badge variant="outline">+{skills.length - 5}</Badge>
          )}
        </div>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
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

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {teamSize}
          </span>
          {estimatedTime && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {estimatedTime}
            </span>
          )}
          {locationDisplay && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {locationIcon} {locationDisplay}
            </span>
          )}
        </div>

        {/* Creator */}
        <div className="flex items-center gap-2 border-t border-border pt-4">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {creator.initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            Posted by {creator.name} • {createdAt}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
