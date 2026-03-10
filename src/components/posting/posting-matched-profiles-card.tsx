"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  MessageSquare,
  Users,
  ChevronRight,
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
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { formatScore } from "@/lib/matching/scoring";
import { MATCH_DIMENSIONS } from "@/lib/matching/dimensions";
import { getInitials } from "@/lib/format";
import { labels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { usePostingDetailContext } from "./posting-detail-context";

export function PostingMatchedProfilesCard() {
  const {
    matchedProfiles,
    isLoading: isLoadingMatches,
    onStartConversation: onMessage,
  } = usePostingDetailContext();
  const router = useRouter();
  const onViewProfile = (userId: string) => router.push(`/profile/${userId}`);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (userId: string) => {
    setExpandedId((prev) => (prev === userId ? null : userId));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-blue-500" />
          <CardTitle>Matched Collaborators</CardTitle>
        </div>
        <CardDescription>
          Top profiles that match your posting requirements
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingMatches ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : matchedProfiles.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="No matches yet"
            description="Complete profiles will appear here as they match your posting."
            className="py-8"
          />
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {matchedProfiles.map((matchedProfile) => {
              const isExpanded = expandedId === matchedProfile.user_id;

              return (
                <div key={matchedProfile.user_id}>
                  {/* Compact row */}
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/30"
                    onClick={() => toggleExpand(matchedProfile.user_id)}
                    aria-expanded={isExpanded}
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {getInitials(matchedProfile.full_name)}
                    </div>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {matchedProfile.full_name || "Anonymous"}
                    </span>
                    <Badge variant="default" className="shrink-0 text-xs">
                      {formatScore(matchedProfile.overall_score)}
                    </Badge>
                    <ChevronRight
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform",
                        isExpanded && "rotate-90",
                      )}
                    />
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/10 px-3 pb-3 pt-2 space-y-3">
                      {matchedProfile.headline && (
                        <p className="text-sm text-muted-foreground">
                          {matchedProfile.headline}
                        </p>
                      )}

                      {/* Match Breakdown */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {MATCH_DIMENSIONS.map((dim) => (
                          <div
                            key={dim.key}
                            className="flex items-center justify-between"
                          >
                            <span className="text-muted-foreground">
                              {dim.label}:
                            </span>
                            <span className="font-medium">
                              {matchedProfile.breakdown[dim.key] != null
                                ? formatScore(
                                    matchedProfile.breakdown[dim.key]!,
                                  )
                                : "N/A"}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            onViewProfile(matchedProfile.user_id)
                          }
                        >
                          {labels.matchedProfiles.viewProfile}
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => onMessage(matchedProfile.user_id)}
                        >
                          <MessageSquare className="size-4" />
                          {labels.matchedProfiles.message}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
