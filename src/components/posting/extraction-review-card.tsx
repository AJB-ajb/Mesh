"use client";

import { Sparkles, Undo2, X, RefreshCw, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { labels } from "@/lib/labels";
import type { UseExtractionReviewReturn } from "@/lib/hooks/use-extraction-review";

type ExtractionReviewCardProps = Pick<
  UseExtractionReviewReturn,
  "status" | "appliedFields" | "undo" | "dismiss" | "retry"
>;

export function ExtractionReviewCard({
  status,
  appliedFields,
  undo,
  dismiss,
  retry,
}: ExtractionReviewCardProps) {
  if (status === "idle") return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="py-3">
        {/* Loading state */}
        {status === "extracting" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {labels.extractionReview.extracting}
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-destructive">
              {labels.extractionReview.error}
            </p>
            <Button variant="outline" size="sm" onClick={retry}>
              <RefreshCw className="mr-1.5 size-3.5" />
              {labels.extractionReview.retry}
            </Button>
          </div>
        )}

        {/* Applied summary */}
        {status === "applied" && appliedFields && (
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {labels.extractionReview.applied}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {appliedFields.category && (
                  <Badge variant="secondary" className="capitalize">
                    {appliedFields.category}
                  </Badge>
                )}
                {appliedFields.skills?.map((skill) => (
                  <Badge key={skill} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {(appliedFields.team_size_min ||
                  appliedFields.team_size_max) && (
                  <Badge variant="outline" className="text-xs">
                    {labels.extractionReview.fieldLabels.teamSize}:{" "}
                    {appliedFields.team_size_min ?? "?"} &ndash;{" "}
                    {appliedFields.team_size_max ?? "?"}
                  </Badge>
                )}
                {appliedFields.estimated_time && (
                  <Badge variant="outline" className="text-xs">
                    {appliedFields.estimated_time}
                  </Badge>
                )}
                {appliedFields.tags?.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={undo}
                className="h-8 gap-1.5 px-2 text-xs"
              >
                <Undo2 className="size-3.5" />
                {labels.extractionReview.undo}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={dismiss}
                className="size-8"
                aria-label={labels.extractionReview.appliedDismiss}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
