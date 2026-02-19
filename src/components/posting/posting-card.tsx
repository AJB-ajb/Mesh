import Link from "next/link";
import { Users, Calendar, MapPin, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { getUrgencyBadge } from "@/lib/posting/urgency";
import { categoryStyles } from "@/lib/posting/styles";
import { getLocationDisplay, getLocationIcon } from "@/lib/posting/location";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BadgeList } from "@/components/ui/badge-list";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
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
          <div className="flex gap-2 w-full sm:w-auto">
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
        <BadgeList items={skills} />

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
