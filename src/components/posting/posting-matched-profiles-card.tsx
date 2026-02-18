"use client";

import { Sparkles, Loader2, MessageSquare } from "lucide-react";

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
import type { MatchedProfile } from "@/lib/hooks/use-posting-detail";

type PostingMatchedProfilesCardProps = {
  matchedProfiles: MatchedProfile[];
  isLoadingMatches: boolean;
  onViewProfile: (userId: string) => void;
  onMessage: (userId: string) => void;
};

export function PostingMatchedProfilesCard({
  matchedProfiles,
  isLoadingMatches,
  onViewProfile,
  onMessage,
}: PostingMatchedProfilesCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          <CardTitle>Matched Collaborators</CardTitle>
        </div>
        <CardDescription>
          Top profiles that match your posting requirements
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingMatches ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : matchedProfiles.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              No matched profiles found yet. Complete profiles will appear here
              as they match your posting.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {matchedProfiles.map((matchedProfile) => (
              <div
                key={matchedProfile.user_id}
                className="rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm font-medium shrink-0">
                      {getInitials(matchedProfile.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">
                          {matchedProfile.full_name || "Anonymous"}
                        </h4>
                        <Badge variant="default" className="text-xs shrink-0">
                          {formatScore(matchedProfile.overall_score)}
                        </Badge>
                      </div>
                      {matchedProfile.headline && (
                        <p className="text-sm text-muted-foreground truncate">
                          {matchedProfile.headline}
                        </p>
                      )}
                      {/* Match Breakdown */}
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        {(
                          [
                            ["Semantic", matchedProfile.breakdown.semantic],
                            [
                              "Availability",
                              matchedProfile.breakdown.availability,
                            ],
                            [
                              "Skill Level",
                              matchedProfile.breakdown.skill_level,
                            ],
                            ["Location", matchedProfile.breakdown.location],
                          ] as const
                        ).map(([label, score]) => (
                          <div
                            key={label}
                            className="flex items-center justify-between"
                          >
                            <span className="text-muted-foreground">
                              {label}:
                            </span>
                            <span className="font-medium">
                              {score != null ? formatScore(score) : "N/A"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewProfile(matchedProfile.user_id)}
                  >
                    View Profile
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onMessage(matchedProfile.user_id)}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Message
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
