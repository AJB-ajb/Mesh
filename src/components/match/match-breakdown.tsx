"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScoreBreakdown } from "@/lib/supabase/types";
import { formatScore, getScoreColorVariant } from "@/lib/matching/scoring";
import { MATCH_DIMENSIONS } from "@/lib/matching/dimensions";
import { labels } from "@/lib/labels";

export interface MatchBreakdownProps {
  breakdown: ScoreBreakdown;
  className?: string;
}

/**
 * Visual breakdown of match scores by dimension
 * Shows progress bars and explanations for each matching attribute
 */
export function MatchBreakdown({ breakdown, className }: MatchBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const dimensions = useMemo(
    () =>
      MATCH_DIMENSIONS.map((d) => ({
        ...d,
        score: breakdown[d.key],
      })),
    [breakdown],
  );

  return (
    <div
      className={cn("rounded-lg border border-border bg-muted/30", className)}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
      >
        <span className="text-sm font-medium text-foreground">
          {labels.matchBreakdown.title}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-4 border-t border-border p-4">
          {dimensions.map((dimension) => {
            const score = dimension.score;
            const isNull = score == null;
            const displayScore = score ?? 0;
            const colorVariant = isNull
              ? ("destructive" as const)
              : getScoreColorVariant(displayScore);
            const colorClasses = {
              success: "bg-success",
              warning: "bg-warning",
              destructive: "bg-destructive",
            };

            return (
              <div key={dimension.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {dimension.label}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      isNull && "text-muted-foreground",
                      !isNull && colorVariant === "success" && "text-success",
                      !isNull && colorVariant === "warning" && "text-warning",
                      !isNull &&
                        colorVariant === "destructive" &&
                        "text-destructive",
                    )}
                  >
                    {isNull ? "N/A" : formatScore(displayScore)}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  {!isNull && (
                    <div
                      className={cn(
                        "h-full transition-all duration-300",
                        colorClasses[colorVariant],
                      )}
                      style={{ width: `${displayScore * 100}%` }}
                    />
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground">
                  {isNull
                    ? "Not enough data to compute this dimension"
                    : dimension.description}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
