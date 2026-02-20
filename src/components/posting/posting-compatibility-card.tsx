"use client";

import { Sparkles, Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MatchBreakdown } from "@/components/match/match-breakdown";
import { computeWeightedScore, formatScore } from "@/lib/matching/scoring";
import type { ScoreBreakdown } from "@/lib/supabase/types";

type PostingCompatibilityCardProps = {
  matchBreakdown: ScoreBreakdown | null;
  isComputingMatch: boolean;
};

export function PostingCompatibilityCard({
  matchBreakdown,
  isComputingMatch,
}: PostingCompatibilityCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          <CardTitle>Your Compatibility</CardTitle>
        </div>
        <CardDescription>How well you match this posting</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isComputingMatch ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Computing compatibility...
          </div>
        ) : matchBreakdown ? (
          <>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground mb-1">
                Overall Match
              </p>
              <p className="text-2xl font-bold text-green-600">
                {formatScore(computeWeightedScore(matchBreakdown))}
              </p>
            </div>
            <MatchBreakdown breakdown={matchBreakdown} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Complete your profile to see compatibility
          </p>
        )}
      </CardContent>
    </Card>
  );
}
