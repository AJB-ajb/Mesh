import { Check, X, MessageSquare } from "lucide-react";

import { labels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface MatchCardProps {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  matchScore: number;
  description: string;
  skills: string[];
  availability: string;
  status?: "pending" | "accepted" | "declined";
  className?: string;
  onAccept?: () => void;
  onDecline?: () => void;
  onMessage?: () => void;
}

export function MatchCard({
  name,
  initials,
  avatarUrl,
  matchScore,
  description,
  skills,
  availability,
  status = "pending",
  className,
  onAccept,
  onDecline,
  onMessage,
}: MatchCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{name}</CardTitle>
                <Badge variant="success">
                  {matchScore}
                  {labels.matchCard.matchSuffix}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {description}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 w-full sm:w-auto">
            {status === "pending" && onAccept && (
              <>
                <Button size="sm" onClick={onAccept}>
                  <Check className="h-4 w-4" />
                  {labels.matchCard.accept}
                </Button>
                {onDecline && (
                  <Button size="sm" variant="outline" onClick={onDecline}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
            {status === "accepted" && onMessage && (
              <Button size="sm" onClick={onMessage}>
                <MessageSquare className="h-4 w-4" />
                {labels.matchCard.message}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Skills */}
        <div className="flex flex-wrap gap-2">
          {skills.slice(0, 4).map((skill) => (
            <Badge key={skill} variant="secondary">
              {skill}
            </Badge>
          ))}
          {skills.length > 4 && (
            <Badge variant="outline">+{skills.length - 4}</Badge>
          )}
        </div>

        {/* Availability */}
        <p className="text-xs text-muted-foreground">
          {labels.matchCard.availablePrefix}
          {availability}
        </p>
      </CardContent>
    </Card>
  );
}
